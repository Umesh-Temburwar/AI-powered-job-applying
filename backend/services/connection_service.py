import logging
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from typing import Any, Optional

from core.supabase import get_supabase_client
from schemas.connection import PlatformConnectionItem

logger = logging.getLogger("connections")

SUPPORTED_PLATFORMS = ["Naukri", "Internshala", "Indeed"]

LOGIN_URLS = {
    "Naukri": "https://www.naukri.com/nlogin/login",
    "Internshala": "https://internshala.com/login/user",
    "Indeed": "https://secure.indeed.com/auth",
}

# User-isolated browser session directory
SESSION_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "browser_sessions")
)

_MEMORY_CONNECTIONS: dict[str, dict[str, dict[str, Any]]] = {}


def _get_user_session_dir(user_id: str, platform: str) -> str:
    """Return isolated directory for a candidate's portal browser profile."""
    safe_uid = "".join(c for c in user_id if c.isalnum() or c in "-_")
    session_dir = os.path.join(SESSION_ROOT, safe_uid, platform.lower())
    os.makedirs(session_dir, exist_ok=True)
    return session_dir


def _has_stored_session(session_dir: str) -> bool:
    """Check if Chromium user-data-dir contains established session cookies."""
    if not os.path.exists(session_dir):
        return False

    candidate_files = [
        os.path.join(session_dir, "Default", "Network", "Cookies"),
        os.path.join(session_dir, "Default", "Cookies"),
        os.path.join(session_dir, "Cookies"),
        os.path.join(session_dir, "Default", "Preferences"),
    ]
    for path in candidate_files:
        if os.path.exists(path) and os.path.getsize(path) > 1024:
            return True

    # Check for any profile directory contents
    default_dir = os.path.join(session_dir, "Default")
    if os.path.exists(default_dir):
        entries = os.listdir(default_dir)
        if len(entries) > 5:
            return True
    return False


