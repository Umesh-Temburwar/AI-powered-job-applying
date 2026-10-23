from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from core.auth import AuthenticatedUser, get_optional_user
from schemas.admin import (
    AdminAuditLogsResponse,
    AdminSystemStats,
    CandidateListAdminResponse,
    CandidateStatusUpdateRequest,
    PortalAdminConfig,
    PortalConfigUpdateRequest,
)
from services.admin_service import admin_service

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get(
    "/stats",
    response_model=AdminSystemStats,
    summary="Get System-Wide Admin Telemetry",
    description="Retrieve system telemetry including total candidates, applications, active workers, and portal health.",
)
def get_system_stats(
    current_user: Annotated[Optional[AuthenticatedUser], Depends(get_optional_user)] = None,
) -> AdminSystemStats:
    return admin_service.get_system_stats()


@router.get(
    "/portals",
    response_model=list[PortalAdminConfig],
    summary="Get All Portal Configurations",
    description="Fetch configurations, rate limits, and health status for all integrated job portals.",
)
def get_portal_configs(
    current_user: Annotated[Optional[AuthenticatedUser], Depends(get_optional_user)] = None,
) -> list[PortalAdminConfig]:
    return admin_service.get_portal_configs()


@router.post(
    "/portals/{portal_id}/config",
    response_model=PortalAdminConfig,
    summary="Update Portal Configuration",
    description="Update rate limits, delay timers, operational status, or enable/disable a specific job portal.",
)
def update_portal_config(
    portal_id: str,
    update: PortalConfigUpdateRequest,
    current_user: Annotated[Optional[AuthenticatedUser], Depends(get_optional_user)] = None,
) -> PortalAdminConfig:
    try:
        return admin_service.update_portal_config(portal_id, update)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))


@router.get(
    "/candidates",
    response_model=CandidateListAdminResponse,
    summary="List Candidates",
    description="Fetch paginated list of registered candidates, connection states, and application statistics.",
)
def get_candidates(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    current_user: Annotated[Optional[AuthenticatedUser], Depends(get_optional_user)] = None,
) -> CandidateListAdminResponse:
    return admin_service.get_candidates(page=page, page_size=page_size, search=search)


@router.post(
    "/candidates/{user_id}/status",
    summary="Update Candidate Operational Status",
    description="Suspend or reactivate a candidate account.",
)
def update_candidate_status(
    user_id: str,
    payload: CandidateStatusUpdateRequest,
    current_user: Annotated[Optional[AuthenticatedUser], Depends(get_optional_user)] = None,
) -> dict[str, str]:
    try:
        admin_service.set_candidate_status(user_id, payload.status)
        return {"status": "success", "user_id": user_id, "account_status": payload.status}
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))


@router.get(
    "/logs",
    response_model=AdminAuditLogsResponse,
    summary="Retrieve Audit Logs",
    description="Get system diagnostic logs, rate limit warnings, and automated job submission logs.",
)
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    current_user: Annotated[Optional[AuthenticatedUser], Depends(get_optional_user)] = None,
) -> AdminAuditLogsResponse:
    return admin_service.get_audit_logs(limit=limit)
