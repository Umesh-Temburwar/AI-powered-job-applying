from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from core.auth import AuthenticatedUser, get_current_user
from schemas.tasks import (
    TaskActionResponse,
    TaskCreateRequest,
    TaskListResponse,
    TaskResponse,
)
from services.task_service import (
    cancel_task,
    enqueue_task,
    get_task_by_id,
    list_user_tasks,
    retry_task,
)

router = APIRouter(prefix="/tasks", tags=["Task Queue"])


@router.post(
    "",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Enqueue an automation task",
)
async def create_task(
    request: TaskCreateRequest,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> TaskResponse:
    """Enqueue a new automation job application task.
    
    The user ID is extracted strictly from the verified JWT access token.
    Active duplicate tasks are rejected unless explicitly forced.
    """
    return await enqueue_task(user_id=current_user.id, request=request)


@router.get(
    "",
    response_model=TaskListResponse,
    summary="List the authenticated user's tasks",
)
async def get_tasks(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> TaskListResponse:
    """List historical and active tasks belonging strictly to the requesting user."""
    return await list_user_tasks(
        user_id=current_user.id, limit=limit, offset=offset
    )


@router.get(
    "/{task_id}",
    response_model=TaskResponse,
    summary="Get task status and progress",
)
async def get_task(
    task_id: str,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> TaskResponse:
    """Retrieve execution state, progress, and messages for a specific task."""
    return await get_task_by_id(task_id=task_id, user_id=current_user.id)


@router.post(
    "/{task_id}/cancel",
    response_model=TaskActionResponse,
    summary="Request task cancellation",
)
async def cancel_task_endpoint(
    task_id: str,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> TaskActionResponse:
    """Request cooperative cancellation for an active or queued task."""
    return await cancel_task(task_id=task_id, user_id=current_user.id)


@router.post(
    "/{task_id}/retry",
    response_model=TaskActionResponse,
    summary="Retry an eligible failed task",
)
async def retry_task_endpoint(
    task_id: str,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> TaskActionResponse:
    """Re-enqueue a failed task, incrementing the retry counter up to the allowed maximum."""
    return await retry_task(task_id=task_id, user_id=current_user.id)
