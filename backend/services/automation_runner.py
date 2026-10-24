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
    """Execute the job application automation workflow across target/connected platforms."""
    logger.info("Initializing task %s for platform '%s' (dry_run=%s)", task_id, platform, dry_run)

    import asyncio
    from services.platform_automation.runner import run_platform_automation_task

    def check_cancelled():
        if cancel_check_callback():
            raise TaskCancelledException(f"Task {task_id} was cancelled by user.")

    check_cancelled()

    task_type = payload.get("task_type") or "job_apply"
    user_id = payload.get("user_id") or "0ff8ac23-96d8-419e-9cff-ffd3b3430f17"

    record = {
        "id": task_id,
        "user_id": user_id,
        "platform": platform,
        "task_type": task_type,
        "dry_run": dry_run,
        "payload": payload,
    }

    def update_task_state(status_val: str, progress_val: int, message_val: str, **kwargs):
        progress_callback(progress_val, message_val)
        check_cancelled()


    # Run the real platform automation task
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    if loop.is_running():
        # If in an active event loop, execute synchronously or schedule
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(
                asyncio.run,
                run_platform_automation_task(
                    task_id=task_id,
                    user_id=user_id,
                    record=record,
                    update_task_state=update_task_state,
                    is_cancelled=cancel_check_callback,
                )
            )
            future.result()
    else:
        loop.run_until_complete(
            run_platform_automation_task(
                task_id=task_id,
                user_id=user_id,
                record=record,
                update_task_state=update_task_state,
                is_cancelled=cancel_check_callback,
            )
        )

    return {
        "status": "completed",
        "task_type": task_type,
        "platform": platform,
        "dry_run": dry_run,
        "applications_submitted": 0,
        "message": f"Successfully completed automation task for {platform}.",
    }

