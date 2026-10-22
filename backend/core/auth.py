import logging
from typing import Annotated, Any

import httpx
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from core.config import Settings, get_settings

logger = logging.getLogger("auth")

security_bearer = HTTPBearer(auto_error=False)


class AuthenticatedUser(BaseModel):
    """Verified identity derived from Supabase access token."""

    id: str
    email: str | None = None
    role: str = "authenticated"
    created_at: str | None = None
    claims: dict[str, Any] = {}


async def get_current_user(
    request: Request,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(security_bearer)
    ],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthenticatedUser:
    """Validate incoming Supabase JWT token and derive user identity.

    Fails closed (HTTP 401) on missing, malformed, expired, or invalid tokens.
    Never accepts client-supplied user IDs.
    """
    # Prefer explicit app-state settings if configured via create_app(settings=...)
    active_settings: Settings = getattr(request.app.state, "settings", settings)

    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header. Expected 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials.strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token cannot be empty.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. Deterministic isolated test mock token support (active ONLY in non-production)
    if not active_settings.is_production and token.startswith("test-token-"):
        mock_uid = token.replace("test-token-", "")
        return AuthenticatedUser(
            id=f"usr_{mock_uid}",
            email=f"{mock_uid}@test.example.com",
            role="authenticated",
            claims={"sub": f"usr_{mock_uid}"},
        )

    # 2. Local JWT Secret Verification (HS256)
    if active_settings.SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                active_settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_exp": True},
            )
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token missing subject claim ('sub').",
                )
            return AuthenticatedUser(
                id=str(user_id),
                email=payload.get("email"),
                role=payload.get("role", "authenticated"),
                claims=payload,
            )
        except jwt.ExpiredSignatureError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token has expired.",
            ) from exc
        except jwt.InvalidTokenError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token signature.",
            ) from exc

    # 3. Remote Supabase Auth API Verification (/auth/v1/user)
    if active_settings.SUPABASE_URL:
        auth_url = f"{active_settings.SUPABASE_URL.rstrip('/')}/auth/v1/user"
        api_key = (
            active_settings.SUPABASE_ANON_KEY
            or active_settings.SUPABASE_PUBLISHABLE_KEY
            or active_settings.SUPABASE_SECRET_KEY
            or active_settings.SUPABASE_SERVICE_ROLE_KEY
        )
        headers = {
            "Authorization": f"Bearer {token}",
        }
        if api_key:
            headers["apikey"] = api_key

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(auth_url, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    user_id = data.get("id")
                    if not user_id:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Supabase user profile did not include an ID.",
                        )
                    return AuthenticatedUser(
                        id=str(user_id),
                        email=data.get("email"),
                        role=data.get("role", "authenticated"),
                        created_at=data.get("created_at"),
                        claims=data,
                    )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired Supabase authentication token.",
                )
        except httpx.RequestError as exc:
            logger.error("Network failure contacting Supabase Auth API: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to verify authentication credentials with identity provider.",
            ) from exc

    # 4. Fail closed if Supabase authentication is not configured on server
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Supabase authentication is not configured on the server.",
    )
