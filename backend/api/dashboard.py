from fastapi import APIRouter

from schemas.dashboard import DashboardSummary
from services.dashboard_service import get_demo_summary

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/summary",
    response_model=DashboardSummary,
    summary="Dashboard Summary Metrics",
    description="Retrieve aggregate application statistics and current worker state.",
)
def get_dashboard_summary() -> DashboardSummary:
    """
    Fetch aggregate candidate metrics for the dashboard view.

    Phase 3 delivers a typed demonstration summary. In Phase 4, this endpoint
    will extract the verified Supabase JWT from request state and return real
    per-user aggregated metrics from PostgreSQL.
    """
    return get_demo_summary()
