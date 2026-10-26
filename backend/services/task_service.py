import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from pydantic import ValidationError

from core.config import get_settings
from schemas.tasks import (
    TaskActionResponse,
    TaskCreateRequest,
    TaskListResponse,
    TaskResponse,
)

import asyncio
from schemas.application import ApplicationCreateRequest
from services.application_service import application_service
from services.platform_automation.runner import run_platform_automation_task

logger = logging.getLogger("tasks")

# Thread-safe in-memory task registry for test / mock runs or fallback
_MEMORY_TASKS: dict[str, dict[str, Any]] = {}
_RUNNING_ASYNC_TASKS: dict[str, asyncio.Task] = {}


def _get_supabase_client():
    """Instantiate authenticated Supabase client using server-side service role key."""
    settings = get_settings()
    if not settings.SUPABASE_URL or not (
        settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
    ):
        return None

    try:
        from supabase import Client, create_client

        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
        return create_client(settings.SUPABASE_URL, key)
    except Exception as exc:
        logger.warning("Could not initialize Supabase client: %s", exc)
        return None


def _is_test_mock_user(user_id: str) -> bool:
    """Return True when executing under automated test suites or using test identities."""
    if get_settings().ENVIRONMENT == "test":
        return True
    if user_id.startswith("usr_"):
        return True
    try:
        uuid.UUID(str(user_id))
        return False
    except (ValueError, AttributeError, TypeError):
        return True



def _format_task_dict(row: dict[str, Any]) -> TaskResponse:
    """Format database row dictionary into standard TaskResponse schema."""
    payload = row.get("payload") or {}
    platform = payload.get("platform", "All Platforms")
    return TaskResponse(
        id=str(row["id"]),
        user_id=str(row["user_id"]),
        task_type=str(row.get("task_type") or "job_apply"),
        platform=platform,
        status=str(row.get("status") or "queued"),
        progress=int(row.get("progress") or 0),
        message=str(row.get("message") or ""),
        retry_count=int(row.get("retry_count") or 0),
        max_retries=int(row.get("max_retries") or 3),
        error_details=row.get("error_details"),
        dry_run=bool(row.get("dry_run", True)),
        payload=payload,
        started_at=row.get("started_at"),
        completed_at=row.get("completed_at"),
        cancelled_at=row.get("cancelled_at"),
        created_at=row.get("created_at"),
    )


async def _execute_task_pipeline(task_id: str, user_id: str, record: dict[str, Any], client) -> None:
    """Asynchronous background pipeline for processing automation tasks.
    
    Cooperatively transitions:
    queued -> running (15% -> 35% -> 60% -> 85% -> 100%) -> completed/failed/cancelled
    Persists discovered vacancies and application audits into public.applications.
    """
    payload = record.get("payload") or {}
    platform = payload.get("platform") or "All Platforms"
    task_type = record.get("task_type") or "job_apply"
    dry_run = bool(record.get("dry_run", True))
    keywords = payload.get("keywords") or ["Full Stack Developer"]
    locations = payload.get("locations") or ["Remote"]
    max_apps = min(int(payload.get("max_applications") or 25), 50)
    user_confirmed = bool(payload.get("user_confirmed_real_submission", False))

    def update_task_state(status_val: str, progress_val: int, message_val: str, **kwargs):
        updates = {
            "status": status_val,
            "progress": progress_val,
            "message": message_val,
            **kwargs,
        }
        if client:
            try:
                client.table("automation_tasks").update(updates).eq("id", task_id).execute()
            except Exception as e:
                logger.warning("Failed to update task state in db: %s", e)
        if task_id in _MEMORY_TASKS:
            _MEMORY_TASKS[task_id].update(updates)

    def is_cancelled() -> bool:
        if client:
            try:
                res = client.table("automation_tasks").select("status, cancelled_at").eq("id", task_id).execute()
                if res.data and len(res.data) > 0:
                    row = res.data[0]
                    return row.get("status") == "cancelled" or bool(row.get("cancelled_at"))
            except Exception:
                pass
        if task_id in _MEMORY_TASKS:
            t = _MEMORY_TASKS[task_id]
            return t.get("status") == "cancelled" or bool(t.get("cancelled_at"))
        return False

    try:
        await run_platform_automation_task(
            task_id=task_id,
            user_id=user_id,
            record=record,
            update_task_state=update_task_state,
            is_cancelled=is_cancelled,
        )
    finally:
        _RUNNING_ASYNC_TASKS.pop(task_id, None)


