from typing import Annotated

from fastapi import APIRouter, Depends

from core.auth import AuthenticatedUser, get_current_user
from schemas.auth import UserIdentityResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get(
    "/me",
    response_model=UserIdentityResponse,
    summary="Get verified user identity",
    description="Returns authenticated user ID and email derived from Supabase access token.",
)
async def get_me(
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> UserIdentityResponse:
    """Return verified user's safe identity information."""
    return UserIdentityResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        created_at=user.created_at,
    )
