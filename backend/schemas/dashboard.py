from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class DashboardSummary(BaseModel):
    """
    Summary metrics payload for candidate dashboard.
    In Phase 3 this returns a structured demo envelope. Phase 4 will replace this
    with authenticated per-user PostgreSQL/Supabase aggregations.
    """

    mode: Literal["demo"] = Field(
        default="demo",
        description="Indicates that data is delivered from the Phase 3 backend demo layer",
    )
    total_applications: int = Field(
        default=114,
        description="Total job applications processed across all portals",
    )
    pending_review: int = Field(
        default=11,
        description="Applications requiring manual candidate screening review",
    )
    failed_tasks: int = Field(
        default=5,
        description="Applications rejected or failed during submission",
    )
    automation_status: Literal[
        "idle", "running", "paused", "review_required", "error"
    ] = Field(
        default="idle",
        description="Current background automation execution state",
    )
    message: str = Field(
        default="Sample values returned by FastAPI backend skeleton. Live Supabase database integration is not configured yet.",
        description="Integrity notice confirming demo status",
    )

    model_config = ConfigDict(extra="forbid")
