import csv
import io
import math
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any

from core.supabase import get_supabase_client
from schemas.application import (
    ApplicationCreateRequest,
    ApplicationResponse,
    ApplicationListResponse,
    PlatformBreakdownItem,
    ActivityItemResponse,
)

# In-memory store fallback for test mode when Supabase client is not connected
_MEMORY_APPLICATIONS: Dict[str, List[Dict[str, Any]]] = {}

PLATFORM_COLORS: Dict[str, str] = {
    "Naukri": "bg-emerald-500",
    "Internshala": "bg-sky-500",
    "Indeed": "bg-purple-500",
    "LinkedIn": "bg-amber-500",
    "Glassdoor": "bg-teal-500",
}


def _map_row_to_application(row: dict) -> ApplicationResponse:
    return ApplicationResponse(
        id=str(row["id"]),
        user_id=str(row["user_id"]),
        task_id=str(row["task_id"]) if row.get("task_id") else None,
        job_title=row.get("job_title", ""),
        company=row.get("company", ""),
        job_url=row.get("job_url", ""),
        platform=row.get("platform", "Unknown"),
        status=row.get("status", "applied"),
        location=row.get("location"),
        salary=row.get("salary"),
        notes=row.get("notes"),
        applied_at=row.get("applied_at") or row.get("created_at"),
        created_at=row.get("created_at", datetime.now(timezone.utc).isoformat()),
        updated_at=row.get("updated_at", datetime.now(timezone.utc).isoformat()),
    )


