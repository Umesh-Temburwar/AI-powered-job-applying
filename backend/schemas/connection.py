from typing import Any, Optional
from pydantic import BaseModel, Field


class PortalCapabilitiesSchema(BaseModel):
    public_job_discovery: bool = True
    job_detail_navigation: bool = True
    application_form_assistance: bool = False
    application_submission: bool = False


class PortalRegistryItem(BaseModel):
    id: str
    name: str
    website_url: str
    login_url: str
    job_discovery_url: str
    integration_type: str
    supported_auth_methods: list[str] = Field(default_factory=list)
    browser_adapter: Optional[str] = None
    login_verification_strategy: str = "session_cookie_and_url_inspection"
    capabilities: PortalCapabilitiesSchema = Field(default_factory=PortalCapabilitiesSchema)
    restrictions: list[str] = Field(default_factory=list)
    status: str = "supported"
    notes: str = ""


class PortalRegistryResponse(BaseModel):
    portals: list[PortalRegistryItem]


class PlatformConnectionItem(BaseModel):
    id: Optional[str] = None
    user_id: str
    platform: str
    portal_id: Optional[str] = None
    display_name: Optional[str] = None
    website_url: Optional[str] = None
    login_url: Optional[str] = None
    job_discovery_url: Optional[str] = None
    integration_type: Optional[str] = None
    capabilities: Optional[dict[str, bool]] = None
    restrictions: Optional[list[str]] = None
    portal_status: Optional[str] = None
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


class ConnectionVerifyRequest(BaseModel):
    account_email: Optional[str] = None
    cookies: Optional[dict[str, str]] = None
    confirmed: bool = True


class ConnectionConnectRequest(BaseModel):
    account_email: Optional[str] = None
    account_password: Optional[str] = None
    permission_granted: bool = True
    launch_browser: bool = False


class ConnectionConnectAllRequest(BaseModel):
    permission_granted: bool = True
    account_email: Optional[str] = None