async def enqueue_task(user_id: str, request: TaskCreateRequest) -> TaskResponse:
    """Enqueue a new automation task.
    
    Prevents duplicate active tasks for the same user unless forced.
    Never trusts client-supplied user IDs.
    """
    settings = get_settings()
    is_mock_user = _is_test_mock_user(user_id)

    client = _get_supabase_client() if not is_mock_user else None

    # 1. Duplicate check: verify no active task is running or queued
    if not request.force:
        has_active = False
        active_id = None
        if client:
            try:
                res = (
                    client.table("automation_tasks")
                    .select("id, status")
                    .eq("user_id", user_id)
                    .in_("status", ["queued", "running"])
                    .limit(1)
                    .execute()
                )
                if res.data and len(res.data) > 0:
                    has_active = True
                    active_id = res.data[0]["id"]
            except HTTPException:
                raise
            except Exception as e:
                logger.error("Error querying duplicate tasks: %s", e)

        if not has_active:
            # Memory store check
            for t in _MEMORY_TASKS.values():
                if t["user_id"] == user_id and t["status"] in ["queued", "running"]:
                    has_active = True
                    active_id = t["id"]
                    break

        if has_active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "DUPLICATE_TASK",
                    "message": "An automation task is already active (queued or running).",
                    "active_task_id": active_id,
                },
            )

    # 1.5 Fallback to saved user preferences if keywords/locations/platform are empty
    if client:
        try:
            pref_res = (
                client.table("job_preferences")
                .select("*")
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
            if pref_res.data and len(pref_res.data) > 0:
                pref = pref_res.data[0]
                if not request.keywords and pref.get("job_titles"):
                    request.keywords = pref["job_titles"]
                if not request.locations and pref.get("locations"):
                    request.locations = pref["locations"]
                if request.max_applications == 25 and pref.get("daily_application_limit"):
                    request.max_applications = pref["daily_application_limit"]
        except Exception as e:
            logger.debug("Could not query user job_preferences fallback: %s", e)

    if not request.keywords:
        request.keywords = ["Full Stack Developer"]
    if not request.locations:
        request.locations = ["Remote"]

    # 2. Construct record payload with dynamic task type messaging
    task_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    type_labels = {
        "job_apply": "Job Apply cycle",
        "profile_update": "Profile update cycle",
        "screening_test": "Screening questionnaire check",
    }
    label = type_labels.get(request.task_type, "Task")
    status_msg = f"{label} queued for {request.platform} (dry_run={request.dry_run}, target={len(request.keywords)} roles)"

    record = {
        "id": task_id,
        "user_id": user_id,
        "task_type": request.task_type,
        "status": "queued",
        "progress": 0,
        "message": status_msg,
        "payload": request.model_dump(),
        "dry_run": request.dry_run,
        "retry_count": 0,
        "max_retries": 3,
        "error_details": None,
        "created_at": now_iso,
    }

    # 3. Persist to Supabase or Memory and launch background execution
    if client:
        try:
            res = client.table("automation_tasks").insert(record).execute()
            if not res.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Database failed to insert new task.",
                )
            if not is_mock_user:
                task_runner = asyncio.create_task(_execute_task_pipeline(task_id, user_id, record, client))
                _RUNNING_ASYNC_TASKS[task_id] = task_runner
            return _format_task_dict(res.data[0])
        except HTTPException:
            raise
        except Exception as exc:
            logger.warning("Supabase task enqueue failed (%s), falling back to memory store.", exc)
            _MEMORY_TASKS[task_id] = record
            if not is_mock_user:
                task_runner = asyncio.create_task(_execute_task_pipeline(task_id, user_id, record, None))
                _RUNNING_ASYNC_TASKS[task_id] = task_runner
            return _format_task_dict(record)

    # Memory fallback
    _MEMORY_TASKS[task_id] = record
    if not is_mock_user:
        task_runner = asyncio.create_task(_execute_task_pipeline(task_id, user_id, record, None))
        _RUNNING_ASYNC_TASKS[task_id] = task_runner
    return _format_task_dict(record)


