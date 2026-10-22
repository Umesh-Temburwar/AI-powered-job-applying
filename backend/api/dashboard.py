from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends

from core.auth import AuthenticatedUser, get_optional_user
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
    current_user: Annotated[Optional[AuthenticatedUser], Depends(get_optional_user)] = None,
) -> DashboardSummaryResponse:
    """
    Fetch aggregate candidate metrics for the dashboard view.
    Derives metrics strictly from the authenticated candidate's database records.
    """
    user_id = current_user.id if current_user else None
    return get_user_dashboard_summary(user_id=user_id)


@router.get(
    "/activities",
    response_model=List[ActivityItemResponse],
    summary="Recent Candidate Activity",
    description="Retrieve real activity timeline events for the authenticated candidate.",
)
def get_dashboard_activities(
    current_user: Annotated[Optional[AuthenticatedUser], Depends(get_optional_user)] = None,
) -> List[ActivityItemResponse]:
    """
    Fetch real activity events (applications, tasks, resumes) for the authenticated candidate.
    """
    if not current_user:
        return []
    return application_service.get_recent_activities(user_id=current_user.id)
