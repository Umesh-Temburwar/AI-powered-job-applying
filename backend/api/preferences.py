from typing import Annotated

from fastapi import APIRouter, Body, Depends

from core.auth import AuthenticatedUser, get_current_user
from schemas.preferences import (
    JobPreferencesResponse,
    JobPreferencesUpdateRequest,
    PreferenceSuggestionsResponse,
)
from services.preference_service import (
    get_user_preferences,
    suggest_preferences_from_skills,
    update_user_preferences,
)

router = APIRouter(prefix="/preferences", tags=["Preferences"])


@router.get(
    "",
    response_model=JobPreferencesResponse,
    summary="Get job targeting preferences",
    description="Retrieve user targeting roles, locations, platform selections, and application limits.",
)
async def get_preferences(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> JobPreferencesResponse:
    """Return user-scoped targeting settings."""
    return await get_user_preferences(user_id=current_user.id)


@router.put(
    "",
    response_model=JobPreferencesResponse,
    summary="Update job targeting preferences",
    description="Save preferred job titles, locations, platforms, and application limits.",
)
async def update_preferences(
    updates: JobPreferencesUpdateRequest,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> JobPreferencesResponse:
    """Persist user-scoped job targeting preferences."""
    return await update_user_preferences(user_id=current_user.id, updates=updates)


@router.post(
    "/suggest",
    response_model=PreferenceSuggestionsResponse,
    summary="Suggest roles and keywords from skills",
    description="Derive recommended job titles and search keywords from confirmed profile skills.",
)
async def suggest_preferences(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    skills: list[str] = Body(default_factory=list, embed=True),
) -> PreferenceSuggestionsResponse:
    """Provide intelligent targeting recommendations based on confirmed technical skills."""
    return await suggest_preferences_from_skills(user_id=current_user.id, skills=skills)