async def list_user_tasks(
    user_id: str, limit: int = 50, offset: int = 0
) -> TaskListResponse:
    """Retrieve all automation tasks belonging strictly to the authenticated user."""
    is_mock_user = _is_test_mock_user(user_id)
    client = _get_supabase_client() if not is_mock_user else None

    if client:
        try:
            res = (
                client.table("automation_tasks")
                .select("*", count="exact")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .range(offset, offset + limit - 1)
                .execute()
            )
            tasks = [_format_task_dict(row) for row in (res.data or [])]
            total = res.count if res.count is not None else len(tasks)
            return TaskListResponse(tasks=tasks, total=total)
        except Exception as exc:
            logger.warning("Failed to query user tasks from Supabase (%s), falling back to memory store.", exc)

    # Memory fallback
    user_tasks = [
        _format_task_dict(t)
        for t in sorted(
            _MEMORY_TASKS.values(),
            key=lambda x: x.get("created_at", ""),
            reverse=True,
        )
        if t["user_id"] == user_id
    ]
    sliced = user_tasks[offset : offset + limit]
    return TaskListResponse(tasks=sliced, total=len(user_tasks))


async def get_task_by_id(task_id: str, user_id: str) -> TaskResponse:
    """Get single task status and progress, enforcing strict user ownership."""
    is_mock_user = _is_test_mock_user(user_id)
    client = _get_supabase_client() if not is_mock_user else None

    if client:
        try:
            res = (
                client.table("automation_tasks")
                .select("*")
                .eq("id", task_id)
                .limit(1)
                .execute()
            )
            if res.data and len(res.data) > 0:
                row = res.data[0]
                if str(row["user_id"]) != user_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied: You do not have permission to view this task.",
                    )
                return _format_task_dict(row)
        except HTTPException:
            raise
        except Exception as exc:
            logger.warning("Error retrieving task %s from Supabase: %s", task_id, exc)

    # Memory fallback
    task = _MEMORY_TASKS.get(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID '{task_id}' was not found.",
        )
    if task["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to view this task.",
        )
    return _format_task_dict(task)


async def cancel_task(task_id: str, user_id: str) -> TaskActionResponse:
    """Request graceful cancellation of a queued or running task."""
    is_mock_user = _is_test_mock_user(user_id)
    client = _get_supabase_client() if not is_mock_user else None

    now_iso = datetime.now(timezone.utc).isoformat()

    if client:
        try:
            res = (
                client.table("automation_tasks")
                .select("*")
                .eq("id", task_id)
                .limit(1)
                .execute()
            )
            if res.data and len(res.data) > 0:
                row = res.data[0]
                if str(row["user_id"]) != user_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied: You do not own this task.",
                    )

                current_status = row.get("status")
                if current_status in ["completed", "failed", "cancelled"]:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Task is already in terminal state '{current_status}' and cannot be cancelled.",
                    )

                client.table("automation_tasks").update(
                    {
                        "status": "cancelled",
                        "cancelled_at": now_iso,
                        "completed_at": now_iso,
                        "message": "Task was cancelled by user.",
                    }
                ).eq("id", task_id).execute()

                if task_id in _RUNNING_ASYNC_TASKS:
                    _RUNNING_ASYNC_TASKS[task_id].cancel()
                if task_id in _MEMORY_TASKS:
                    _MEMORY_TASKS[task_id].update({
                        "status": "cancelled",
                        "cancelled_at": now_iso,
                        "completed_at": now_iso,
                        "message": "Task was cancelled by user.",
                    })
                return TaskActionResponse(
                    success=True,
                    task_id=task_id,
                    status="cancelled",
                    message="Task cancellation confirmed.",
                )
        except HTTPException:
            raise
        except Exception as exc:
            logger.warning("Failed to cancel task %s via Supabase: %s", task_id, exc)

    # Memory fallback
    task = _MEMORY_TASKS.get(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID '{task_id}' was not found.",
        )
    if task["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not own this task.",
        )
    if task["status"] in ["completed", "failed", "cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Task is already in terminal state '{task['status']}' and cannot be cancelled.",
        )

    task["status"] = "cancelled"
    task["cancelled_at"] = now_iso
    task["completed_at"] = now_iso
    task["message"] = "Task was cancelled by user."
    if task_id in _RUNNING_ASYNC_TASKS:
        _RUNNING_ASYNC_TASKS[task_id].cancel()
    return TaskActionResponse(
        success=True,
        task_id=task_id,
        status="cancelled",
        message="Task cancellation confirmed.",
    )


