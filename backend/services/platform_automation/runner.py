import asyncio
import csv
import logging
import os
import sys
import time
from datetime import datetime, timezone
from typing import Any, Callable, Optional

from core.supabase import get_supabase_client
from schemas.application import ApplicationCreateRequest
from services.application_service import application_service
from services import preference_service, profile_service, resume_service
from services.platform_automation.base import ApplyResult, BasePlatformAdapter, JobOpportunity
from services.platform_automation.indeed import IndeedPlatformAdapter
from services.platform_automation.internshala import InternshalaPlatformAdapter
from services.platform_automation.linkedin import LinkedInPlatformAdapter
from services.platform_automation.naukri import NaukriPlatformAdapter
from services.bot_training.questionnaire_simulator import QuestionnaireSimulator, QuestionItem

try:
    from services.automation_runner import sanitize_text
except ImportError:
    import re
    _SENSITIVE_PATTERNS = [
        (re.compile(r'(password\s*[:=]\s*)([^\s,]+)', re.IGNORECASE), r'\1***REDACTED***'),
        (re.compile(r'(token\s*[:=]\s*)([^\s,]+)', re.IGNORECASE), r'\1***REDACTED***'),
        (re.compile(r'(secret\s*[:=]\s*)([^\s,]+)', re.IGNORECASE), r'\1***REDACTED***'),
        (re.compile(r'(bearer\s+)([A-Za-z0-9_\-\.]+)', re.IGNORECASE), r'\1***REDACTED***'),
        (re.compile(r'(eyJ[A-Za-z0-9_\-]*\.eyJ[A-Za-z0-9_\-]*\.[A-Za-z0-9_\-]*)'), r'***REDACTED_JWT***'),
    ]
    def sanitize_text(text: str) -> str:
        if not text:
            return ""
        s = text
        for p, r in _SENSITIVE_PATTERNS:
            s = p.sub(r, s)
        return s

logger = logging.getLogger("AutomationRunner")

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

SESSION_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "browser_sessions")
)
data_csv = os.path.join(PROJECT_ROOT, "data", "universal_applied_jobs.csv")
UNIVERSAL_CSV_PATH = data_csv if os.path.exists(data_csv) else os.path.abspath(os.path.join(PROJECT_ROOT, "universal_applied_jobs.csv"))


def find_edge_binary() -> Optional[str]:
    candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%PROGRAMFILES(X86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%PROGRAMFILES%\Microsoft\Edge\Application\msedge.exe"),
    ]
    for p in candidates:
        if p and os.path.exists(p):
            return p
    return None


def find_chrome_binary() -> Optional[str]:
    candidates = [
        os.getenv("CHROME_PATH", ""),
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%PROGRAMFILES%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%PROGRAMFILES(X86)%\Google\Chrome\Application\chrome.exe"),
    ]
    for p in candidates:
        if p and os.path.exists(p):
            return p
    return None


def find_brave_binary() -> Optional[str]:
    candidates = [
        os.getenv("BRAVE_PATH", ""),
        r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe",
        r"C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe"),
    ]
    for p in candidates:
        if p and os.path.exists(p):
            return p
    return None


def get_adapter_for_platform(platform: str) -> BasePlatformAdapter:
    p = platform.lower()
    if "internshala" in p:
        return InternshalaPlatformAdapter()
    elif "indeed" in p:
        return IndeedPlatformAdapter()
    elif "linkedin" in p:
        return LinkedInPlatformAdapter()
    return NaukriPlatformAdapter()


def _get_user_session_dir(user_id: str, platform: str) -> str:
    clean_p = "".join(c for c in platform.lower() if c.isalnum() or c in "-_")
    path = os.path.join(SESSION_ROOT, user_id, clean_p)
    os.makedirs(path, exist_ok=True)
    return path


