"""Universal Job Apply Bot — Connection Service
Manages multi-user isolated browser sessions, portal authentication state,
and session verification using the centralized Job Portal Registry.
"""

import logging
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from typing import Any, Optional

from core.supabase import get_supabase_client
from schemas.connection import PlatformConnectionItem, PortalRegistryItem
from services.portal_registry import (
    PORTAL_REGISTRY,
    get_all_portals,
    get_portal,
)

logger = logging.getLogger("connections")

# User-isolated browser session directory: browser_sessions/{user_id}/{portal_id}
SESSION_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "browser_sessions")
)

_MEMORY_CONNECTIONS: dict[str, dict[str, dict[str, Any]]] = {}

PORTAL_DOMAINS: dict[str, list[str]] = {
    "naukri": ["naukri.com"],
    "internshala": ["internshala.com"],
    "indeed": ["indeed.com"],
    "linkedin": ["linkedin.com"],
    "foundit": ["foundit.in", "monsterindia.com"],
    "wellfound": ["wellfound.com", "angel.co"],
    "glassdoor": ["glassdoor.com", "glassdoor.co.in"],
    "cutshort": ["cutshort.io"],
}


def is_valid_credential(val: Any) -> bool:
    """Return True if credential value is a real, non-empty, non-template string."""
    if not val:
        return False
    v = str(val).strip()
    if not v:
        return False
    lower_v = v.lower()
    placeholders = {
        "your_email@example.com",
        "your_naukri_password",
        "your_internshala_password",
        "your_indeed_password",
        "your_linkedin_password",
        "yourfirstname",
        "yourlastname",
        "example@example.com",
        "user@example.com",
        "test@example.com",
        "none",
        "null",
        "undefined",
    }
    return lower_v not in placeholders


def _get_user_session_dir(user_id: str, portal_id: str) -> str:
    """Return isolated directory for a candidate's portal browser profile."""
    safe_uid = "".join(c for c in user_id if c.isalnum() or c in "-_")
    clean_portal = "".join(c for c in portal_id.lower() if c.isalnum() or c in "-_")
    session_dir = os.path.join(SESSION_ROOT, safe_uid, clean_portal)
    os.makedirs(session_dir, exist_ok=True)
    return session_dir


