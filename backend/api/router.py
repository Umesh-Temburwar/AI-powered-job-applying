from fastapi import APIRouter

from api.auth import router as auth_router
from api.dashboard import router as dashboard_router
from api.health import router as health_router
from api.preferences import router as preferences_router
from api.profile import router as profile_router
from api.resumes import router as resumes_router
from api.tasks import router as tasks_router
from api.applications import router as applications_router
from api.connections import router as connections_router
from api.admin import router as admin_router
from api.training import router as training_router

api_v1_router = APIRouter()

# Register versioned endpoints (/api/v1/health, /api/v1/dashboard/..., /api/v1/auth/..., /api/v1/tasks/..., /api/v1/profile/..., /api/v1/resumes/..., /api/v1/preferences/..., /api/v1/applications/..., /api/v1/connections/..., /api/v1/admin/..., /api/v1/training/...)
api_v1_router.include_router(health_router)
api_v1_router.include_router(dashboard_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(tasks_router)
api_v1_router.include_router(profile_router)
api_v1_router.include_router(resumes_router)
api_v1_router.include_router(preferences_router)
api_v1_router.include_router(applications_router)
api_v1_router.include_router(connections_router)
api_v1_router.include_router(admin_router)
api_v1_router.include_router(training_router)