def append_to_universal_csv(platform: str, job_title: str, company: str, job_url: str, status: str, location: str = "Not specified", salary: str = "Not disclosed") -> None:
    """Keep root universal_applied_jobs.csv synced with website task runs with full 8-column schema."""
    try:
        file_exists = os.path.exists(UNIVERSAL_CSV_PATH) and os.stat(UNIVERSAL_CSV_PATH).st_size > 0
        with open(UNIVERSAL_CSV_PATH, "a", newline="", encoding="utf-8") as f:
            fieldnames = ["platform", "url", "job_title", "company", "location", "salary", "status", "timestamp"]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            if not file_exists:
                writer.writeheader()
            writer.writerow({
                "platform": platform,
                "url": job_url,
                "job_title": job_title,
                "company": company,
                "location": location or "Not specified",
                "salary": salary or "Not disclosed",
                "status": status,
                "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            })
    except Exception as exc:
        logger.debug("Could not append to universal CSV: %s", exc)


def is_browser_launch_supported() -> bool:
    """Return True if local desktop browser launch is safe and supported.
    Returns False in low-memory cloud API containers (e.g., Render 512MB dynos)
    or automated test environments to prevent container OOM crashes and resource exhaustion.
    """
    if os.getenv("FORCE_CLOUD_BROWSER", "").lower() in ("true", "1", "yes"):
        return True
    # Render cloud service or container with low memory limit
    if os.getenv("RENDER") or os.getenv("RENDER_SERVICE_ID"):
        return False
    # In automated test suite or CI
    if os.getenv("ENVIRONMENT") == "test" or "pytest" in sys.modules:
        return False
    # If on Linux or container without any installed browser binary,
    # avoid invoking selenium-manager to download 200MB+ binaries into a 512MB dyno
    if sys.platform != "win32":
        if not find_chrome_binary() and not find_edge_binary() and not find_brave_binary():
            return False
    return True


def launch_isolated_driver(user_id: str, platform: str, headless: Optional[bool] = None):
    """Launch WebDriver with candidate's isolated user-data-dir using Selenium native manager.
    Defaults to headless=False so a visible browser window opens on screen when bot starts.
    """
    if not is_browser_launch_supported():
        logger.info(
            "Browser launch skipped: Environment is cloud/low-memory (e.g. Render 512MB) "
            "or test suite. Live browser subprocess disabled to protect container memory."
        )
        return None

    from selenium import webdriver
    from selenium.webdriver.edge.service import Service as EdgeService
    from selenium.webdriver.chrome.service import Service as ChromeService

    if headless is None:
        headless_env = os.getenv("HEADLESS", "false").lower()
        headless = headless_env in ("true", "1", "yes")

    session_dir = _get_user_session_dir(user_id, platform)

    edge_bin = find_edge_binary()
    chrome_bin = find_chrome_binary()
    brave_bin = find_brave_binary()

    base_args = [
        "--disable-blink-features=AutomationControlled",
        "--disable-notifications",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--start-maximized",
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0",
    ]

    # 1. Try Microsoft Edge with user session
    try:
        options = webdriver.EdgeOptions()
        if edge_bin:
            options.binary_location = edge_bin
        for a in base_args:
            options.add_argument(a)
        options.add_argument(f"--user-data-dir={session_dir}")
        if headless:
            options.add_argument("--headless=new")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)

        try:
            driver = webdriver.Edge(options=options)
        except Exception:
            service = EdgeService()
            driver = webdriver.Edge(service=service, options=options)

        driver.set_page_load_timeout(45)
        return driver
    except Exception as edge_err:
        logger.info("Direct Edge launch with session_dir failed: %s. Trying clean profile...", edge_err)

    # 1b. Try Microsoft Edge with a clean profile (avoids profile locking conflicts)
    try:
        options = webdriver.EdgeOptions()
        if edge_bin:
            options.binary_location = edge_bin
        for a in base_args:
            options.add_argument(a)
        if headless:
            options.add_argument("--headless=new")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)

        try:
            driver = webdriver.Edge(options=options)
        except Exception:
            service = EdgeService()
            driver = webdriver.Edge(service=service, options=options)

        driver.set_page_load_timeout(45)
        return driver
    except Exception as edge_clean_err:
        logger.info("Clean Edge launch failed: %s. Trying Chrome...", edge_clean_err)

    # 2. Try Google Chrome with user session
    try:
        options = webdriver.ChromeOptions()
        if chrome_bin:
            options.binary_location = chrome_bin
        for a in base_args:
            options.add_argument(a)
        options.add_argument(f"--user-data-dir={session_dir}")
        if headless:
            options.add_argument("--headless=new")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)

        try:
            driver = webdriver.Chrome(options=options)
        except Exception:
            service = ChromeService()
            driver = webdriver.Chrome(service=service, options=options)

        driver.set_page_load_timeout(45)
        return driver
    except Exception as chrome_err:
        logger.info("Local Chrome launch with session_dir failed: %s. Trying clean Chrome...", chrome_err)

    # 2b. Try Chrome with clean profile
    try:
        options = webdriver.ChromeOptions()
        if chrome_bin:
            options.binary_location = chrome_bin
        for a in base_args:
            options.add_argument(a)
        if headless:
            options.add_argument("--headless=new")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)

        try:
            driver = webdriver.Chrome(options=options)
        except Exception:
            service = ChromeService()
            driver = webdriver.Chrome(service=service, options=options)

        driver.set_page_load_timeout(45)
        return driver
    except Exception as chrome_clean_err:
        logger.info("Clean Chrome launch failed: %s. Trying Brave / BrowserManager...", chrome_clean_err)

    # 3. Try Brave
    if brave_bin:
        try:
            options = webdriver.ChromeOptions()
            options.binary_location = brave_bin
            for a in base_args:
                options.add_argument(a)
            if headless:
                options.add_argument("--headless=new")
            options.add_experimental_option("excludeSwitches", ["enable-automation"])
            options.add_experimental_option("useAutomationExtension", False)
            driver = webdriver.Chrome(options=options)
            driver.set_page_load_timeout(45)
            return driver
        except Exception as brave_err:
            logger.info("Brave launch failed: %s", brave_err)

    # 4. Fallback to platforms.browser_manager
    try:
        from platforms.browser_manager import create_driver
        return create_driver(headless=headless, user_data_dir=None)
    except Exception as bm_err:
        logger.warning("Browser manager fallback failed: %s", bm_err)

    return None


