from pydantic import BaseModel, ConfigDict


class UserIdentityResponse(BaseModel):
    """Safe user identity representation returned by /auth/me."""

    id: str
    email: str | None = None
    role: str = "authenticated"
    created_at: str | None = None

    model_config = ConfigDict(extra="forbid")
