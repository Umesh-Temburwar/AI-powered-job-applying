import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from core.auth import AuthenticatedUser, get_current_user
from schemas.connection import (
    ConnectionActionResponse,
    ConnectionListResponse,
    PlatformConnectionItem,
)
from services.connection_service import connection_service

logger = logging.getLogger("connections_api")

router = APIRouter(prefix="/connections", tags=["Website Connections"])


@router.get("", response_model=ConnectionListResponse)
async def list_user_connections(
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Retrieve all website connection statuses for the authenticated candidate."""
    try:
        connections = connection_service.get_user_connections(user_id=user.id)
        return ConnectionListResponse(connections=connections)
    except Exception as exc:
        logger.error("Failed to list connections for candidate %s: %s", user.id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not retrieve platform connection states.",
        ) from exc


@router.post("/{platform}/connect", response_model=ConnectionActionResponse)
async def connect_portal(
    platform: str,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Open user-visible browser session for candidate to log in directly on the official portal."""
    try:
        updated = connection_service.connect_platform(user_id=user.id, platform=platform)
        return ConnectionActionResponse(
            success=True,
            platform=updated.platform,
            status=updated.status,
            message=f"Browser login window opened for {updated.platform}. Please complete credentials and MFA on the official site.",
            connection=updated,
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )
    except Exception as exc:
        logger.error("Failed to connect platform %s for candidate %s: %s", platform, user.id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not initiate connection to {platform}.",
        ) from exc


@router.post("/{platform}/verify", response_model=ConnectionActionResponse)
async def verify_portal_connection(
    platform: str,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Verify if a valid, authenticated session exists in candidate's isolated profile."""
    try:
        verified = connection_service.verify_platform_connection(user_id=user.id, platform=platform)
        is_conn = verified.status == "connected"
        msg = (
            f"Successfully verified active session on {verified.platform}."
            if is_conn
            else f"No active login detected on {verified.platform}. Please log in first."
        )
        return ConnectionActionResponse(
            success=is_conn,
            platform=verified.platform,
            status=verified.status,
            message=msg,
            connection=verified,
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )
    except Exception as exc:
        logger.error("Failed to verify platform %s for candidate %s: %s", platform, user.id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not verify connection to {platform}.",
        ) from exc


@router.post("/{platform}/disconnect", response_model=ConnectionActionResponse)
async def disconnect_portal(
    platform: str,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Clear candidate cookies and disconnect the portal."""
    try:
        disconnected = connection_service.disconnect_platform(user_id=user.id, platform=platform)
        return ConnectionActionResponse(
            success=True,
            platform=disconnected.platform,
            status=disconnected.status,
            message=f"Disconnected from {disconnected.platform} and cleared session cookies.",
            connection=disconnected,
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )
    except Exception as exc:
        logger.error("Failed to disconnect platform %s for candidate %s: %s", platform, user.id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not disconnect from {platform}.",
        ) from exc