async def run_platform_automation_task(
    task_id: str,
    user_id: str,
    record: dict[str, Any],
    update_task_state: Callable[..., None],
    is_cancelled: Callable[[], bool],
) -> None:
    """Execute end-to-end real website automation across candidate's connected platforms."""
    payload = record.get("payload") or {}
    dry_run = bool(record.get("dry_run", True))
    task_type = str(record.get("task_type") or payload.get("task_type") or "job_apply")
    user_confirmed = bool(payload.get("user_confirmed_real_submission", False))
    max_apps_total = min(int(payload.get("max_applications") or 25), 100)
    raw_platform = str(payload.get("platform") or record.get("platform") or "All Platforms").strip()

    now_iso = datetime.now(timezone.utc).isoformat()

    # ─────────────────────────────────────────────────────────────
    # STAGE 1: Profile & Target Role Validation (10%)
    # ─────────────────────────────────────────────────────────────
    update_task_state(
        status_val="running",
        progress_val=10,
        message_val=f"Verifying candidate profile and permissions for {raw_platform}...",
        started_at=now_iso,
    )
    await asyncio.sleep(0.4)
    if is_cancelled():
        return

    profile = await profile_service.get_or_create_profile(user_id)
    profile_dict = profile.model_dump()

    missing_mandatory = []
    if not profile.full_name or profile.full_name.strip().lower() in ["", "candidate"] or len(profile.full_name.strip()) < 2:
        missing_mandatory.append("Full Name")
    if not profile.email and not profile.phone:
        missing_mandatory.append("Contact Phone or Email")
    if not profile.skills or len(profile.skills) < 1:
        missing_mandatory.append("At least 1 Technical Skill")

    if missing_mandatory:
        err_msg = f"Profile incomplete. Missing required fields: {', '.join(missing_mandatory)}."
        update_task_state(
            status_val="failed",
            progress_val=10,
            message_val=err_msg,
            error_details=err_msg,
            completed_at=datetime.now(timezone.utc).isoformat(),
        )
        logger.warning("Task %s rejected due to incomplete profile: %s", task_id, err_msg)
        return

    # Extract target keywords & locations, cleanly handling comma-separated lists and strings
    raw_keywords = payload.get("keywords")
    if not raw_keywords:
        prefs = await preference_service.get_user_preferences(user_id)
        raw_keywords = prefs.job_titles or [profile.headline or "Frontend Developer, Backend Developer"]

    keywords: list[str] = []
    if isinstance(raw_keywords, str):
        keywords = [k.strip() for k in raw_keywords.split(",") if k.strip()]
    elif isinstance(raw_keywords, list):
        for item in raw_keywords:
            if isinstance(item, str):
                for part in item.split(","):
                    p_clean = part.strip()
                    if p_clean and p_clean not in keywords:
                        keywords.append(p_clean)
    if not keywords:
        keywords = ["Frontend Developer", "Backend Developer"]

    raw_locations = payload.get("locations")
    if not raw_locations:
        prefs = await preference_service.get_user_preferences(user_id)
        raw_locations = prefs.locations or ["pune", "Remote"]

    locations: list[str] = []
    if isinstance(raw_locations, str):
        locations = [l.strip() for l in raw_locations.split(",") if l.strip()]
    elif isinstance(raw_locations, list):
        for item in raw_locations:
            if isinstance(item, str):
                for part in item.split(","):
                    p_clean = part.strip()
                    if p_clean and p_clean not in locations:
                        locations.append(p_clean)
    if not locations:
        locations = ["pune"]

    # Safety: Live submission without explicit confirmation check
    if not dry_run and not user_confirmed:
        update_task_state(
            status_val="failed",
            progress_val=10,
            message_val="Live submission rejected: user_confirmed_real_submission=True flag is required.",
            error_details="Requires explicit candidate confirmation before submitting live applications.",
            completed_at=datetime.now(timezone.utc).isoformat(),
        )
        return

    # ─────────────────────────────────────────────────────────────
    # STAGE 2: Identify Candidate's Permitted & Connected Platforms
    # ─────────────────────────────────────────────────────────────
    supabase = get_supabase_client()
    connected_platforms: list[str] = []
    is_uuid = False
    try:
        import uuid
        uuid.UUID(str(user_id))
        is_uuid = True
    except (ValueError, AttributeError, TypeError):
        is_uuid = False

    if supabase and is_uuid:
        try:
            conn_res = (
                supabase.table("platform_connections")
                .select("platform, status, metadata")
                .eq("user_id", user_id)
                .execute()
            )
            if conn_res.data:
                for row in conn_res.data:
                    p = row.get("platform", "").lower()
                    st = row.get("status", "")
                    meta = row.get("metadata") or {}
                    # Connected or permission granted
                    if st == "connected" or meta.get("permission_granted"):
                        if "naukri" in p and "Naukri" not in connected_platforms:
                            connected_platforms.append("Naukri")
                        elif "internshala" in p and "Internshala" not in connected_platforms:
                            connected_platforms.append("Internshala")
                        elif "indeed" in p and "Indeed" not in connected_platforms:
                            connected_platforms.append("Indeed")
                        elif "linkedin" in p and "LinkedIn" not in connected_platforms:
                            connected_platforms.append("LinkedIn")
        except Exception as conn_err:
            logger.warning("Could not query platform_connections: %s", conn_err)

    # Determine execution platform list based on user selection & connected platforms
    universal_bot_script = os.path.join(PROJECT_ROOT, "universal_bot.py")
    if os.path.exists(universal_bot_script):
        # 1. Determine CLI flags
        bot_args: list[str] = []
        if task_type == "profile_update":
            if "naukri" in raw_platform.lower():
                bot_args = ["--update-naukri-profile"]
            elif "internshala" in raw_platform.lower():
                bot_args = ["--update-internshala-profile"]
            else:
                bot_args = ["--update-all-profiles"]
        elif task_type == "report":
            bot_args = ["--report"]
        else:
            # Job Apply Platform Selection
            if any(term in raw_platform.lower() for term in ["all", "all portals", "all platforms"]):
                target_plat = "all"
            elif "naukri" in raw_platform.lower():
                target_plat = "naukri"
            elif "internshala" in raw_platform.lower():
                target_plat = "internshala"
            elif "indeed" in raw_platform.lower():
                target_plat = "indeed"
            elif "linkedin" in raw_platform.lower():
                target_plat = "linkedin"
            elif "portal" in raw_platform.lower():
                target_plat = "portals"
            else:
                target_plat = "all"

            bot_args = ["--platform", target_plat, "--max-apps", str(max_apps_total)]
            if dry_run:
                bot_args.append("--dry-run")
            
            # Detect cloud / low-memory headless container (Render, Linux without DISPLAY)
            is_cloud = bool(os.getenv("RENDER") or os.getenv("RENDER_SERVICE_ID") or (sys.platform != "win32" and not os.getenv("DISPLAY")))
            is_headless = bool(payload.get("headless") or is_cloud or os.getenv("HEADLESS", "").lower() in ("true", "1", "yes"))
            if is_headless:
                bot_args.append("--headless")

        sub_env = os.environ.copy()
        sub_env["PYTHONUNBUFFERED"] = "1"
        sub_env["PYTHONIOENCODING"] = "utf-8"
        if dry_run:
            sub_env["DRY_RUN"] = "1"
        if is_headless:
            sub_env["HEADLESS"] = "1"
            sub_env["BROWSER"] = "chrome"
        if keywords:
            sub_env["KEYWORDS"] = ", ".join(keywords)
        if locations:
            sub_env["LOCATION"] = ", ".join(locations)
        sub_env["MAX_APPLICATIONS"] = str(max_apps_total)
        sub_env["CANDIDATE_USER_ID"] = str(user_id)
        names = (profile.full_name or "Umesh Temburwar").strip().split()
        sub_env["FIRSTNAME"] = names[0] if names else "Umesh"
        sub_env["LASTNAME"] = " ".join(names[1:]) if len(names) > 1 else (names[0] if names else "Candidate")
        sub_env["CANDIDATE_NAME"] = (profile.full_name or "Umesh Temburwar").strip()
        if profile.email:
            sub_env["EMAIL"] = profile.email
        if profile.phone:
            sub_env["PHONE"] = profile.phone

        # Sync portal credentials from connection_service / .env if available
        try:
            from services.connection_service import _read_env_credentials
            env_creds = _read_env_credentials()
            for p_name in ["naukri", "internshala", "indeed", "linkedin"]:
                c_data = env_creds.get(p_name, {})
                c_email = c_data.get("email") or ""
                c_pwd = c_data.get("password") or ""
                if c_email and f"{p_name.upper()}_EMAIL" not in sub_env:
                    sub_env[f"{p_name.upper()}_EMAIL"] = c_email
                if c_pwd and f"{p_name.upper()}_PASSWORD" not in sub_env:
                    sub_env[f"{p_name.upper()}_PASSWORD"] = c_pwd
        except Exception as cred_err:
            logger.debug("Credentials injection note: %s", cred_err)

        update_task_state(
            status_val="running",
            progress_val=15,
            message_val=f"Running universal_bot.py {' '.join(bot_args)}",
        )

        def _execute_cli() -> tuple[int, str]:
            import subprocess
            cmd = [sys.executable, "-u", universal_bot_script, *bot_args]
            logger.info("Executing Universal Bot CLI: %s", " ".join(cmd))
            proc = subprocess.Popen(
                cmd,
                cwd=PROJECT_ROOT,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                env=sub_env,
                bufsize=1,
            )
            last_msg = "Universal Bot initialized"
            cur_prog = 20
            try:
                for raw_line in proc.stdout:
                    if is_cancelled():
                        proc.terminate()
                        try:
                            proc.wait(timeout=2)
                        except Exception:
                            proc.kill()
                        return -1, "Task cancelled by user."
                    clean = sanitize_text(raw_line.strip()).encode("ascii", "ignore").decode("ascii")
                    if clean and not clean.startswith("="):
                        last_msg = clean
                        cur_prog = min(95, cur_prog + 2)
                        update_task_state(status_val="running", progress_val=cur_prog, message_val=clean[:120])
                proc.wait()
            except Exception as cli_err:
                try:
                    proc.kill()
                except Exception:
                    pass
                return -1, str(cli_err)
            return proc.returncode, last_msg

        return_code, final_line = await asyncio.to_thread(_execute_cli)

        if is_cancelled():
            update_task_state(status_val="cancelled", progress_val=0, message_val="Task cancelled by user.")
            return

        # Synchronize applications to Supabase and CSV via consolidated report
        try:
            from Universal_Job_Auto_Apply import show_consolidated_report
            await asyncio.to_thread(show_consolidated_report)
        except Exception as rep_err:
            logger.debug("Report sync note: %s", rep_err)

        if return_code == 0:
            update_task_state(
                status_val="completed",
                progress_val=100,
                message_val=f"{'[DRY RUN] ' if dry_run else ''}Universal Bot completed successfully for {raw_platform}.",
                completed_at=datetime.now(timezone.utc).isoformat(),
            )
        else:
            update_task_state(
                status_val="completed" if ("completed" in final_line.lower() or dry_run) else "failed",
                progress_val=100,
                message_val=f"{'[DRY RUN] ' if dry_run else ''}Universal Bot finished: {final_line[:120]}",
                completed_at=datetime.now(timezone.utc).isoformat(),
            )
        return

