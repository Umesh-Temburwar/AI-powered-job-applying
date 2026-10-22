from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile, status

from core.auth import AuthenticatedUser, get_current_user
from schemas.resume import (
    ResumeDownloadResponse,
    ResumeListResponse,
    ResumeUploadResponse,
)
from services.resume_service import (
    delete_user_resume,
    get_resume_download_url,
    list_user_resumes,
    set_primary_resume,
    upload_and_parse_resume,
)

router = APIRouter(prefix="/resumes", tags=["Resumes"])


@router.post(
    "/upload",
    response_model=ResumeUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and parse resume",
    description="Upload a PDF or DOCX resume document, parse text server-side, and extract structured profile.",
)
async def upload_resume(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    file: UploadFile = File(...),
    set_as_default: bool = Form(True),
) -> ResumeUploadResponse:
    """Validate file bytes, upload to private storage, and extract fields."""
    file_bytes = await file.read()
    return await upload_and_parse_resume(
        user_id=current_user.id,
        file_bytes=file_bytes,
        file_name=file.filename or "resume.pdf",
        content_type=file.content_type,
        set_as_default=set_as_default,
    )


@router.get(
    "",
    response_model=ResumeListResponse,
    summary="List candidate resumes",
    description="List all resumes belonging strictly to the requesting user.",
)
async def get_resumes(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> ResumeListResponse:
    """Return user's resume records."""
    return await list_user_resumes(user_id=current_user.id)


@router.post(
    "/{resume_id}/set-default",
    status_code=status.HTTP_200_OK,
    summary="Set primary resume",
    description="Mark a specific resume as default for automated job submissions.",
)
async def set_default_resume(
    resume_id: str,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> dict[str, str]:
    """Set default resume ID."""
    await set_primary_resume(user_id=current_user.id, resume_id=resume_id)
    return {"message": "Primary resume updated successfully."}


@router.delete(
    "/{resume_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete candidate resume",
    description="Permanently delete a resume record and its stored file.",
)
async def delete_resume(
    resume_id: str,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> dict[str, str]:
    """Remove resume under user ownership verification."""
    await delete_user_resume(user_id=current_user.id, resume_id=resume_id)
    return {"message": "Resume deleted successfully."}


@router.get(
    "/{resume_id}/download",
    response_model=ResumeDownloadResponse,
    summary="Get resume download URL",
    description="Generate a secure, time-limited signed URL to access private resume file.",
)
async def get_download_url(
    resume_id: str,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> ResumeDownloadResponse:
    """Return short-lived signed access URL."""
    return await get_resume_download_url(user_id=current_user.id, resume_id=resume_id)
