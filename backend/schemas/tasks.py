from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class TaskCreateRequest(BaseModel):
    """Payload to enqueue a new automation task."""

    platform: str = Field(
        default="All Platforms",
        description="Target portal (All Platforms, Naukri, Internshala, Indeed, LinkedIn)",
    )
    task_type: str = Field(
        default="job_apply",
        description="Type of task: job_apply, profile_update, or screening_test",
    )
    dry_run: bool = Field(
        default=True,
        description="Safety mode: simulates search and application without clicking final submit",
    )
    user_confirmed_real_submission: bool = Field(
        default=False,
        description="Explicit user confirmation required if dry_run is set to False",
    )
    max_applications: int = Field(
        default=25,
        ge=1,
        le=100,
        description="Maximum job applications to process in this run (1 to 100)",
    )
    keywords: list[str] = Field(
        default_factory=list,
        description="Target search keywords or job titles",
    )
    locations: list[str] = Field(
        default_factory=list,
        description="Target job locations",
    )
    force: bool = Field(
        default=False,
        description="If True, bypasses single-active-task constraint for this user",
    )
    headless: bool = Field(
        default=False,
        description="Whether to run browser in headless mode. Default is False (visible browser window)",
    )

    @field_validator("task_type")
    @classmethod
    def validate_task_type(cls, v: str) -> str:
        allowed = {"job_apply", "profile_update", "screening_test", "report"}
        cleaned = v.strip().lower()
        if cleaned not in allowed:
            raise ValueError(f"Invalid task_type '{v}'. Allowed types: {', '.join(sorted(allowed))}")
        return cleaned

    @field_validator("keywords", "locations", mode="before")
    @classmethod
    def clean_string_list(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            v = [item.strip() for item in v.split(",") if item.strip()]
        if isinstance(v, list):
            return [str(item).strip() for item in v if str(item).strip()]
        return []

    @model_validator(mode="after")
    def validate_safety_submission(self) -> "TaskCreateRequest":
        if not self.dry_run and not self.user_confirmed_real_submission:
            raise ValueError(
                "Live job submission is disabled for safety. You must explicitly confirm real submissions (user_confirmed_real_submission=True)."
            )
        return self

    model_config = ConfigDict(extra="ignore")


class TaskResponse(BaseModel):
    """Full task record representation."""

    id: str = Field(description="Unique task UUID")
    user_id: str = Field(description="Authenticated user UUID")
    task_type: str = Field(default="job_apply")
    platform: str = Field(default="All Platforms")
    status: str = Field(
        description="Queue state: queued, running, completed, failed, cancelled"
    )
    progress: int = Field(default=0, ge=0, le=100)
    message: str = Field(default="Task initialized")
    retry_count: int = Field(default=0)
    max_retries: int = Field(default=3)
    error_details: str | None = None
    dry_run: bool = Field(default=True)
    payload: dict[str, Any] = Field(default_factory=dict)
    started_at: datetime | str | None = None
    completed_at: datetime | str | None = None
    cancelled_at: datetime | str | None = None
    created_at: datetime | str | None = None

    model_config = ConfigDict(extra="ignore")


class TaskListResponse(BaseModel):
    """Paginated collection of tasks for the authenticated user."""

    tasks: list[TaskResponse]
    total: int

    model_config = ConfigDict(extra="ignore")


class TaskActionResponse(BaseModel):
    """Result of an action like cancel or retry."""

    success: bool
    task_id: str
    status: str
    message: str

    model_config = ConfigDict(extra="ignore")
