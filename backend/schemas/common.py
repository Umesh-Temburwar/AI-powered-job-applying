from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    """Payload returned by service health endpoints."""

    status: str = Field(default="ok", description="Operational health status")
    service: str = Field(description="Name of the service reporting status")

    model_config = ConfigDict(extra="forbid")


class ErrorDetail(BaseModel):
    """Standard error payload structure."""

    code: str = Field(description="Machine-readable error classification code")
    message: str = Field(description="Human-readable error description")
    details: Any | None = Field(
        default=None, description="Optional field or trace details"
    )

    model_config = ConfigDict(extra="forbid")


class ErrorEnvelope(BaseModel):
    """Consistent envelope for all API errors."""

    error: ErrorDetail

    model_config = ConfigDict(extra="forbid")
