from typing import List, Optional, Dict
from pydantic import BaseModel, Field


class ApplicationCreateRequest(BaseModel):
    job_title: str = Field(..., min_length=1, max_length=200)
    company: str = Field(..., min_length=1, max_length=200)
    job_url: str = Field(..., min_length=1, max_length=1000)
    platform: str = Field(..., min_length=1, max_length=50)
    status: str = Field(default="applied", max_length=30)
    location: Optional[str] = Field(default=None, max_length=100)
    salary: Optional[str] = Field(default=None, max_length=100)
    notes: Optional[str] = Field(default=None, max_length=1000)
    task_id: Optional[str] = None


class ApplicationUpdateRequest(BaseModel):
    job_title: Optional[str] = None
    company: Optional[str] = None
    job_url: Optional[str] = None
    platform: Optional[str] = None
    status: Optional[str] = None
    location: Optional[str] = None
    salary: Optional[str] = None
    notes: Optional[str] = None


class ApplicationResponse(BaseModel):
    id: str
    user_id: str
    task_id: Optional[str] = None
    job_title: str
    company: str
    job_url: str
    platform: str
    status: str
    location: Optional[str] = None
    salary: Optional[str] = None
    notes: Optional[str] = None
    applied_at: Optional[str] = None
    created_at: str
    updated_at: str


class ApplicationListResponse(BaseModel):
    items: List[ApplicationResponse] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 0


class PlatformBreakdownItem(BaseModel):
    platform: str
    applied: int
    percentage: int
    color: str


class DashboardSummaryResponse(BaseModel):
    mode: str = "live"
    total_applications: int = 0
    successful_submissions: int = 0
    pending_review: int = 0
    failed_tasks: int = 0
    active_tasks: int = 0
    automation_status: str = "idle"
    message: str = "Real candidate data retrieved from verified authenticated database."
    platform_breakdown: List[PlatformBreakdownItem] = Field(default_factory=list)


class ActivityItemResponse(BaseModel):
    id: str
    title: str
    description: str
    timestamp: str
    type: str  # 'application' | 'task' | 'resume'
    status_badge: Optional[str] = None