class ApplicationService:
    def __init__(self):
        self.supabase = get_supabase_client()

    def get_applications(
        self,
        user_id: str,
        status: Optional[str] = None,
        platform: Optional[str] = None,
        query: Optional[str] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> ApplicationListResponse:
        page = max(1, page)
        page_size = max(1, min(2000, page_size))

        if self.supabase:
            try:
                sb_query = (
                    self.supabase.table("applications")
                    .select("*", count="exact")
                    .eq("user_id", user_id)
                )

                if status and status.lower() != "all":
                    sb_query = sb_query.eq("status", status)

                if platform and platform.lower() != "all":
                    sb_query = sb_query.ilike("platform", f"%{platform}%")

                if query:
                    # search job_title or company
                    sb_query = sb_query.or_(
                        f"job_title.ilike.%{query}%,company.ilike.%{query}%"
                    )

                offset = (page - 1) * page_size
                res = (
                    sb_query.order("created_at", desc=True)
                    .range(offset, offset + page_size - 1)
                    .execute()
                )

                items = [_map_row_to_application(r) for r in (res.data or [])]
                total = res.count or 0
                total_pages = math.ceil(total / page_size) if total > 0 else 0

                return ApplicationListResponse(
                    items=items,
                    total=total,
                    page=page,
                    page_size=page_size,
                    total_pages=total_pages,
                )
            except Exception:
                pass

        # Fallback to isolated user memory store
        user_apps = _MEMORY_APPLICATIONS.get(user_id, [])
        filtered = user_apps
        if status and status.lower() != "all":
            filtered = [a for a in filtered if a.get("status") == status]
        if platform and platform.lower() != "all":
            filtered = [
                a
                for a in filtered
                if platform.lower() in (a.get("platform") or "").lower()
            ]
        if query:
            q = query.lower()
            filtered = [
                a
                for a in filtered
                if q in (a.get("job_title") or "").lower()
                or q in (a.get("company") or "").lower()
            ]

        total = len(filtered)
        total_pages = math.ceil(total / page_size) if total > 0 else 0
        offset = (page - 1) * page_size
        slice_items = filtered[offset : offset + page_size]

        return ApplicationListResponse(
            items=[_map_row_to_application(r) for r in slice_items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    list_applications = get_applications

    def create_application(
        self, user_id: str, req: ApplicationCreateRequest
    ) -> ApplicationResponse:
        now_iso = datetime.now(timezone.utc).isoformat()
        app_id = str(uuid.uuid4())

        row = {
            "id": app_id,
            "user_id": user_id,
            "task_id": req.task_id,
            "job_title": req.job_title,
            "company": req.company,
            "job_url": req.job_url,
            "platform": req.platform,
            "status": req.status,
            "location": req.location,
            "salary": req.salary,
            "notes": req.notes,
            "applied_at": now_iso,
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        if self.supabase:
            try:
                res = self.supabase.table("applications").insert(row).execute()
                if res.data and len(res.data) > 0:
                    return _map_row_to_application(res.data[0])
            except Exception:
                pass

        # Fallback memory
        if user_id not in _MEMORY_APPLICATIONS:
            _MEMORY_APPLICATIONS[user_id] = []
        _MEMORY_APPLICATIONS[user_id].insert(0, row)
        return _map_row_to_application(row)

    def delete_application(self, user_id: str, application_id: str) -> bool:
        if self.supabase:
            try:
                res = (
                    self.supabase.table("applications")
                    .delete()
                    .eq("id", application_id)
                    .eq("user_id", user_id)
                    .execute()
                )
                if res.data and len(res.data) > 0:
                    return True
            except Exception:
                pass

        if user_id in _MEMORY_APPLICATIONS:
            before_len = len(_MEMORY_APPLICATIONS[user_id])
            _MEMORY_APPLICATIONS[user_id] = [
                a for a in _MEMORY_APPLICATIONS[user_id] if a["id"] != application_id
            ]
            return len(_MEMORY_APPLICATIONS[user_id]) < before_len

        return False

    def get_platform_breakdown(self, user_id: str) -> List[PlatformBreakdownItem]:
        apps = self.get_applications(user_id=user_id, page=1, page_size=1000).items
        if not apps:
            return []

        counts: Dict[str, int] = {}
        for a in apps:
            plat = a.platform.strip() if a.platform else "Other"
            counts[plat] = counts.get(plat, 0) + 1

        total = len(apps)
        breakdown: List[PlatformBreakdownItem] = []
        for plat, count in sorted(counts.items(), key=lambda x: x[1], reverse=True):
            pct = round((count / total) * 100) if total > 0 else 0
            color = PLATFORM_COLORS.get(plat, "bg-indigo-500")
            breakdown.append(
                PlatformBreakdownItem(
                    platform=plat, applied=count, percentage=pct, color=color
                )
            )

        return breakdown

    def get_recent_activities(self, user_id: str) -> List[ActivityItemResponse]:
        activities: List[Tuple[datetime, ActivityItemResponse]] = []

        # 1. Applications
        apps_resp = self.get_applications(user_id=user_id, page=1, page_size=5)
        for app in apps_resp.items:
            try:
                dt = datetime.fromisoformat(app.created_at.replace("Z", "+00:00"))
            except Exception:
                dt = datetime.now(timezone.utc)
            activities.append(
                (
                    dt,
                    ActivityItemResponse(
                        id=f"act_app_{app.id}",
                        title="Application Recorded",
                        description=f"Applied to {app.job_title} at {app.company} via {app.platform}",
                        timestamp=app.created_at,
                        type="application",
                        status_badge=app.status,
                    ),
                )
            )

        # 2. Automation Tasks
        if self.supabase:
            try:
                task_res = (
                    self.supabase.table("automation_tasks")
                    .select("id, status, task_type, created_at, message")
                    .eq("user_id", user_id)
                    .order("created_at", desc=True)
                    .limit(5)
                    .execute()
                )
                for t in task_res.data or []:
                    try:
                        dt = datetime.fromisoformat(
                            t.get("created_at", "").replace("Z", "+00:00")
                        )
                    except Exception:
                        dt = datetime.now(timezone.utc)
                    status = t.get("status", "queued")
                    activities.append(
                        (
                            dt,
                            ActivityItemResponse(
                                id=f"act_task_{t['id']}",
                                title=f"Task {status.capitalize()}",
                                description=t.get("message")
                                or f"Simulation {t.get('task_type')} {status}",
                                timestamp=t.get("created_at", ""),
                                type="task",
                                status_badge=status,
                            ),
                        )
                    )
            except Exception:
                pass

        # 3. Resumes
        if self.supabase:
            try:
                res_res = (
                    self.supabase.table("resumes")
                    .select("id, file_name, created_at")
                    .eq("user_id", user_id)
                    .order("created_at", desc=True)
                    .limit(3)
                    .execute()
                )
                for r in res_res.data or []:
                    try:
                        dt = datetime.fromisoformat(
                            r.get("created_at", "").replace("Z", "+00:00")
                        )
                    except Exception:
                        dt = datetime.now(timezone.utc)
                    activities.append(
                        (
                            dt,
                            ActivityItemResponse(
                                id=f"act_res_{r['id']}",
                                title="Resume Uploaded",
                                description=f"Uploaded and parsed {r.get('file_name', 'resume')}",
                                timestamp=r.get("created_at", ""),
                                type="resume",
                            ),
                        )
                    )
            except Exception:
                pass

        # Sort combined activities descending by timestamp
        activities.sort(key=lambda x: x[0], reverse=True)
        return [item for _, item in activities[:8]]

    def export_csv(self, user_id: str) -> str:
        apps = self.get_applications(user_id=user_id, page=1, page_size=5000).items
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "Job Title",
                "Company",
                "Platform",
                "Status",
                "Location",
                "Salary",
                "Applied Date",
                "Job URL",
                "Notes",
            ]
        )
        for a in apps:
            writer.writerow(
                [
                    a.job_title,
                    a.company,
                    a.platform,
                    a.status,
                    a.location or "",
                    a.salary or "",
                    a.applied_at or a.created_at,
                    a.job_url,
                    a.notes or "",
                ]
            )
        return output.getvalue()


application_service = ApplicationService()
