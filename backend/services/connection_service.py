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


def _get_user_session_dir(user_id: str, portal_id: str) -> str:
    """Return isolated directory for a candidate's portal browser profile."""
    safe_uid = "".join(c for c in user_id if c.isalnum() or c in "-_")
    clean_portal = "".join(c for c in portal_id.lower() if c.isalnum() or c in "-_")
    session_dir = os.path.join(SESSION_ROOT, safe_uid, clean_portal)
    os.makedirs(session_dir, exist_ok=True)
    return session_dir


def _read_env_credentials() -> dict[str, dict[str, str]]:
    """Read portal credentials configured in root .env file."""
    root_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
    creds: dict[str, dict[str, str]] = {}
    if os.path.exists(root_env):
        try:
            with open(root_env, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    k, v = line.split("=", 1)
                    k, v = k.strip().upper(), v.strip().strip("'\"")
                    if k == "NAUKRI_EMAIL":
                        creds.setdefault("naukri", {})["email"] = v
                    elif k == "NAUKRI_PASSWORD":
                        creds.setdefault("naukri", {})["password"] = v
                    elif k == "INTERNSHALA_EMAIL":
                        creds.setdefault("internshala", {})["email"] = v
                    elif k == "INTERNSHALA_PASSWORD":
                        creds.setdefault("internshala", {})["password"] = v
                    elif k == "INDEED_EMAIL":
                        creds.setdefault("indeed", {})["email"] = v
                    elif k == "INDEED_PASSWORD":
                        creds.setdefault("indeed", {})["password"] = v
                    elif k == "LINKEDIN_EMAIL":
                        creds.setdefault("linkedin", {})["email"] = v
                    elif k == "LINKEDIN_PASSWORD":
                        creds.setdefault("linkedin", {})["password"] = v
        except Exception as e:
            logger.warning("Could not parse root .env for credentials: %s", e)

    # Fallback to system environment
    env_mappings = {
        "naukri": ("NAUKRI_EMAIL", "NAUKRI_PASSWORD"),
        "internshala": ("INTERNSHALA_EMAIL", "INTERNSHALA_PASSWORD"),
        "indeed": ("INDEED_EMAIL", "INDEED_PASSWORD"),
        "linkedin": ("LINKEDIN_EMAIL", "LINKEDIN_PASSWORD"),
    }
    for p_id, (e_var, p_var) in env_mappings.items():
        e_val = os.getenv(e_var, "").strip()
        p_val = os.getenv(p_var, "").strip()
        if e_val:
            creds.setdefault(p_id, {})["email"] = e_val
        if p_val:
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
            # If SQLite file is currently locked by a live browser process, size check
            if os.path.getsize(path) > 8192:
                return True

    return False


def _has_stored_session(session_dir: str, portal_id: Optional[str] = None) -> bool:
    """Check if Chromium user-data-dir contains established session cookies or profile files."""
    if not os.path.exists(session_dir):
        return False

    if portal_id:
        return _has_portal_cookies(session_dir, portal_id)

    candidate_files = [
        os.path.join(session_dir, "Default", "Network", "Cookies"),
        os.path.join(session_dir, "Default", "Cookies"),
        os.path.join(session_dir, "Cookies"),
        os.path.join(session_dir, "Default", "Preferences"),
        os.path.join(session_dir, "Default", "Web Data"),
    ]
    for path in candidate_files:
        if os.path.exists(path) and os.path.getsize(path) > 4096:
            return True

    return False


def _launch_browser_window(session_dir: str, target_url: str) -> bool:
    """Launch user-visible browser instance with dedicated isolated profile."""
    if os.getenv("RENDER") or os.getenv("RENDER_SERVICE_ID"):
        logger.info("Render cloud environment detected: browser window opening deferred to candidate's local client.")
        return False

    cmd = None
    if sys.platform == "win32":
        browser_candidates = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
            os.path.expandvars(r"%PROGRAMFILES%\Microsoft\Edge\Application\msedge.exe"),
            os.path.expandvars(r"%PROGRAMFILES(X86)%\Microsoft\Edge\Application\msedge.exe"),
            r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe"),
        ]
        for c in browser_candidates:
            if os.path.exists(c):
                cmd = [c, f"--user-data-dir={session_dir}", "--new-window", target_url]
                break

    launched = False
    if cmd:
        try:
            logger.info("Launching isolated browser window: %s -> %s", cmd[0], target_url)
            subprocess.Popen(
                cmd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0,
            )
            launched = True
        except Exception as exc:
            logger.warning("Could not launch browser directly: %s", exc)

    # Always ensure browser window opens using system default browser as guaranteed fallback
    try:
        import webbrowser
        webbrowser.open(target_url, new=1)
        launched = True
    except Exception as wb_err:
        logger.debug("Webbrowser open fallback note: %s", wb_err)

    return launched


