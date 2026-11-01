import logging
import os
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.security import HTTPAuthorizationCredentials

from core.auth import AuthenticatedUser, get_current_user, security_bearer
from core.config import Settings, get_settings
from services.config_service import (
    get_full_configuration,
    parse_and_save_user_resume,
    save_user_configuration,
    delete_user_resume_file,
    reset_all_candidate_data,
    get_active_resume_file_response,
)
from services.resume_service import validate_resume_file

logger = logging.getLogger("config_api")

router = APIRouter(prefix="/config", tags=["Configuration"])


async def get_optional_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_bearer)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthenticatedUser:
    """Return verified user if token provided, otherwise return local candidate identity."""
    if credentials:
        try:
            return await get_current_user(request, credentials, settings)
        except Exception:
            pass
    cid = os.getenv("CANDIDATE_USER_ID", "0ff8ac23-96d8-419e-9cff-ffd3b3430f17")
    return AuthenticatedUser(
        id=cid,
        email=os.getenv("NAUKRI_EMAIL", "candidate@example.com"),
    )


@router.get(
    "/env",
    summary="Get universal bot configuration",
    description="Retrieve all environment and candidate settings from .env, profile_data.json, and data/resumes.",
)
async def get_env_config(
    user: Annotated[AuthenticatedUser, Depends(get_optional_user)],
) -> dict[str, Any]:
    """Return all configured bot parameters."""
    return get_full_configuration()


@router.post(
    "/env",
    summary="Save universal bot configuration",
    description="Synchronize candidate details, search preferences, platform credentials, and AI keys to .env and data files.",
)
async def save_env_config(
    payload: dict[str, Any],
    user: Annotated[AuthenticatedUser, Depends(get_optional_user)],
) -> dict[str, Any]:
    """Update root .env, data/profile_data.json, and data/resume.ini."""
    return save_user_configuration(payload, user_id=user.id)


@router.post(
    "/upload-resume",
    summary="Upload resume and autofill candidate details",
    description="Upload a PDF/DOCX resume, save locally in data/resumes/, parse structured details, and auto-populate configuration.",
)
async def upload_resume_and_autofill(
    user: Annotated[AuthenticatedUser, Depends(get_optional_user)],
    file: UploadFile = File(...),
) -> dict[str, Any]:
    """Process resume document and extract structured candidate fields."""
    file_bytes = await file.read()
    validate_resume_file(file_bytes, file.filename or "resume.pdf", file.content_type)

    try:
        extracted = parse_and_save_user_resume(
            file_bytes=file_bytes,
            file_name=file.filename or "resume.pdf",
            user_id=user.id,
        )
        return {
            "status": "success",
            "message": f"Resume '{file.filename}' uploaded and parsed successfully!",
            "data": extracted,
        }
    except Exception as exc:
        logger.error("Error processing resume: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to process and extract details from resume: {exc}",
        )

@router.get(
    "/resume/file",
    summary="View active candidate resume file",
    description="Stream the active candidate resume file (PDF, DOCX, TXT) inline for in-browser PDF viewing.",
)
async def get_active_resume_file(
    user: Annotated[AuthenticatedUser, Depends(get_optional_user)],
):
    """Serve active candidate resume file inline with PDF/document viewing headers."""
    try:
        return get_active_resume_file_response(user_id=user.id if user else None)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error retrieving active resume file: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load resume file: {exc}",
        )

@router.delete(
    "/resume",
    summary="Delete candidate resume file",
    description="Permanently remove candidate resume file from data/resumes/ and clear profile references.",
)
async def delete_resume_endpoint(
    user: Annotated[AuthenticatedUser, Depends(get_optional_user)],
) -> dict[str, Any]:
    """Delete physical resume file from disk and clear configuration references."""
    try:
        return delete_user_resume_file()
    except Exception as exc:
        logger.error("Error deleting resume: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete resume: {exc}",
        )

@router.post(
    "/reset-candidate",
    summary="Reset candidate data completely",
    description="Permanently delete all candidate applications, resumes, preferences, connections, and credentials from Supabase, SQLite, and disk.",
)
@router.delete(
    "/reset-candidate",
    summary="Reset candidate data completely",
    description="Permanently delete all candidate applications, resumes, preferences, connections, and credentials from Supabase, SQLite, and disk.",
)
async def reset_candidate_endpoint(
    user: Annotated[AuthenticatedUser, Depends(get_optional_user)],
) -> dict[str, Any]:
    """Wipe all candidate data from Supabase, SQLite, local disk, and in-memory caches."""
    try:
        result = reset_all_candidate_data(user_id=user.id)
        return result
    except Exception as exc:
        logger.error("Error resetting candidate data: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset candidate data: {exc}",
        )

