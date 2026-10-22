from typing import Annotated

from fastapi import APIRouter, Depends, status

from core.auth import AuthenticatedUser, get_current_user
from schemas.profile import (
    OnboardingStatusResponse,
    ProfileResponse,
    ProfileUpdateRequest,
)
from services.profile_service import (
    autofill_profile_from_user_resume,
    get_or_create_profile,
    get_user_onboarding_status,
    update_user_profile,
)

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get(
    "",
    response_model=ProfileResponse,
    summary="Get candidate profile",
    description="Retrieve the authenticated candidate's profile, career details, and completion score.",
)
async def get_profile(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> ProfileResponse:
    """Derive user identity strictly from verified JWT token."""
    return await get_or_create_profile(user_id=current_user.id, default_email=current_user.email)


@router.put(
    "",
    response_model=ProfileResponse,
    summary="Update candidate profile",
    description="Update candidate identity, education, experience, skills, and onboarding progression.",
)
async def update_profile(
    updates: ProfileUpdateRequest,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> ProfileResponse:
    """Save profile updates under user-isolated ownership."""
    return await update_user_profile(user_id=current_user.id, updates=updates)


@router.get(
    "/status",
    response_model=OnboardingStatusResponse,
    summary="Get onboarding status",
    description="Check whether candidate has completed onboarding to guide client routing.",
)
async def get_onboarding_status(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> OnboardingStatusResponse:
    """Verify onboarding completion state and missing fields."""
    return await get_user_onboarding_status(user_id=current_user.id)


@router.post(
    "/autofill",
    response_model=ProfileResponse,
    summary="Autofill profile from resume",
    description="Extract details from candidate resume document and auto-fill profile details.",
)
async def autofill_profile(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    resume_id: str | None = None,
) -> ProfileResponse:
    """Extract candidate resume fields and auto-populate profile."""
    return await autofill_profile_from_user_resume(user_id=current_user.id, resume_id=resume_id)
