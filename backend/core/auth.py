import logging
from typing import Annotated, Any

import anyio
import httpx
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from core.config import Settings, get_settings

logger = logging.getLogger("auth")

security_bearer = HTTPBearer(auto_error=False)

# Module-level cache for JWKS clients keyed by JWKS URI to prevent re-fetching on every request
_jwks_clients: dict[str, jwt.PyJWKClient] = {}

ALLOWED_ASYMMETRIC_ALGORITHMS = {"ES256", "RS256", "ES384", "ES512", "RS384", "RS512"}
ALLOWED_SYMMETRIC_ALGORITHMS = {"HS256"}
ALL_ALLOWED_ALGORITHMS = ALLOWED_ASYMMETRIC_ALGORITHMS | ALLOWED_SYMMETRIC_ALGORITHMS


def get_jwks_client(supabase_url: str) -> jwt.PyJWKClient:
    """Return a cached PyJWKClient instance for the Supabase project's JWKS endpoint."""
    normalized_url = supabase_url.rstrip("/")
    jwks_uri = f"{normalized_url}/auth/v1/.well-known/jwks.json"
    if jwks_uri not in _jwks_clients:
        _jwks_clients[jwks_uri] = jwt.PyJWKClient(
            uri=jwks_uri,
            cache_jwk_set=True,
            lifespan=300.0,
            timeout=10.0,
        )
    return _jwks_clients[jwks_uri]


def clear_jwks_cache() -> None:
    """Clear cached JWKS clients (used primarily for test isolation)."""
    _jwks_clients.clear()


class AuthenticatedUser(BaseModel):
    """Verified identity derived from Supabase access token."""

    id: str
    email: str | None = None
    role: str = "authenticated"
    created_at: str | None = None
    claims: dict[str, Any] = {}


async def _verify_via_supabase_api(token: str, settings: Settings) -> AuthenticatedUser:
    """Fallback: Validate token directly with Supabase Auth endpoint (/auth/v1/user)."""
    auth_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user"
    api_key = (
        settings.SUPABASE_PUBLISHABLE_KEY
        or settings.SUPABASE_ANON_KEY
        or settings.SUPABASE_SECRET_KEY
        or settings.SUPABASE_SERVICE_ROLE_KEY
    )
    headers = {"Authorization": f"Bearer {token}"}
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
            if response.status_code == 401:
                try:
                    err_json = response.json()
                    msg = str(
                        err_json.get("msg")
                        or err_json.get("error_description")
                        or err_json.get("message")
                        or ""
                    ).lower()
                    if "expired" in msg:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Authentication token has expired.",
                        )
                except (ValueError, TypeError):
                    pass
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired Supabase authentication token.",
                )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Supabase authentication failed.",
            )
    except httpx.RequestError as exc:
        logger.error("Network failure contacting Supabase Auth API: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to verify authentication credentials with identity provider.",
        ) from exc


