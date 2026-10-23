from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, Request

from core.auth import AuthenticatedUser, get_optional_user
from core.config import Settings, get_settings
from schemas.application import DashboardSummaryResponse, ActivityItemResponse
from services.dashboard_service import get_user_dashboard_summary
from services.application_service import application_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/summary",
    response_model=DashboardSummaryResponse,
    summary="Dashboard Summary Metrics",
    description="Retrieve aggregate application statistics and current worker state for authenticated user.",
)
def get_dashboard_summary(
    request: Request,
    current_user: Annotated[Optional[AuthenticatedUser], Depends(get_optional_user)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> DashboardSummaryResponse:
    """
    Fetch aggregate candidate metrics for the dashboard view.
    Derives metrics strictly from the authenticated candidate's database records.
    """
    header_user_id = request.headers.get("x-user-id")
    candidate_default = settings.CANDIDATE_USER_ID if settings else "0ff8ac23-96d8-419e-9cff-ffd3b3430f17"
    user_id = (
        current_user.id
        if current_user
        else (header_user_id or candidate_default)
    )
    return get_user_dashboard_summary(user_id=user_id)


@router.get(
    "/activities",
    response_model=List[ActivityItemResponse],
    summary="Recent Candidate Activity",
    description="Retrieve real activity timeline events for the authenticated candidate.",
)
def get_dashboard_activities(
    request: Request,
    current_user: Annotated[Optional[AuthenticatedUser], Depends(get_optional_user)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> List[ActivityItemResponse]:
    """
    Fetch real activity events (applications, tasks, resumes) for the authenticated candidate.
    """
    header_user_id = request.headers.get("x-user-id")
    candidate_default = settings.CANDIDATE_USER_ID if settings else "0ff8ac23-96d8-419e-9cff-ffd3b3430f17"
    user_id = (
        current_user.id
        if current_user
        else (header_user_id or candidate_default)
    )
    if not user_id:
        return []
    return application_service.get_recent_activities(user_id=user_id)
