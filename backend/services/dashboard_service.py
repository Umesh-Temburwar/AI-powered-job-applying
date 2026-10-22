from schemas.dashboard import DashboardSummary


def get_demo_summary() -> DashboardSummary:
    """
    Generate Phase 3 demonstration summary metrics for the candidate dashboard.

    ARCHITECTURAL SEAM NOTICE:
    This function acts as the explicit architectural seam. Phase 4 will replace
    this implementation with authenticated, per-user aggregations queried from
    Supabase PostgreSQL under strict Row Level Security (RLS) policies.
    It deliberately does NOT access shared global JSON or CSV files.
    """
    return DashboardSummary(
        mode="demo",
        total_applications=114,
        pending_review=11,
        failed_tasks=5,
        automation_status="idle",
        message="Sample values returned by FastAPI backend skeleton. Live Supabase database integration is not configured yet.",
    )
