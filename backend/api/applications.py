from typing import Annotated, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, Response
from core.auth import AuthenticatedUser, get_current_user
from schemas.application import (
    ApplicationCreateRequest,
    ApplicationResponse,
    ApplicationListResponse,
)
from services.application_service import application_service

router = APIRouter(prefix="/applications", tags=["Applications"])


@router.get("", response_model=ApplicationListResponse, summary="List User Applications")
def list_applications(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    status: Optional[str] = Query(None, description="Filter by status (applied, interview, etc.)"),
    platform: Optional[str] = Query(None, description="Filter by platform"),
    query: Optional[str] = Query(None, description="Search keyword in title or company"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
) -> ApplicationListResponse:
    """
    Fetch paginated, user-isolated job applications for the authenticated candidate.
    """
    return application_service.get_applications(
        user_id=current_user.id,
        status=status,
        platform=platform,
        query=query,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=ApplicationResponse, status_code=201, summary="Record Application")
def create_application(
    req: ApplicationCreateRequest,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> ApplicationResponse:
    """
    Record a new job application under the authenticated candidate's profile.
    """
    return application_service.create_application(user_id=current_user.id, req=req)


@router.delete("/{application_id}", summary="Delete Application Record")
def delete_application(
    application_id: str,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """
    Remove an application record belonging to the authenticated candidate.
    """
    success = application_service.delete_application(
        user_id=current_user.id, application_id=application_id
    )
    if not success:
        raise HTTPException(status_code=404, detail="Application record not found or unauthorized.")
    return {"message": "Application deleted successfully."}


@router.get("/export", summary="Export Applications to CSV")
def export_applications_csv(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """
    Export the authenticated candidate's job application records to standard CSV.
    """
    csv_content = application_service.export_csv(user_id=current_user.id)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=candidate_applications.csv"},
    )