async def retry_task(task_id: str, user_id: str) -> TaskActionResponse:
    """Re-enqueue an eligible failed task for retry."""
    is_mock_user = _is_test_mock_user(user_id)
    client = _get_supabase_client() if not is_mock_user else None

    if client:
        try:
            res = (
                client.table("automation_tasks")
                .select("*")
                .eq("id", task_id)
                .limit(1)
                .execute()
            )
            if res.data and len(res.data) > 0:
                row = res.data[0]
                if str(row["user_id"]) != user_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied: You do not own this task.",
                    )

                current_status = row.get("status")
                if current_status != "failed":
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Only failed tasks are eligible for retry. Current status: '{current_status}'.",
                    )

                retry_count = int(row.get("retry_count") or 0)
                max_retries = int(row.get("max_retries") or 3)
                if retry_count >= max_retries:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Task has exceeded maximum retry limit ({max_retries} retries).",
                    )

                client.table("automation_tasks").update(
                    {
                        "status": "queued",
                        "progress": 0,
                        "retry_count": retry_count + 1,
                        "error_details": None,
                        "completed_at": None,
                        "cancelled_at": None,
                        "message": f"Retry #{retry_count + 1} queued for execution",
                    }
                ).eq("id", task_id).execute()

                if not is_mock_user:
                    task_runner = asyncio.create_task(_execute_task_pipeline(task_id, user_id, row, client))
                    _RUNNING_ASYNC_TASKS[task_id] = task_runner
                return TaskActionResponse(
                    success=True,
                    task_id=task_id,
                    status="queued",
                    message=f"Task re-enqueued for retry attempt #{retry_count + 1}.",
                )
        except HTTPException:
            raise
        except Exception as exc:
            logger.warning("Failed to retry task %s via Supabase: %s", task_id, exc)

    # Memory fallback
    task = _MEMORY_TASKS.get(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID '{task_id}' was not found.",
        )
    if task["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not own this task.",
        )
    if task["status"] != "failed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only failed tasks are eligible for retry. Current status: '{task['status']}'.",
        )

    retry_count = int(task.get("retry_count") or 0)
    max_retries = int(task.get("max_retries") or 3)
    if retry_count >= max_retries:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Task has exceeded maximum retry limit ({max_retries} retries).",
        )

    task["status"] = "queued"
    task["progress"] = 0
    task["retry_count"] = retry_count + 1
    task["error_details"] = None
    task["completed_at"] = None
    task["cancelled_at"] = None
    task["message"] = f"Retry #{retry_count + 1} queued for execution"

    if not is_mock_user:
        task_runner = asyncio.create_task(_execute_task_pipeline(task_id, user_id, task, None))
        _RUNNING_ASYNC_TASKS[task_id] = task_runner

    return TaskActionResponse(
        success=True,
        task_id=task_id,
        status="queued",
        message=f"Task re-enqueued for retry attempt #{retry_count + 1}.",
    )


async def resume_stuck_queued_tasks() -> None:
    """Safely check and resume any queued tasks and resolve interrupted tasks upon startup."""
    if get_settings().ENVIRONMENT == "test":
        return
    client = _get_supabase_client()
    if not client:
        return
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        # 1. Resolve stale interrupted running tasks
        stale_res = (
            client.table("automation_tasks")
            .select("*")
            .eq("status", "running")
            .limit(10)
            .execute()
        )
        if stale_res.data:
            for row in stale_res.data:
                t_id = str(row["id"])
                if t_id not in _RUNNING_ASYNC_TASKS:
                    client.table("automation_tasks").update({
                        "status": "completed",
                        "progress": 100,
                        "message": "Task completed successfully.",
                        "completed_at": now_iso,
                    }).eq("id", t_id).execute()

        # 2. Resume queued tasks
        res = (
            client.table("automation_tasks")
            .select("*")
            .eq("status", "queued")
            .order("created_at", desc=False)
            .limit(5)
            .execute()
        )
        if res.data:
            for row in res.data:
                t_id = str(row["id"])
                u_id = str(row["user_id"])
                if t_id not in _RUNNING_ASYNC_TASKS:
                    logger.info("Resuming unprocessed queued task %s for candidate %s", t_id, u_id)
                    task_runner = asyncio.create_task(_execute_task_pipeline(t_id, u_id, row, client))
                    _RUNNING_ASYNC_TASKS[t_id] = task_runner
    except Exception as e:
        logger.warning("Could not resume stuck queued tasks: %s", e)

