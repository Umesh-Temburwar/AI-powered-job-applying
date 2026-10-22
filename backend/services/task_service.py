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

logger = logging.getLogger("tasks")

# Thread-safe in-memory task registry for test / mock runs or fallback
_MEMORY_TASKS: dict[str, dict[str, Any]] = {}


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


async def enqueue_task(user_id: str, request: TaskCreateRequest) -> TaskResponse:
    """Enqueue a new automation task.
    
    Prevents duplicate active tasks for the same user unless forced.
    Never trusts client-supplied user IDs.
    """
    settings = get_settings()
    is_mock_user = user_id.startswith("usr_")

    client = _get_supabase_client() if not is_mock_user else None

    # 1. Duplicate check: verify no active task is running or queued
    if not request.force:
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
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail={
                            "code": "DUPLICATE_TASK",
                            "message": "An automation task is already active (queued or running). Please wait for completion or cancel it before starting a new run.",
                            "active_task_id": res.data[0]["id"],
                        },
                    )
            except HTTPException:
                raise
            except Exception as e:
                logger.error("Error querying duplicate tasks: %s", e)
        else:
            # Memory store check
            for t in _MEMORY_TASKS.values():
                if t["user_id"] == user_id and t["status"] in ["queued", "running"]:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail={
                            "code": "DUPLICATE_TASK",
                            "message": "An automation task is already active (queued or running).",
                            "active_task_id": t["id"],
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

    # 3. Persist to Supabase or Memory
    if client:
        try:
            res = client.table("automation_tasks").insert(record).execute()
            if not res.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Database failed to insert new task.",
                )
            return _format_task_dict(res.data[0])
        except HTTPException:
            raise
        except Exception as exc:
            logger.error("Supabase task enqueue failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to enqueue task into database: {str(exc)}",
            ) from exc

    # Memory fallback
    _MEMORY_TASKS[task_id] = record
    return _format_task_dict(record)


async def list_user_tasks(
    user_id: str, limit: int = 50, offset: int = 0
) -> TaskListResponse:
    """Retrieve all automation tasks belonging strictly to the authenticated user."""
    is_mock_user = user_id.startswith("usr_")
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
            logger.error("Failed to query user tasks from Supabase: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not retrieve task list.",
            ) from exc

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
    is_mock_user = user_id.startswith("usr_")
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
            if not res.data or len(res.data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Task with ID '{task_id}' was not found.",
                )
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
            logger.error("Error retrieving task %s: %s", task_id, exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not retrieve task record.",
            ) from exc

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
    is_mock_user = user_id.startswith("usr_")
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
            if not res.data or len(res.data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Task with ID '{task_id}' was not found.",
                )
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

            update_res = (
                client.table("automation_tasks")
                .update(
                    {
                        "status": "cancelled",
                        "cancelled_at": now_iso,
                        "completed_at": now_iso,
                        "message": "Task was cancelled by user.",
                    }
                )
                .eq("id", task_id)
                .execute()
            )
            return TaskActionResponse(
                success=True,
                task_id=task_id,
                status="cancelled",
                message="Task cancellation confirmed.",
            )
        except HTTPException:
            raise
        except Exception as exc:
            logger.error("Failed to cancel task %s: %s", task_id, exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not cancel task.",
            ) from exc

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
    return TaskActionResponse(
        success=True,
        task_id=task_id,
        status="cancelled",
        message="Task cancellation confirmed.",
    )


async def retry_task(task_id: str, user_id: str) -> TaskActionResponse:
    """Re-enqueue an eligible failed task for retry."""
    is_mock_user = user_id.startswith("usr_")
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
            if not res.data or len(res.data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Task with ID '{task_id}' was not found.",
                )
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

            update_res = (
                client.table("automation_tasks")
                .update(
                    {
                        "status": "queued",
                        "progress": 0,
                        "retry_count": retry_count + 1,
                        "error_details": None,
                        "completed_at": None,
                        "cancelled_at": None,
                        "message": f"Retry #{retry_count + 1} queued for execution",
                    }
                )
                .eq("id", task_id)
                .execute()
            )
            return TaskActionResponse(
                success=True,
                task_id=task_id,
                status="queued",
                message=f"Task re-enqueued for retry attempt #{retry_count + 1}.",
            )
        except HTTPException:
            raise
        except Exception as exc:
            logger.error("Failed to retry task %s: %s", task_id, exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not retry task.",
            ) from exc

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

    return TaskActionResponse(
        success=True,
        task_id=task_id,
        status="queued",
        message=f"Task re-enqueued for retry attempt #{retry_count + 1}.",
    )
