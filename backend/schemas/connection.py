from typing import Any, Optional
from pydantic import BaseModel, Field


class PlatformConnectionItem(BaseModel):
    id: Optional[str] = None
    user_id: str
    platform: str
    status: str = Field(
        ...,
        description="One of: not_connected, connecting, connected, login_required, verification_required, unsupported, error",
    )
    account_email: Optional[str] = None
    last_verified: Optional[str] = None
    error_message: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None


class ConnectionListResponse(BaseModel):
    connections: list[PlatformConnectionItem]


class ConnectionActionResponse(BaseModel):
    success: bool
    platform: str
    status: str
    message: str
    connection: Optional[PlatformConnectionItem] = None