class ConnectionService:
    def __init__(self):
        self.supabase = get_supabase_client()

    def get_portal_registry(self) -> list[PortalRegistryItem]:
        """Return full audited portal registry with metadata and capabilities."""
        return [
            PortalRegistryItem(
                id=p.id,
                name=p.name,
                website_url=p.website_url,
                login_url=p.login_url,
                job_discovery_url=p.job_discovery_url,
                integration_type=p.integration_type,
                supported_auth_methods=p.supported_auth_methods,
                browser_adapter=p.browser_adapter,
                login_verification_strategy=p.login_verification_strategy,
                capabilities=p.capabilities.__dict__,
                restrictions=p.restrictions,
                status=p.status,
                notes=p.notes,
            )
            for p in get_all_portals()
        ]

    def get_user_connections(self, user_id: str) -> list[PlatformConnectionItem]:
        """Retrieve connection states for all registry portals for the authenticated candidate."""
        db_records: dict[str, dict[str, Any]] = {}
        env_creds = _read_env_credentials()

        # Check if user_id is a valid UUID before querying Supabase
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
            has_cookies = _has_portal_cookies(session_dir, p_id)
            env_email = env_creds.get(p_id, {}).get("email")

            if record:
                status = record.get("status", "not_connected")
                meta = record.get("metadata") or {}
                if has_cookies or status == "connected" or meta.get("permission_granted"):
                    status = "connected"
                elif status == "connecting":
                    status = "connecting"
                elif status != "unsupported":
                    status = record.get("status", "not_connected")

                acc_email = record.get("account_email") or env_email

                results.append(
                    PlatformConnectionItem(
                        id=str(record.get("id")) if record.get("id") else None,
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
                        account_email=acc_email,
                        last_verified=record.get("last_verified") or (datetime.now(timezone.utc).isoformat() if has_cookies else None),
                        error_message=record.get("error_message"),
                        metadata={"session_dir": session_dir},
                    )
                )
            else:
                default_status = "connected" if has_cookies else "not_connected"
                results.append(
                    PlatformConnectionItem(
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
                        status=default_status,
                        account_email=env_email,
                        last_verified=datetime.now(timezone.utc).isoformat() if has_cookies else None,
                        error_message=None,
                        metadata={"session_dir": session_dir},
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
        """Connect candidate portal with explicit user permission and optional credentials."""
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

        # Lookup in .env if account_email not provided
        if not account_email:
            env_creds = _read_env_credentials()
            account_email = env_creds.get(portal.id, {}).get("email")

        now_iso = datetime.now(timezone.utc).isoformat()
        if has_cookies:
            new_status = "connected"
            err_msg = None
        elif opened:
            new_status = "connecting"
            err_msg = f"Browser login window opened for {portal.name}. Please sign in, then click Verify."
        elif permission_granted:
            new_status = "connected"
            err_msg = None
        else:
            new_status = "connecting"
            err_msg = "Permission required to automate applications."

        meta: dict[str, Any] = {
            "session_dir": session_dir,
            "browser_launched": opened,
            "permission_granted": permission_granted,
            "connected_at": now_iso,
        }
        if account_password:
            meta["has_credentials"] = True

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
            account_email=account_email,
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
        """Connect all core platforms (Naukri, Internshala, Indeed, LinkedIn) with candidate permission."""
        core_portal_ids = ["naukri", "internshala", "indeed", "linkedin"]
        results = []
        for pid in core_portal_ids:
            try:
                conn = self.connect_platform(
                    user_id=user_id,
                    platform=pid,
                    account_email=account_email,
                    permission_granted=permission_granted,
                    launch_browser=False,
                )
                results.append(conn)
            except Exception as e:
                logger.warning("Could not connect platform %s: %s", pid, e)
        return results

    def verify_platform_connection(
        self,
        user_id: str,
        platform: str,
        account_email: Optional[str] = None,
        confirmed: bool = True,
        live_driver_check: bool = False,
    ) -> PlatformConnectionItem:
        """Step 4 & 5: Verify whether an active, valid session exists in candidate's isolated profile."""
        portal = get_portal(platform)
        if not portal:
            raise ValueError(f"Portal '{platform}' is not recognized in the registry.")

        session_dir = _get_user_session_dir(user_id, portal.id)
        has_cookies = _has_portal_cookies(session_dir, portal.id)
        now_iso = datetime.now(timezone.utc).isoformat()

        # Check .env credentials if account_email not provided
        if not account_email:
            env_creds = _read_env_credentials()
            account_email = env_creds.get(portal.id, {}).get("email")

        # Optional live browser inspection via Selenium driver
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

        # Verified if portal cookies exist OR explicitly confirmed with account email
        if has_cookies or (confirmed and account_email):
            new_status = "connected"
            err_msg = None
            last_ver = now_iso
        else:
            new_status = "login_required"
            err_msg = f"No active login detected on {portal.name}. Click 'Open' to sign in on the official site."
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
            account_email=account_email,
            last_verified=last_ver,
            error_message=err_msg,
            metadata={"session_dir": session_dir, "verified_at": last_ver},
        )
        self._upsert_connection(user_id, portal.id, item)
        return item

    def sync_from_env(self, user_id: str) -> list[PlatformConnectionItem]:
        """Automatically load credentials and portal emails from root .env and configure connections."""
        env_creds = _read_env_credentials()
        results = []
        for portal in get_all_portals():
            p_id = portal.id
            cred = env_creds.get(p_id, {})
            email = cred.get("email")
            pwd = cred.get("password")
            session_dir = _get_user_session_dir(user_id, p_id)
            has_cookies = _has_portal_cookies(session_dir, p_id)

            status = "connected" if has_cookies else ("login_required" if email else "not_connected")
            now_iso = datetime.now(timezone.utc).isoformat()
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
                last_verified=now_iso if has_cookies else None,
                error_message=None if has_cookies else (f"Credentials synced from .env for {portal.name}. Open portal to verify login." if email else None),
                metadata={
                    "session_dir": session_dir,
                    "has_credentials": bool(pwd),
                    "synced_from_env": True,
                },
            )
            self._upsert_connection(user_id, p_id, item)
            results.append(item)
        return results

    def disconnect_platform(self, user_id: str, platform: str) -> PlatformConnectionItem:
        """Step 6: Clear candidate session data and mark connection as not connected."""
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
            metadata=None,
        )
        self._upsert_connection(user_id, portal.id, item)
        return item

    def _upsert_connection(
        self, user_id: str, portal_id: str, item: PlatformConnectionItem
    ) -> None:
        """Save connection state to Supabase or in-memory fallback."""
        if item.account_email is None and user_id in _MEMORY_CONNECTIONS and portal_id.lower() in _MEMORY_CONNECTIONS[user_id]:
            item.account_email = _MEMORY_CONNECTIONS[user_id][portal_id.lower()].get("account_email")

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