def _read_env_credentials() -> dict[str, dict[str, str]]:
    """Read portal credentials configured in root .env file strictly per platform."""
    root_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
    creds: dict[str, dict[str, str]] = {}
    if os.path.exists(root_env):
        try:
            with open(root_env, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    k, v = line.split('=', 1)
                    k = k.strip().upper()
                    v = v.strip().strip("'\"")
                    if not is_valid_credential(v):
                        continue
                    if k.endswith("_EMAIL"):
                        plat_key = k[:-6].lower()
                        creds.setdefault(plat_key, {})["email"] = v
                    elif k.endswith("_PASSWORD"):
                        plat_key = k[:-9].lower()
                        creds.setdefault(plat_key, {})["password"] = v
        except Exception as e:
            logger.warning("Could not parse root .env for credentials: %s", e)

    # Check os.environ for specific variables strictly per platform
    env_mappings = {
        "naukri": ("NAUKRI_EMAIL", "NAUKRI_PASSWORD"),
        "internshala": ("INTERNSHALA_EMAIL", "INTERNSHALA_PASSWORD"),
        "indeed": ("INDEED_EMAIL", "INDEED_PASSWORD"),
        "linkedin": ("LINKEDIN_EMAIL", "LINKEDIN_PASSWORD"),
        "foundit": ("FOUNDIT_EMAIL", "FOUNDIT_PASSWORD"),
        "wellfound": ("WELLFOUND_EMAIL", "WELLFOUND_PASSWORD"),
        "glassdoor": ("GLASSDOOR_EMAIL", "GLASSDOOR_PASSWORD"),
        "cutshort": ("CUTSHORT_EMAIL", "CUTSHORT_PASSWORD"),
    }
    for p_id, (e_var, p_var) in env_mappings.items():
        e_val = os.getenv(e_var, "").strip()
        p_val = os.getenv(p_var, "").strip()
        if is_valid_credential(e_val):
            creds.setdefault(p_id, {})["email"] = e_val
        if is_valid_credential(p_val):
            creds.setdefault(p_id, {})["password"] = p_val

    return creds


def _has_portal_cookies(session_dir: str, portal_id: str) -> bool:
    """Check if Chromium user-data-dir contains established session cookies for this specific portal."""
    if not os.path.exists(session_dir):
        return False

    candidate_files = [
        os.path.join(session_dir, "Default", "Network", "Cookies"),
        os.path.join(session_dir, "Default", "Cookies"),
        os.path.join(session_dir, "Cookies"),
    ]
    domains = PORTAL_DOMAINS.get(portal_id.lower(), [f"{portal_id.lower()}.com"])

    import sqlite3
    for path in candidate_files:
        if not os.path.exists(path) or os.path.getsize(path) < 2048:
            continue
        try:
            uri = f"file:{path}?mode=ro"
            conn = sqlite3.connect(uri, uri=True, timeout=1.0)
            cur = conn.cursor()
            for d in domains:
                cur.execute("SELECT count(*) FROM cookies WHERE host_key LIKE ?", (f"%{d}%",))
                row = cur.fetchone()
                if row and row[0] > 0:
                    conn.close()
                    return True
            conn.close()
        except Exception:
            pass

    return False


def _launch_browser_window(session_dir: str, login_url: str) -> bool:
    """Launch isolated desktop browser for manual sign-in."""
    try:
        from services.platform_automation.runner import (
            find_brave_binary,
            find_chrome_binary,
            find_edge_binary,
            is_browser_launch_supported,
        )

        if not is_browser_launch_supported():
            return False

        bin_path = find_edge_binary() or find_chrome_binary() or find_brave_binary()
        if bin_path:
            cmd = [
                bin_path,
                f"--user-data-dir={session_dir}",
                "--no-first-run",
                "--no-default-browser-check",
                login_url,
            ]
            subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return True
    except Exception as exc:
        logger.warning("Could not launch browser for session %s: %s", session_dir, exc)

    return False


class ConnectionService:
    def __init__(self):
        self.supabase = get_supabase_client()

    def get_portal_registry(self) -> list[PortalRegistryItem]:
        """Return static registry of all supported job portals."""
        return self.get_portal_catalog()

    def get_portal_catalog(self) -> list[PortalRegistryItem]:
        """Return static registry of all supported job portals."""
        return [
            PortalRegistryItem(
                id=p.id,
                name=p.name,
                website_url=p.website_url,
                login_url=p.login_url,
                job_discovery_url=p.job_discovery_url,
                integration_type=p.integration_type,
                capabilities=p.capabilities.__dict__,
                restrictions=p.restrictions,
                status=p.status,
                notes=p.notes,
            )
            for p in get_all_portals()
        ]

    def get_user_connections(self, user_id: str) -> list[PlatformConnectionItem]:
        """Retrieve connection states for all registry portals for the candidate.
        Ensures a platform is ONLY displayed as 'connected' if the user has actually
        configured credentials (username & password) or established an authenticated session.
        """
        db_records: dict[str, dict[str, Any]] = {}
        env_creds = _read_env_credentials()

        is_uuid = False
        try:
            import uuid
            uuid.UUID(str(user_id))
            is_uuid = True
        except (ValueError, AttributeError, TypeError):
            is_uuid = False

        if self.supabase and is_uuid:
            try:
                res = (
                    self.supabase.table("platform_connections")
                    .select("*")
                    .eq("user_id", user_id)
                    .execute()
                )
                if res.data:
                    for row in res.data:
                        plat = row.get("platform", "").lower()
                        db_records[plat] = row
            except Exception as exc:
                logger.warning("Failed to query platform_connections from Supabase: %s", exc)

        user_mem = _MEMORY_CONNECTIONS.get(user_id, {})
        for k, v in user_mem.items():
            if k.lower() not in db_records:
                db_records[k.lower()] = v

        results = []
        for portal in get_all_portals():
            p_id = portal.id
            record = db_records.get(p_id) or db_records.get(portal.name.lower())
            session_dir = _get_user_session_dir(user_id, p_id)

            portal_cred = env_creds.get(p_id, {})
            env_email = portal_cred.get("email") if is_valid_credential(portal_cred.get("email")) else None
            env_pwd = portal_cred.get("password") if is_valid_credential(portal_cred.get("password")) else None

            # Check if user has active session cookies
            has_cookies = _has_portal_cookies(session_dir, p_id) if portal.status != "unsupported" else False

            # Check database record email
            record_email = record.get("account_email") if (record and is_valid_credential(record.get("account_email"))) else None

            # Effective credentials: .env takes priority for local runs
            effective_email = env_email or record_email
            has_explicit_creds = bool((env_email and env_pwd) or (record_email and record.get("metadata", {}).get("has_credentials")))

            if portal.status == "unsupported":
                status = "unsupported"
                effective_email = None
                last_ver = None
                err_msg = f"{portal.name} is currently unsupported."
            elif has_explicit_creds:
                status = "connected"
                last_ver = (record and record.get("last_verified")) or datetime.now(timezone.utc).isoformat()
                err_msg = None
            elif has_cookies and effective_email:
                status = "connected"
                last_ver = (record and record.get("last_verified")) or datetime.now(timezone.utc).isoformat()
                err_msg = None
            elif effective_email:
                status = "login_required"
                last_ver = None
                err_msg = f"Password required for {portal.name}. Click Connect to enter credentials."
            elif record and record.get("status") == "connecting":
                status = "connecting"
                last_ver = None
                err_msg = record.get("error_message")
            else:
                status = "not_connected"
                effective_email = None
                last_ver = None
                err_msg = None

            results.append(
                PlatformConnectionItem(
                    id=str(record.get("id")) if (record and record.get("id")) else None,
                    user_id=user_id,
                    platform=portal.name,
                    portal_id=portal.id,
                    display_name=portal.name,
                    website_url=portal.website_url,
                    login_url=portal.login_url,
                    job_discovery_url=portal.job_discovery_url,
                    integration_type=portal.integration_type,
                    capabilities=portal.capabilities.__dict__,
                    restrictions=portal.restrictions,
                    portal_status=portal.status,
                    status=status,
                    account_email=effective_email,
                    last_verified=last_ver,
                    error_message=err_msg,
                    metadata={"session_dir": session_dir, "has_credentials": has_explicit_creds},
                )
            )

        return results

    def open_platform_portal(self, user_id: str, platform: str) -> PlatformConnectionItem:
        """Step 1: Open official job portal in the user's isolated browser profile."""
        portal = get_portal(platform)
        if not portal:
            raise ValueError(f"Portal '{platform}' is not recognized in the registry.")

        session_dir = _get_user_session_dir(user_id, portal.id)
        opened = _launch_browser_window(session_dir, portal.login_url)

        item = PlatformConnectionItem(
            user_id=user_id,
            platform=portal.name,
            portal_id=portal.id,
            display_name=portal.name,
            website_url=portal.website_url,
            login_url=portal.login_url,
            job_discovery_url=portal.job_discovery_url,
            integration_type=portal.integration_type,
            capabilities=portal.capabilities.__dict__,
            restrictions=portal.restrictions,
            portal_status=portal.status,
            status="connecting",
            account_email=None,
            last_verified=None,
            error_message="Portal opened. Please complete your login on the official website.",
            metadata={"session_dir": session_dir, "browser_launched": opened},
        )
        self._upsert_connection(user_id, portal.id, item)
        return item

    def connect_platform(
        self,
        user_id: str,
        platform: str,
        account_email: Optional[str] = None,
        account_password: Optional[str] = None,
        permission_granted: bool = True,
        launch_browser: bool = True,
    ) -> PlatformConnectionItem:
        """Connect candidate portal with explicit user credentials or browser sign-in."""
        portal = get_portal(platform)
        if not portal:
            raise ValueError(f"Portal '{platform}' is not recognized in the registry.")

        if portal.status == "unsupported":
            item = PlatformConnectionItem(
                user_id=user_id,
                platform=portal.name,
                portal_id=portal.id,
                display_name=portal.name,
                website_url=portal.website_url,
                login_url=portal.login_url,
                job_discovery_url=portal.job_discovery_url,
                integration_type=portal.integration_type,
                capabilities=portal.capabilities.__dict__,
                restrictions=portal.restrictions,
                portal_status=portal.status,
                status="unsupported",
                error_message=f"{portal.name} connection is currently unsupported.",
                metadata=None,
            )
            self._upsert_connection(user_id, portal.id, item)
            return item

        session_dir = _get_user_session_dir(user_id, portal.id)
        has_cookies = _has_portal_cookies(session_dir, portal.id)
        opened = False
        if launch_browser:
            opened = _launch_browser_window(session_dir, portal.login_url)

        # Lookup in .env if account_email or account_password not provided
        env_creds = _read_env_credentials()
        if not is_valid_credential(account_email):
            account_email = env_creds.get(portal.id, {}).get("email")
        if not is_valid_credential(account_password):
            account_password = env_creds.get(portal.id, {}).get("password")

        now_iso = datetime.now(timezone.utc).isoformat()
        has_creds = bool(account_email and account_password and is_valid_credential(account_email) and is_valid_credential(account_password))

        if has_creds:
            new_status = "connected"
            err_msg = None
            # Update root .env
            env_key_email = f"{portal.id.upper()}_EMAIL"
            env_key_pwd = f"{portal.id.upper()}_PASSWORD"
            from services.config_service import update_root_env_file
            update_root_env_file({
                env_key_email: account_email,
                env_key_pwd: account_password,
            })
        elif has_cookies and account_email:
            new_status = "connected"
            err_msg = None
        elif opened:
            new_status = "connecting"
            err_msg = f"Browser login window opened for {portal.name}. Please sign in, then click Verify."
        elif account_email and not account_password:
            new_status = "login_required"
            err_msg = "Password required to authenticate."
            env_key_email = f"{portal.id.upper()}_EMAIL"
            from services.config_service import update_root_env_file
            update_root_env_file({env_key_email: account_email})
        else:
            new_status = "not_connected"
            err_msg = "Please provide username and password."

        meta: dict[str, Any] = {
            "session_dir": session_dir,
            "browser_launched": opened,
            "permission_granted": permission_granted,
            "has_credentials": has_creds,
            "connected_at": now_iso,
        }

        item = PlatformConnectionItem(
            user_id=user_id,
            platform=portal.name,
            portal_id=portal.id,
            display_name=portal.name,
            website_url=portal.website_url,
            login_url=portal.login_url,
            job_discovery_url=portal.job_discovery_url,
            integration_type=portal.integration_type,
            capabilities=portal.capabilities.__dict__,
            restrictions=portal.restrictions,
            portal_status=portal.status,
            status=new_status,
            account_email=account_email if new_status in ("connected", "login_required") else None,
            last_verified=now_iso if new_status == "connected" else None,
            error_message=err_msg,
            metadata=meta,
        )
        self._upsert_connection(user_id, portal.id, item)
        return item

    def connect_all_platforms(
        self,
        user_id: str,
        permission_granted: bool = True,
        account_email: Optional[str] = None,
    ) -> list[PlatformConnectionItem]:
        """Authorize and sync all platforms that have configured credentials."""
        return self.sync_from_env(user_id)

    def verify_platform_connection(
        self,
        user_id: str,
        platform: str,
        account_email: Optional[str] = None,
        confirmed: bool = True,
        live_driver_check: bool = False,
    ) -> PlatformConnectionItem:
        """Step 4 & 5: Verify whether an active, valid session exists in candidate profile."""
        portal = get_portal(platform)
        if not portal:
            raise ValueError(f"Portal '{platform}' is not recognized in the registry.")

        session_dir = _get_user_session_dir(user_id, portal.id)
        has_cookies = _has_portal_cookies(session_dir, portal.id)
        now_iso = datetime.now(timezone.utc).isoformat()

        if not is_valid_credential(account_email):
            env_creds = _read_env_credentials()
            account_email = env_creds.get(portal.id, {}).get("email")

        if live_driver_check:
            try:
                from services.platform_automation.runner import get_adapter_for_platform, launch_isolated_driver
                driver = launch_isolated_driver(user_id=user_id, platform=portal.id, headless=True)
                if driver:
                    try:
                        adapter = get_adapter_for_platform(portal.id)
                        is_valid, _ = adapter.check_session(driver)
                        if is_valid:
                            has_cookies = True
                        else:
                            has_cookies = False
                    finally:
                        try:
                            driver.quit()
                        except Exception:
                            pass
            except Exception as exc:
                logger.info("Live driver session check note for %s: %s", portal.name, exc)

        # Verified if cookies exist AND account_email exists
        if (has_cookies and account_email) or (confirmed and account_email):
            new_status = "connected"
            err_msg = None
            last_ver = now_iso
        elif account_email:
            new_status = "login_required"
            err_msg = "Active session could not be confirmed. Please sign in."
            last_ver = None
        else:
            new_status = "not_connected"
            err_msg = "Please provide username and password."
            last_ver = None

        item = PlatformConnectionItem(
            user_id=user_id,
            platform=portal.name,
            portal_id=portal.id,
            display_name=portal.name,
            website_url=portal.website_url,
            login_url=portal.login_url,
            job_discovery_url=portal.job_discovery_url,
            integration_type=portal.integration_type,
            capabilities=portal.capabilities.__dict__,
            restrictions=portal.restrictions,
            portal_status=portal.status,
            status=new_status,
            account_email=account_email if new_status in ("connected", "login_required") else None,
            last_verified=last_ver,
            error_message=err_msg,
            metadata={"session_dir": session_dir, "verified_at": last_ver},
        )
        self._upsert_connection(user_id, portal.id, item)
        return item

    def sync_from_env(self, user_id: str) -> list[PlatformConnectionItem]:
        """Automatically load credentials and portal emails from root .env and configure connections."""
        env_creds = _read_env_credentials()
        db_records: dict[str, dict[str, Any]] = {}
        if self.supabase:
            try:
                res = self.supabase.table("platform_connections").select("*").eq("user_id", user_id).execute()
                if res.data:
                    for row in res.data:
                        db_records[row.get("platform", "").lower()] = row
            except Exception:
                pass
        user_mem = _MEMORY_CONNECTIONS.get(user_id, {})
        for k, v in user_mem.items():
            if k.lower() not in db_records:
                db_records[k.lower()] = v

        results = []
        for portal in get_all_portals():
            p_id = portal.id
            cred = env_creds.get(p_id, {})
            email = cred.get("email") if is_valid_credential(cred.get("email")) else None
            pwd = cred.get("password") if is_valid_credential(cred.get("password")) else None
            session_dir = _get_user_session_dir(user_id, p_id)
            has_cookies = _has_portal_cookies(session_dir, p_id) if portal.status != "unsupported" else False
            prev_rec = db_records.get(p_id) or db_records.get(portal.name.lower())

            if not email and prev_rec and is_valid_credential(prev_rec.get("account_email")):
                email = prev_rec.get("account_email")

            if portal.status == "unsupported":
                status = "unsupported"
                email = None
                last_ver = None
                err_msg = f"{portal.name} is currently unsupported."
            elif email and pwd:
                status = "connected"
                last_ver = datetime.now(timezone.utc).isoformat()
                err_msg = None
            elif prev_rec and prev_rec.get("status") == "connected" and prev_rec.get("metadata", {}).get("has_credentials") and email:
                status = "connected"
                last_ver = prev_rec.get("last_verified") or datetime.now(timezone.utc).isoformat()
                err_msg = None
            elif has_cookies and email:
                status = "connected"
                last_ver = (prev_rec and prev_rec.get("last_verified")) or datetime.now(timezone.utc).isoformat()
                err_msg = None
            elif email:
                status = "login_required"
                last_ver = None
                err_msg = f"Password required for {portal.name}."
            else:
                status = "not_connected"
                email = None
                last_ver = None
                err_msg = None

            item = PlatformConnectionItem(
                user_id=user_id,
                platform=portal.name,
                portal_id=portal.id,
                display_name=portal.name,
                website_url=portal.website_url,
                login_url=portal.login_url,
                job_discovery_url=portal.job_discovery_url,
                integration_type=portal.integration_type,
                capabilities=portal.capabilities.__dict__,
                restrictions=portal.restrictions,
                portal_status=portal.status,
                status=status,
                account_email=email,
                last_verified=last_ver,
                error_message=err_msg,
                metadata={"session_dir": session_dir, "has_credentials": bool(email and pwd)},
            )
            self._upsert_connection(user_id, portal.id, item)
            results.append(item)

        return results

    def disconnect_platform(self, user_id: str, platform: str) -> PlatformConnectionItem:
        """Step 6: Clear candidate session data, wipe .env credentials for portal, and mark as not connected."""
        portal = get_portal(platform)
        if not portal:
            raise ValueError(f"Portal '{platform}' is not recognized in the registry.")

        session_dir = _get_user_session_dir(user_id, portal.id)
        try:
            if os.path.exists(session_dir):
                shutil.rmtree(session_dir, ignore_errors=True)
                os.makedirs(session_dir, exist_ok=True)
        except Exception as exc:
            logger.warning("Could not clear session dir %s: %s", session_dir, exc)

        # Clear credentials in .env
        env_key_email = f"{portal.id.upper()}_EMAIL"
        env_key_pwd = f"{portal.id.upper()}_PASSWORD"
        try:
            from services.config_service import update_root_env_file
            update_root_env_file({
                env_key_email: "",
                env_key_pwd: "",
            })
        except Exception as env_exc:
            logger.warning("Could not clear .env for %s: %s", portal.id, env_exc)

        item = PlatformConnectionItem(
            user_id=user_id,
            platform=portal.name,
            portal_id=portal.id,
            display_name=portal.name,
            website_url=portal.website_url,
            login_url=portal.login_url,
            job_discovery_url=portal.job_discovery_url,
            integration_type=portal.integration_type,
            capabilities=portal.capabilities.__dict__,
            restrictions=portal.restrictions,
            portal_status=portal.status,
            status="not_connected",
            account_email=None,
            last_verified=None,
            error_message=None,
            metadata={"session_dir": session_dir, "has_credentials": False},
        )
        self._upsert_connection(user_id, portal.id, item)
        return item

    def _upsert_connection(
        self, user_id: str, portal_id: str, item: PlatformConnectionItem
    ) -> None:
        """Save connection state to Supabase or in-memory fallback. Never restores wiped emails."""
        now_iso = datetime.now(timezone.utc).isoformat()
        row = {
            "user_id": user_id,
            "platform": portal_id.lower(),
            "status": item.status,
            "account_email": item.account_email,
            "last_verified": item.last_verified,
            "error_message": item.error_message,
            "metadata": item.metadata or {},
            "updated_at": now_iso,
        }

        # Validate UUID format before hitting Supabase
        is_uuid = False
        try:
            import uuid
            uuid.UUID(str(user_id))
            is_uuid = True
        except (ValueError, AttributeError, TypeError):
            is_uuid = False

        if self.supabase and is_uuid:
            try:
                existing = (
                    self.supabase.table("platform_connections")
                    .select("id")
                    .eq("user_id", user_id)
                    .ilike("platform", portal_id.lower())
                    .limit(1)
                    .execute()
                )
                if existing.data and len(existing.data) > 0:
                    row_id = existing.data[0]["id"]
                    self.supabase.table("platform_connections").update(row).eq("id", row_id).execute()
                    item.id = str(row_id)
                else:
                    row["created_at"] = now_iso
                    insert_res = self.supabase.table("platform_connections").insert(row).execute()
                    if insert_res.data:
                        item.id = str(insert_res.data[0]["id"])
            except Exception as exc:
                logger.warning("Supabase upsert for connection failed: %s", exc)

        if user_id not in _MEMORY_CONNECTIONS:
            _MEMORY_CONNECTIONS[user_id] = {}
        _MEMORY_CONNECTIONS[user_id][portal_id.lower()] = item.model_dump()


connection_service = ConnectionService()
