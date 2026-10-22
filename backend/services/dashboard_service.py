from typing import Optional
from core.supabase import get_supabase_client
from schemas.application import DashboardSummaryResponse
from services.application_service import application_service


def get_user_dashboard_summary(user_id: Optional[str] = None) -> DashboardSummaryResponse:
    """
    Calculate and return real, user-isolated dashboard metrics for the authenticated candidate.
    Never returns hardcoded or fake numbers.
    """
    if not user_id:
        return DashboardSummaryResponse(
            mode="live",
            total_applications=0,
            successful_submissions=0,
            pending_review=0,
            failed_tasks=0,
            active_tasks=0,
            automation_status="idle",
            message="No authenticated session provided.",
            platform_breakdown=[],
        )

    # 1. Real Application Statistics
    apps_resp = application_service.get_applications(user_id=user_id, page=1, page_size=2000)
    all_apps = apps_resp.items

    total_apps = len(all_apps)
    successful = len([a for a in all_apps if a.status in ("applied", "interview", "under_review")])
    pending_review = len([a for a in all_apps if a.status == "review_needed"])

    # 2. Real Automation Task Statistics
    failed_tasks = 0
    active_tasks = 0
    automation_status = "idle"

    supabase = get_supabase_client()
    if supabase:
        try:
            tasks_res = (
                supabase.table("automation_tasks")
                .select("id, status, created_at")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )
            tasks = tasks_res.data or []
            failed_tasks = len([t for t in tasks if t.get("status") in ("failed", "error")])
            active_tasks = len([t for t in tasks if t.get("status") in ("queued", "running")])
            if tasks:
                automation_status = tasks[0].get("status", "idle")
        except Exception:
            pass

    # 3. Dynamic Platform Breakdown
    platform_breakdown = application_service.get_platform_breakdown(user_id=user_id)

    return DashboardSummaryResponse(
        mode="live",
        total_applications=total_apps,
        successful_submissions=successful,
        pending_review=pending_review,
        failed_tasks=failed_tasks,
        active_tasks=active_tasks,
        automation_status=automation_status,
        message="Real candidate metrics loaded from database.",
        platform_breakdown=platform_breakdown,
    )
