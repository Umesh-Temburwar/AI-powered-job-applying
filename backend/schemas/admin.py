from typing import Any, Optional
from pydantic import BaseModel, Field


class AdminSystemStats(BaseModel):
    total_candidates: int
    total_applications: int
    applied_today: int
    successful_applications: int
    pending_applications: int
    failed_applications: int
    success_rate_percent: float
    active_tasks: int
    active_workers: int
    total_connected_portals: int
    captcha_challenges: int
    system_status: str = "operational"


class PortalAdminConfig(BaseModel):
    id: str
    name: str
    website_url: str
    is_enabled: bool = True
    daily_limit: int = 50
    delay_seconds: int = 25
    status: str = "operational"
    total_connected_users: int = 0
    total_applications: int = 0
    success_rate: float = 95.0
    notes: Optional[str] = None


class PortalConfigUpdateRequest(BaseModel):
    is_enabled: Optional[bool] = None
    daily_limit: Optional[int] = Field(None, ge=1, le=500)
    delay_seconds: Optional[int] = Field(None, ge=5, le=300)
    status: Optional[str] = None
    notes: Optional[str] = None


class CandidateAdminItem(BaseModel):
    id: str
    email: str
    full_name: str
    status: str = "active"  # "active" | "suspended"
    created_at: str
    onboarding_completed: bool
    applications_count: int
    connected_portals: list[str]
    target_titles: list[str] = Field(default_factory=list)


class CandidateListAdminResponse(BaseModel):
    candidates: list[CandidateAdminItem]
    total: int
    page: int
    page_size: int


class CandidateStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="active or suspended")


class SystemAuditLogItem(BaseModel):
    id: str
    timestamp: str
    level: str  # "INFO" | "WARNING" | "ERROR" | "SUCCESS"
    portal: str
    action: str
    candidate_id: Optional[str] = None
    details: str


class AdminAuditLogsResponse(BaseModel):
    logs: list[SystemAuditLogItem]
    total: int
