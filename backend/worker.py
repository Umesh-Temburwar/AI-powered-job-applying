"""
Universal Job Apply Bot — Background Task Automation Worker
Phase 6: Reliable Task Queue & Background Worker Architecture

Usage:
    python worker.py
    or
    python -m worker
"""

import logging
import os
import signal
import sys
import time
import uuid
from datetime import datetime, timezone

# Ensure backend root is in Python module path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.config import get_settings
from services.automation_runner import (
    TaskCancelledException,
    execute_automation_task,
    sanitize_text,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [Worker] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("worker")

POLL_INTERVAL_SECONDS = 2.0
MAX_BACKOFF_SECONDS = 30.0


class AutomationWorker:
    """Background automation task worker claiming and executing queue jobs."""

    def __init__(self, worker_id: str | None = None):
        self.worker_id = worker_id or f"worker_{uuid.uuid4().hex[:8]}"
        self.running = False
        self.settings = get_settings()
        self._supabase = self._init_supabase()

    def _init_supabase(self):
        """Initialize privileged Supabase client for worker task claiming."""
        if not self.settings.SUPABASE_URL or not (
            self.settings.SUPABASE_SERVICE_ROLE_KEY or self.settings.SUPABASE_ANON_KEY
        ):
            logger.warning("Supabase credentials not configured in backend environment.")
            return None

        try:
            from supabase import create_client

            key = (
                self.settings.SUPABASE_SERVICE_ROLE_KEY
                or self.settings.SUPABASE_ANON_KEY
            )
            return create_client(self.settings.SUPABASE_URL, key)
        except Exception as exc:
            logger.error("Failed to initialize Supabase client: %s", exc)
            return None

    def claim_task(self) -> dict | None:
        """Atomically claim the next queued task from PostgreSQL."""
        if not self._supabase:
            return None

        try:
            # Call atomic claim stored procedure
            res = self._supabase.rpc(
                "claim_next_task", {"p_worker_id": self.worker_id}
            ).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
            return None
        except Exception as exc:
            # If stored procedure call fails, fallback to service_role atomic update
            logger.debug("RPC claim_next_task unavailable (%s), trying direct update fallback...", exc)
            try:
                queued = (
                    self._supabase.table("automation_tasks")
                    .select("*")
                    .eq("status", "queued")
                    .order("created_at", desc=False)
                    .limit(1)
                    .execute()
                )
                if queued.data and len(queued.data) > 0:
                    task_id = queued.data[0]["id"]
                    now_iso = datetime.now(timezone.utc).isoformat()
                    updated = (
                        self._supabase.table("automation_tasks")
                        .update(
                            {
                                "status": "running",
                                "worker_id": self.worker_id,
                                "locked_at": now_iso,
                                "started_at": now_iso,
                                "message": "Task claimed by worker",
                            }
                        )
                        .eq("id", task_id)
                        .eq("status", "queued")
                        .execute()
                    )
                    if updated.data and len(updated.data) > 0:
                        return updated.data[0]
            except Exception as inner_exc:
                logger.error("Direct claim fallback failed: %s", inner_exc)
            return None

    def update_task_progress(self, task_id: str, progress: int, message: str):
        """Update task progress percentage and status message."""
        if not self._supabase:
            return

        now_iso = datetime.now(timezone.utc).isoformat()
        sanitized_msg = sanitize_text(message)
        try:
            self._supabase.table("automation_tasks").update(
                {
                    "progress": progress,
                    "message": sanitized_msg,
                    "locked_at": now_iso,
                }
            ).eq("id", task_id).execute()
        except Exception as exc:
            logger.warning("Failed to update progress for %s: %s", task_id, exc)

    def is_task_cancelled(self, task_id: str) -> bool:
        """Check if task was marked cancelled by user in database."""
        if not self._supabase:
            return False

        try:
            res = (
                self._supabase.table("automation_tasks")
                .select("status, cancelled_at")
                .eq("id", task_id)
                .limit(1)
                .execute()
            )
            if res.data and len(res.data) > 0:
                row = res.data[0]
                return row.get("status") == "cancelled" or bool(row.get("cancelled_at"))
            return False
        except Exception:
            return False

    def mark_completed(self, task_id: str, summary_message: str):
        """Mark task as successfully completed."""
        if not self._supabase:
            return

        now_iso = datetime.now(timezone.utc).isoformat()
        try:
            self._supabase.table("automation_tasks").update(
                {
                    "status": "completed",
                    "progress": 100,
                    "completed_at": now_iso,
                    "message": sanitize_text(summary_message),
                }
            ).eq("id", task_id).execute()
            logger.info("Task %s completed successfully.", task_id)
        except Exception as exc:
            logger.error("Failed to mark task %s completed: %s", task_id, exc)

    def mark_failed(self, task_id: str, error_msg: str, retry_count: int, max_retries: int):
        """Mark task as failed or schedule for retry with exponential backoff."""
        if not self._supabase:
            return

        now_iso = datetime.now(timezone.utc).isoformat()
        sanitized_err = sanitize_text(error_msg)

        if retry_count < max_retries:
            next_retry = retry_count + 1
            backoff_delay = min(2.0 ** next_retry, MAX_BACKOFF_SECONDS)
            logger.warning(
                "Task %s failed. Re-queueing retry #%s (backoff: %.1fs): %s",
                task_id,
                next_retry,
                backoff_delay,
                sanitized_err,
            )
            try:
                self._supabase.table("automation_tasks").update(
                    {
                        "status": "queued",
                        "retry_count": next_retry,
                        "error_details": sanitized_err,
                        "message": f"Retry #{next_retry} queued (previous error: {sanitized_err})",
                    }
                ).eq("id", task_id).execute()
            except Exception as exc:
                logger.error("Failed to re-queue retry for task %s: %s", task_id, exc)
        else:
            logger.error("Task %s reached max retries (%s). Marking failed: %s", task_id, max_retries, sanitized_err)
            try:
                self._supabase.table("automation_tasks").update(
                    {
                        "status": "failed",
                        "completed_at": now_iso,
                        "error_details": sanitized_err,
                        "message": f"Task execution failed: {sanitized_err}",
                    }
                ).eq("id", task_id).execute()
            except Exception as exc:
                logger.error("Failed to mark task %s failed: %s", task_id, exc)

    def mark_cancelled(self, task_id: str):
        """Acknowledge task cancellation."""
        if not self._supabase:
            return

        now_iso = datetime.now(timezone.utc).isoformat()
        try:
            self._supabase.table("automation_tasks").update(
                {
                    "status": "cancelled",
                    "cancelled_at": now_iso,
                    "completed_at": now_iso,
                    "message": "Task cancelled by user.",
                }
            ).eq("id", task_id).execute()
            logger.info("Task %s was marked cancelled.", task_id)
        except Exception as exc:
            logger.error("Failed to mark task %s cancelled: %s", task_id, exc)

    def process_task(self, task: dict):
        """Execute a single claimed automation task."""
        task_id = task["id"]
        platform = (task.get("payload") or {}).get("platform") or "All Platforms"
        dry_run = bool(task.get("dry_run", True))
        payload = dict(task.get("payload") or {})
        payload["task_type"] = task.get("task_type") or payload.get("task_type") or "job_apply"
        retry_count = int(task.get("retry_count") or 0)
        max_retries = int(task.get("max_retries") or 3)

        logger.info(
            "Processing task %s (platform: %s, dry_run: %s, retry: %s/%s)...",
            task_id,
            platform,
            dry_run,
            retry_count,
            max_retries,
        )

        try:
            result = execute_automation_task(
                task_id=task_id,
                platform=platform,
                payload=payload,
                dry_run=dry_run,
                progress_callback=lambda p, m: self.update_task_progress(task_id, p, m),
                cancel_check_callback=lambda: self.is_task_cancelled(task_id),
            )
            self.mark_completed(task_id, result.get("message", "Completed successfully."))
        except TaskCancelledException:
            logger.info("Task %s was cancelled during execution.", task_id)
            self.mark_cancelled(task_id)
        except Exception as exc:
            logger.exception("Error executing task %s: %s", task_id, exc)
            self.mark_failed(task_id, str(exc), retry_count, max_retries)

    def run(self):
        """Main polling and task execution loop."""
        self.running = True
        logger.info("Starting Automation Worker [%s]...", self.worker_id)
        logger.info("Polling for queued tasks every %.1fs...", POLL_INTERVAL_SECONDS)

        while self.running:
            try:
                task = self.claim_task()
                if task:
                    self.process_task(task)
                else:
                    time.sleep(POLL_INTERVAL_SECONDS)
            except KeyboardInterrupt:
                logger.info("Worker interrupted by user.")
                break
            except Exception as exc:
                logger.error("Unexpected worker loop exception: %s", exc)
                time.sleep(POLL_INTERVAL_SECONDS)

        logger.info("Automation Worker [%s] shut down cleanly.", self.worker_id)

    def stop(self):
        """Request graceful shutdown of the worker process."""
        logger.info("Graceful shutdown requested for worker [%s]...", self.worker_id)
        self.running = False


def main():
    worker = AutomationWorker()

    def handle_signal(sig, frame):
        logger.info("Received termination signal (%s). Shutting down worker...", sig)
        worker.stop()

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    worker.run()


if __name__ == "__main__":
    main()
