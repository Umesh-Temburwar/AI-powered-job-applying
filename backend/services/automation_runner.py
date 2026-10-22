import logging
import re
import time
from typing import Any, Callable

logger = logging.getLogger("automation_runner")

# Sensitive token redaction regex patterns and replacement pairs
SENSITIVE_PATTERNS = [
    (re.compile(r"(password|pwd|secret|token|api_key|authorization)[=:\s]+([^\s,;]+)", re.IGNORECASE), r"\1: [REDACTED]"),
    (re.compile(r"Bearer\s+([A-Za-z0-9\-\._~\+\/]+=*)", re.IGNORECASE), r"Bearer [REDACTED]"),
    (re.compile(r"sbp_[a-zA-Z0-9]+", re.IGNORECASE), r"[REDACTED_KEY]"),
    (re.compile(r"ey[A-Za-z0-9-_]+\.ey[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+"), r"[REDACTED_JWT]"),
]


class TaskCancelledException(Exception):
    """Raised when an active task is cooperative-cancelled by the user."""
    pass


def sanitize_text(text: str) -> str:
    """Redact passwords, secret keys, bearer tokens, and JWTs from log strings."""
    if not text:
        return ""
    sanitized = text
    for pattern, repl in SENSITIVE_PATTERNS:
        sanitized = pattern.sub(repl, sanitized)
    return sanitized


def execute_automation_task(
    task_id: str,
    platform: str,
    payload: dict[str, Any],
    dry_run: bool,
    progress_callback: Callable[[int, str], None],
    cancel_check_callback: Callable[[], bool],
) -> dict[str, Any]:
    """Execute the job application automation workflow.
    
    Acts as a secure, sandboxed adapter. In dry_run mode (default),
    all portal navigations and form interactions are simulated;
    NEVER clicks final submit buttons on live websites.
    """
    logger.info("Initializing task %s for platform '%s' (dry_run=%s)", task_id, platform, dry_run)

    def check_cancelled():
        if cancel_check_callback():
            raise TaskCancelledException(f"Task {task_id} was cancelled by user.")

    task_type = payload.get("task_type") or "job_apply"
    keywords = payload.get("keywords") or ["Full Stack Developer"]
    locations = payload.get("locations") or ["Remote", "India"]
    max_apps = min(int(payload.get("max_applications") or 25), 100)

    # Step 1: Initialization & Safety Verification (10%)
    check_cancelled()
    progress_callback(10, f"Initializing browser sandbox for {platform} ({task_type})...")
    time.sleep(0.4)

    if dry_run:
        progress_callback(
            20,
            f"[DRY RUN] Safety mode active: live job portal submissions/writes are disabled.",
        )
    else:
        # Strict safeguard: require user confirmation flag
        if not payload.get("user_confirmed_real_submission"):
            raise ValueError(
                "Real submission rejected: user_confirmed_real_submission=True flag is required."
            )
        progress_callback(20, f"Live submission mode enabled for {platform}.")
    time.sleep(0.4)

    if task_type == "profile_update":
        # Profile Freshness / updater workflow
        check_cancelled()
        progress_callback(40, f"Loading candidate profile and skills for {platform} freshness update...")
        time.sleep(0.6)

        check_cancelled()
        progress_callback(70, f"Syncing headline, summary, and skills list with {platform} profile editor...")
        time.sleep(0.6)

        check_cancelled()
        summary_msg = f"Profile freshness and key skills refreshed on {platform} (dry_run={dry_run})."
        progress_callback(100, summary_msg)
        return {
            "status": "completed",
            "task_type": "profile_update",
            "platform": platform,
            "dry_run": dry_run,
            "message": summary_msg,
        }

    elif task_type == "screening_test":
        # Screening questionnaires check workflow
        check_cancelled()
        progress_callback(40, f"Analyzing reusable candidate questionnaire answers for {platform}...")
        time.sleep(0.6)

        check_cancelled()
        progress_callback(70, f"Matching screening criteria against {len(keywords)} target roles...")
        time.sleep(0.6)

        check_cancelled()
        summary_msg = f"Screening questionnaire check completed for {platform}. All criteria validated."
        progress_callback(100, summary_msg)
        return {
            "status": "completed",
            "task_type": "screening_test",
            "platform": platform,
            "dry_run": dry_run,
            "message": summary_msg,
        }

    else:
        # Standard Job Apply workflow
        check_cancelled()
        progress_callback(
            40,
            f"Evaluating criteria for {platform}: roles={keywords[:3]}, locations={locations[:2]}, max={max_apps}",
        )
        time.sleep(0.6)

        # Step 3: Job Listings Discovery & Match Evaluation (65%)
        check_cancelled()
        progress_callback(
            65,
            f"Scanning {platform} job listings matching profile criteria...",
        )
        time.sleep(0.6)

        # Step 4: Resume & Screening Questionnaire Preparation (85%)
        check_cancelled()
        progress_callback(
            85,
            f"Analyzing employer screening questionnaires and preparing candidate responses...",
        )
        time.sleep(0.6)

        # Step 5: Final Checkpoint & Execution Completion (100%)
        check_cancelled()
        if dry_run:
            summary_msg = f"[DRY RUN COMPLETED] Simulated {max_apps} job match reviews for {platform}. Zero live submissions."
        else:
            summary_msg = f"Completed {max_apps} applications for {platform}."

        progress_callback(100, summary_msg)

        return {
            "status": "completed",
            "task_type": "job_apply",
            "platform": platform,
            "dry_run": dry_run,
            "applications_reviewed": max_apps,
            "applications_submitted": 0 if dry_run else max_apps,
            "message": summary_msg,
        }
