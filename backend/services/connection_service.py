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


def _get_user_session_dir(user_id: str, portal_id: str) -> str:
    """Return isolated directory for a candidate's portal browser profile."""
    safe_uid = "".join(c for c in user_id if c.isalnum() or c in "-_")
    clean_portal = "".join(c for c in portal_id.lower() if c.isalnum() or c in "-_")
    session_dir = os.path.join(SESSION_ROOT, safe_uid, clean_portal)
    os.makedirs(session_dir, exist_ok=True)
    return session_dir


def _has_stored_session(session_dir: str) -> bool:
    """Check if Chromium user-data-dir contains established session cookies or profile files."""
    if not os.path.exists(session_dir):
        return False

    candidate_files = [
        os.path.join(session_dir, "Default", "Network", "Cookies"),
        os.path.join(session_dir, "Default", "Cookies"),
        os.path.join(session_dir, "Cookies"),
        os.path.join(session_dir, "Default", "Preferences"),
        os.path.join(session_dir, "Default", "Web Data"),
    ]
    for path in candidate_files:
        if os.path.exists(path) and os.path.getsize(path) > 1024:
            return True

    default_dir = os.path.join(session_dir, "Default")
    if os.path.exists(default_dir):
        try:
            entries = os.listdir(default_dir)
            if len(entries) > 5:
                return True
        except OSError:
            pass
    return False


def _launch_browser_window(session_dir: str, target_url: str) -> bool:
    """Launch user-visible browser instance with dedicated isolated profile."""
    cmd = None
    if sys.platform == "win32":
        browser_candidates = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        ]
        for c in browser_candidates:
            if os.path.exists(c):
                cmd = [c, f"--user-data-dir={session_dir}", target_url]
                break

    if not cmd:
        # Fallback to python webbrowser or generic command
        try:
            import webbrowser
            webbrowser.open(target_url)
            return True
        except Exception:
            return False

    try:
        logger.info("Launching isolated browser: %s -> %s", cmd[0], target_url)
        subprocess.Popen(
            cmd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0,
        )
        return True
    except Exception as exc:
        logger.warning("Could not launch browser directly: %s", exc)
        return False


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

        if self.supabase:
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
            has_session = _has_stored_session(session_dir)

            if record:
                status = record.get("status", "not_connected")
                # Truthful check: If marked connected but session directory is completely empty, require login
                if status == "connected" and not has_session:
                    status = "login_required"

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
                        account_email=record.get("account_email"),
                        last_verified=record.get("last_verified"),
                        error_message=record.get("error_message"),
                        metadata={"session_dir": session_dir},
                    )
                )
            else:
                default_status = "connected" if has_session else "not_connected"
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
                        account_email=None,
                        last_verified=None,
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

    def connect_platform(self, user_id: str, platform: str) -> PlatformConnectionItem:
        """Step 3: Initiate manual connection flow for candidate."""
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
            error_message="Browser opened. Please complete login on the official portal, then click Verify.",
            metadata={"session_dir": session_dir, "browser_launched": opened},
        )
        self._upsert_connection(user_id, portal.id, item)
        return item

    def verify_platform_connection(self, user_id: str, platform: str) -> PlatformConnectionItem:
        """Step 4 & 5: Verify whether an active, valid session exists in candidate's isolated profile."""
        portal = get_portal(platform)
        if not portal:
            raise ValueError(f"Portal '{platform}' is not recognized in the registry.")

        session_dir = _get_user_session_dir(user_id, portal.id)
        has_session = _has_stored_session(session_dir)
        now_iso = datetime.now(timezone.utc).isoformat()

        if has_session:
            new_status = "connected"
            err_msg = None
            last_ver = now_iso
        else:
            new_status = "login_required"
            err_msg = f"No active login detected on {portal.name}. Click 'Open Portal' to sign in on the official site."
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
            last_verified=last_ver,
            error_message=err_msg,
            metadata={"session_dir": session_dir},
        )
        self._upsert_connection(user_id, portal.id, item)
        return item

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

        if self.supabase:
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