class ConnectionService:
    def __init__(self):
        self.supabase = get_supabase_client()

    def get_user_connections(self, user_id: str) -> list[PlatformConnectionItem]:
        """Retrieve connection states for all supported portals for the candidate."""
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
                        plat = row.get("platform", "")
                        for p in SUPPORTED_PLATFORMS:
                            if p.lower() == plat.lower():
                                db_records[p] = row
                                break
            except Exception as exc:
                logger.warning("Failed to query platform_connections from Supabase: %s", exc)

        # Merge with in-memory store
        user_mem = _MEMORY_CONNECTIONS.get(user_id, {})
        for p in SUPPORTED_PLATFORMS:
            if p not in db_records and p in user_mem:
                db_records[p] = user_mem[p]

        results = []
        for p in SUPPORTED_PLATFORMS:
            record = db_records.get(p)
            session_dir = _get_user_session_dir(user_id, p)
            has_session = _has_stored_session(session_dir)

            if record:
                status = record.get("status", "not_connected")
                # If marked connected but session directory is completely empty, reflect truthful state
                if status == "connected" and not has_session:
                    status = "login_required"

                results.append(
                    PlatformConnectionItem(
                        id=str(record.get("id")) if record.get("id") else None,
                        user_id=user_id,
                        platform=p,
                        status=status,
                        account_email=record.get("account_email"),
                        last_verified=record.get("last_verified"),
                        error_message=record.get("error_message"),
                        metadata=record.get("metadata"),
                    )
                )
            else:
                default_status = "connected" if has_session else "not_connected"
                results.append(
                    PlatformConnectionItem(
                        user_id=user_id,
                        platform=p,
                        status=default_status,
                        account_email=None,
                        last_verified=None,
                        error_message=None,
                    )
                )

        return results

    def connect_platform(self, user_id: str, platform: str) -> PlatformConnectionItem:
        """Initiate user-visible browser session for official portal login."""
        matched_plat = None
        for p in SUPPORTED_PLATFORMS:
            if p.lower() == platform.lower():
                matched_plat = p
                break

        if not matched_plat:
            raise ValueError(f"Platform '{platform}' is not supported.")

        session_dir = _get_user_session_dir(user_id, matched_plat)
        login_url = LOGIN_URLS.get(matched_plat, "https://google.com")
        now_iso = datetime.now(timezone.utc).isoformat()

        # Launch user-visible browser with candidate-isolated user data dir
        # Users enter credentials and MFA directly on the official site
        try:
            # Detect Chrome or Edge executable
            cmd = None
            if sys.platform == "win32":
                chrome_candidates = [
                    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                    os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
                    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                ]
                for c in chrome_candidates:
                    if os.path.exists(c):
                        cmd = [c, f"--user-data-dir={session_dir}", login_url]
                        break

            if cmd:
                logger.info("Launching isolated browser for %s: %s", matched_plat, cmd[0])
                subprocess.Popen(
                    cmd,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0,
                )
        except Exception as exc:
            logger.warning("Could not launch browser directly: %s", exc)

        new_status = "connecting"
        item = PlatformConnectionItem(
            user_id=user_id,
            platform=matched_plat,
            status=new_status,
            account_email=None,
            last_verified=None,
            error_message="Browser opened. Please complete login on the official portal.",
            metadata={"session_dir": session_dir},
        )

        self._upsert_connection(user_id, matched_plat, item)
        return item

    def verify_platform_connection(self, user_id: str, platform: str) -> PlatformConnectionItem:
        """Verify whether an active, valid session exists in candidate's isolated profile."""
        matched_plat = None
        for p in SUPPORTED_PLATFORMS:
            if p.lower() == platform.lower():
                matched_plat = p
                break

        if not matched_plat:
            raise ValueError(f"Platform '{platform}' is not supported.")

        session_dir = _get_user_session_dir(user_id, matched_plat)
        has_session = _has_stored_session(session_dir)
        now_iso = datetime.now(timezone.utc).isoformat()

        if has_session:
            new_status = "connected"
            err_msg = None
            last_ver = now_iso
        else:
            new_status = "login_required"
            err_msg = "No authenticated session found. Please click Connect to log in."
            last_ver = None

        item = PlatformConnectionItem(
            user_id=user_id,
            platform=matched_plat,
            status=new_status,
            last_verified=last_ver,
            error_message=err_msg,
            metadata={"session_dir": session_dir},
        )

        self._upsert_connection(user_id, matched_plat, item)
        return item

    def disconnect_platform(self, user_id: str, platform: str) -> PlatformConnectionItem:
        """Clear candidate session data and mark connection as not connected."""
        matched_plat = None
        for p in SUPPORTED_PLATFORMS:
            if p.lower() == platform.lower():
                matched_plat = p
                break

        if not matched_plat:
            raise ValueError(f"Platform '{platform}' is not supported.")

        session_dir = _get_user_session_dir(user_id, matched_plat)
        try:
            if os.path.exists(session_dir):
                shutil.rmtree(session_dir, ignore_errors=True)
                os.makedirs(session_dir, exist_ok=True)
        except Exception as exc:
            logger.warning("Could not clear session dir %s: %s", session_dir, exc)

        item = PlatformConnectionItem(
            user_id=user_id,
            platform=matched_plat,
            status="not_connected",
            account_email=None,
            last_verified=None,
            error_message=None,
            metadata=None,
        )

        self._upsert_connection(user_id, matched_plat, item)
        return item

    def _upsert_connection(
        self, user_id: str, platform: str, item: PlatformConnectionItem
    ) -> None:
        """Save connection state to Supabase or in-memory fallback."""
        now_iso = datetime.now(timezone.utc).isoformat()
        row = {
            "user_id": user_id,
            "platform": platform,
            "status": item.status,
            "account_email": item.account_email,
            "last_verified": item.last_verified,
            "error_message": item.error_message,
            "metadata": item.metadata or {},
            "updated_at": now_iso,
        }

        if self.supabase:
            try:
                # Check existing
                existing = (
                    self.supabase.table("platform_connections")
                    .select("id")
                    .eq("user_id", user_id)
                    .ilike("platform", platform)
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
        _MEMORY_CONNECTIONS[user_id][platform] = item.model_dump()


connection_service = ConnectionService()
