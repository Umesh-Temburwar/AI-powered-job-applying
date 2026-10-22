from typing import Annotated

from fastapi import APIRouter, Depends

from core.config import Settings, get_settings
from schemas.common import HealthResponse

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service Health Check",
    description="Verify backend API availability and operational health.",
)
def get_health(settings: Annotated[Settings, Depends(get_settings)]) -> HealthResponse:
    """Return health status and official service name."""
    return HealthResponse(
        status="ok",
        service=settings.APP_NAME,
    )
