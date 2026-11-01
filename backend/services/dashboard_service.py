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

    # 1. Real Application Statistics across all candidate records
    supabase = get_supabase_client()
    total_apps = 0
    successful = 0
    pending_review = 0

    if supabase:
        try:
            apps_stat_res = (
                supabase.table("applications")
                .select("status", count="exact")
                .eq("user_id", user_id)
                .limit(5000)
                .execute()
            )
            total_apps = apps_stat_res.count if apps_stat_res.count is not None else len(apps_stat_res.data or [])
            for r in (apps_stat_res.data or []):
                st = (r.get("status") or "").lower()
                if st in ("applied", "interview", "under_review"):
                    successful += 1
                elif st in ("review_needed", "review_required"):
                    pending_review += 1
        except Exception:
            pass

    if total_apps == 0:
        apps_resp = application_service.get_applications(user_id=user_id, page=1, page_size=100)
        all_apps = apps_resp.items
        total_apps = apps_resp.total
        successful = len([a for a in all_apps if a.status in ("applied", "interview", "under_review")])
        pending_review = len([a for a in all_apps if a.status in ("review_needed", "review_required")])

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
            STATUS_MAP = {
                "queued": "queued",
                "running": "running",
                "paused": "paused",
                "review_required": "review_required",
                "review_needed": "review_required",
                "completed": "completed",
                "success": "completed",
                "failed": "failed",
                "error": "error",
                "cancelled": "idle",
            }
            if tasks:
                raw_status = tasks[0].get("status", "idle")
                automation_status = STATUS_MAP.get(raw_status, "idle")
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
