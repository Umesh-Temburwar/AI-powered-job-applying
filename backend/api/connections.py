import logging
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from core.auth import AuthenticatedUser, get_current_user
from schemas.connection import (
    ConnectionActionResponse,
    ConnectionConnectAllRequest,
    ConnectionConnectRequest,
    ConnectionListResponse,
    ConnectionVerifyRequest,
    PlatformConnectionItem,
    PortalRegistryResponse,
)
from services.connection_service import connection_service

logger = logging.getLogger("connections_api")

router = APIRouter(prefix="/connections", tags=["Website Connections"])


@router.post("/connect-all", response_model=ConnectionListResponse)
async def connect_all_portals(
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    payload: Optional[ConnectionConnectAllRequest] = None,
):
    """Connect all core job platforms (Naukri, Internshala, Indeed, LinkedIn) with candidate permission."""
    try:
        permission = payload.permission_granted if payload else True
        email = payload.account_email if payload else None
        connected_items = connection_service.connect_all_platforms(
            user_id=user.id,
            permission_granted=permission,
            account_email=email,
        )
        # Return full updated connection list
        all_connections = connection_service.get_user_connections(user_id=user.id)
        return ConnectionListResponse(connections=all_connections)
    except Exception as exc:
        logger.error("Failed to connect all platforms for candidate %s: %s", user.id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not connect platforms.",
        ) from exc


@router.get("/registry", response_model=PortalRegistryResponse)
async def get_portal_registry():
    """Retrieve all supported and audited job portals with metadata, capabilities, and restrictions."""
    try:
        portals = connection_service.get_portal_registry()
        return PortalRegistryResponse(portals=portals)
    except Exception as exc:
        logger.error("Failed to retrieve portal registry: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not retrieve portal registry.",
        ) from exc


@router.get("", response_model=ConnectionListResponse)
@router.get("/", response_model=ConnectionListResponse, include_in_schema=False)
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


@router.post("/{platform}/open", response_model=ConnectionActionResponse)
@router.get("/{platform}/open", response_model=ConnectionActionResponse)
async def open_portal_window(
    platform: str,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Step 1: Open official job portal in user's isolated browser profile for manual login."""
    try:
        updated = connection_service.open_platform_portal(user_id=user.id, platform=platform)
        return ConnectionActionResponse(
            success=True,
            platform=updated.platform,
            status=updated.status,
            message=f"Official {updated.platform} portal opened. Please log in with your credentials on the official site.",
            connection=updated,
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )
    except Exception as exc:
        logger.error("Failed to open portal %s for candidate %s: %s", platform, user.id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not open {platform} portal.",
        ) from exc


@router.post("/{platform}/connect", response_model=ConnectionActionResponse)
@router.get("/{platform}/connect", response_model=ConnectionActionResponse)
async def connect_portal(
    platform: str,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    payload: Optional[ConnectionConnectRequest] = None,
):
    """Step 3: Connect candidate platform with permission and optional credentials."""
    try:
        account_email = payload.account_email if payload else None
        account_password = payload.account_password if payload else None
        permission_granted = payload.permission_granted if payload else True
        launch_browser = payload.launch_browser if payload else False

        updated = connection_service.connect_platform(
            user_id=user.id,
            platform=platform,
            account_email=account_email,
            account_password=account_password,
            permission_granted=permission_granted,
            launch_browser=launch_browser,
        )
        msg = (
            f"Successfully connected {updated.platform} with candidate automation permission."
            if updated.status == "connected"
            else f"Browser login window opened for {updated.platform}."
        )
        return ConnectionActionResponse(
            success=True,
            platform=updated.platform,
            status=updated.status,
            message=msg,
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
@router.get("/{platform}/verify", response_model=ConnectionActionResponse)
async def verify_portal_connection(
    platform: str,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    payload: Optional[ConnectionVerifyRequest] = None,
):
    """Step 4 & 5: Verify if a valid, authenticated session exists in candidate's isolated profile."""
    try:
        account_email = payload.account_email if payload else None
        confirmed = payload.confirmed if payload else True

        verified = connection_service.verify_platform_connection(
            user_id=user.id,
            platform=platform,
            account_email=account_email,
            confirmed=confirmed,
        )
        is_conn = verified.status == "connected"
        msg = (
            f"Successfully verified active session on {verified.platform}."
            if is_conn
            else f"No active login detected on {verified.platform}. Click 'Open Portal' to sign in on the official site."
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


@router.post("/{platform}/retry", response_model=ConnectionActionResponse)
@router.get("/{platform}/retry", response_model=ConnectionActionResponse)
async def retry_portal_verification(
    platform: str,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    payload: Optional[ConnectionVerifyRequest] = None,
):
    """Retry session verification check for the specified portal."""
    return await verify_portal_connection(platform=platform, user=user, payload=payload)


@router.post("/{platform}/disconnect", response_model=ConnectionActionResponse)
@router.get("/{platform}/disconnect", response_model=ConnectionActionResponse)
async def disconnect_portal(
    platform: str,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Step 6: Clear candidate session cookies and disconnect the portal."""
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
