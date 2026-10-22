from fastapi import APIRouter

from api.auth import router as auth_router
from api.dashboard import router as dashboard_router
from api.health import router as health_router

api_v1_router = APIRouter()

# Register versioned endpoints (/api/v1/health, /api/v1/dashboard/..., /api/v1/auth/...)
api_v1_router.include_router(health_router)
api_v1_router.include_router(dashboard_router)
api_v1_router.include_router(auth_router)