async def get_current_user(
    request: Request,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(security_bearer)
    ],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthenticatedUser:
    """Validate incoming Supabase JWT token and derive user identity.

    Supports:
    1. Deterministic isolated test mock tokens (active ONLY in non-production).
    2. Supabase Asymmetric Key verification via JWKS (ES256, RS256, etc.).
    3. Symmetric Key verification via SUPABASE_JWT_SECRET (HS256).
    4. Safe Remote Supabase Auth API verification fallback (/auth/v1/user).

    Fails closed (HTTP 401) on missing, malformed, expired, or invalid tokens.
    Never accepts client-supplied user IDs or arbitrary unverified tokens.
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

    # 2. Inspect unverified JWT header and claims safely
    try:
        unverified_header = jwt.get_unverified_header(token)
    except jwt.DecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed authentication token header.",
        ) from exc

    alg = unverified_header.get("alg")
    if not alg or alg not in ALL_ALLOWED_ALGORITHMS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Unsupported authentication token algorithm: '{alg}'.",
        )

    try:
        unverified_claims = jwt.decode(token, options={"verify_signature": False})
    except jwt.DecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed authentication token payload.",
        ) from exc

    valid_issuers = (
        [
            f"{active_settings.SUPABASE_URL.rstrip('/')}/auth/v1",
            active_settings.SUPABASE_URL.rstrip("/"),
        ]
        if active_settings.SUPABASE_URL
        else None
    )

    has_iss = "iss" in unverified_claims and bool(valid_issuers)
    has_aud = "aud" in unverified_claims

    # 3. Asymmetric token verification (ES256, RS256, etc.) via Supabase JWKS
    if alg in ALLOWED_ASYMMETRIC_ALGORITHMS:
        if not active_settings.SUPABASE_URL:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Supabase project URL is not configured on the server for token verification.",
            )

        jwks_client = get_jwks_client(active_settings.SUPABASE_URL)
        try:
            signing_key = await anyio.to_thread.run_sync(
                jwks_client.get_signing_key_from_jwt, token
            )
        except jwt.PyJWKClientError as exc:
            logger.warning("JWKS key resolution failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token signing key not found in identity provider JWKS.",
            ) from exc
        except Exception as exc:
            logger.error("JWKS fetch error: %s", exc)
            # If identity provider JWKS is temporarily unreachable, attempt direct /auth/v1/user verification
            return await _verify_via_supabase_api(token, active_settings)

        try:
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=[alg],
                audience="authenticated" if has_aud else None,
                issuer=valid_issuers if has_iss else None,
                options={
                    "verify_exp": True,
                    "verify_aud": has_aud,
                    "verify_iss": has_iss,
                },
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
        except jwt.InvalidSignatureError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token signature.",
            ) from exc
        except jwt.InvalidAudienceError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token audience.",
            ) from exc
        except jwt.InvalidIssuerError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token issuer.",
            ) from exc
        except jwt.InvalidAlgorithmError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token algorithm.",
            ) from exc
        except jwt.InvalidTokenError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token.",
            ) from exc

    # 4. Symmetric token verification (HS256) via SUPABASE_JWT_SECRET
    if alg in ALLOWED_SYMMETRIC_ALGORITHMS:
        if active_settings.SUPABASE_JWT_SECRET:
            # Prepare potential keys: raw string/bytes and base64-decoded bytes (common in Supabase)
            raw_secret = active_settings.SUPABASE_JWT_SECRET
            candidate_keys: list[bytes | str] = [raw_secret]
            try:
                import base64
                decoded_key = base64.b64decode(raw_secret)
                if decoded_key and decoded_key != raw_secret.encode("utf-8"):
                    candidate_keys.append(decoded_key)
            except Exception:
                pass

            last_sig_error: Exception | None = None
            for key in candidate_keys:
                try:
                    payload = jwt.decode(
                        token,
                        key,
                        algorithms=["HS256"],
                        audience="authenticated" if has_aud else None,
                        issuer=valid_issuers if has_iss else None,
                        options={
                            "verify_exp": True,
                            "verify_aud": has_aud,
                            "verify_iss": has_iss,
                        },
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
                except jwt.InvalidSignatureError as exc:
                    last_sig_error = exc
                    continue
                except jwt.InvalidAudienceError as exc:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid authentication token audience.",
                    ) from exc
                except jwt.InvalidIssuerError as exc:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid authentication token issuer.",
                    ) from exc
                except jwt.InvalidAlgorithmError as exc:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid authentication token algorithm.",
                    ) from exc
                except jwt.InvalidTokenError as exc:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid authentication token.",
                    ) from exc

            # If local symmetric key verification failed due to signature mismatch,
            # query Supabase Auth API directly before failing closed to verify against project authority.
            if last_sig_error and active_settings.SUPABASE_URL:
                logger.info(
                    "Local symmetric signature verification failed; attempting authoritative Supabase API verification..."
                )
                try:
                    return await _verify_via_supabase_api(token, active_settings)
                except HTTPException:
                    # Supabase API also rejected the token; raise truthful signature mismatch error
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid authentication token signature.",
                    ) from last_sig_error
                except Exception as exc:
                    logger.error("Supabase API verification fallback failed: %s", exc)

            if last_sig_error:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication token signature.",
                ) from last_sig_error

        # If no JWT secret is configured, fallback to remote Supabase verification if URL is set
        if active_settings.SUPABASE_URL:
            return await _verify_via_supabase_api(token, active_settings)

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Server is not configured to verify HS256 tokens (missing SUPABASE_JWT_SECRET).",
        )

    # 5. Fail closed if Supabase authentication is not configured on server
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Supabase authentication is not configured on the server.",
    )


async def get_optional_user(
    request: Request,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(security_bearer)
    ],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthenticatedUser | None:
    """Extract authenticated user if valid token is provided, or return None."""
    if not credentials or credentials.scheme.lower() != "bearer":
        return None
    try:
        return await get_current_user(request, credentials, settings)
    except HTTPException:
        return None
