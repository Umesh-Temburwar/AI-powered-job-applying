from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.health import router as root_health_router
from api.router import api_v1_router
from core.config import Settings, get_settings
from core.errors import register_error_handlers
from core.logging import register_logging_middleware, setup_logging


from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: resume any queued tasks left unprocessed
    import asyncio
    from services.task_service import resume_stuck_queued_tasks
    asyncio.create_task(resume_stuck_queued_tasks())
    yield


def create_app(settings: Settings | None = None) -> FastAPI:
    """
    FastAPI application factory allowing tests and deployment scripts
    to instantiate isolated app instances with custom settings.
    """
    if settings is None:
        settings = get_settings()

    setup_logging(debug=settings.DEBUG)

    # Disable interactive documentation endpoints in production
    docs_url = None if settings.is_production else "/docs"
    redoc_url = None if settings.is_production else "/redoc"
    openapi_url = None if settings.is_production else "/openapi.json"

    app = FastAPI(
        title=settings.APP_NAME,
        version="1.0.0",
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url=openapi_url,
        description="RESTful API backend for the Universal Job Apply Bot platform",
        lifespan=lifespan,
    )
    app.state.settings = settings

    # 1. Attach Request-ID & latency logging middleware
    register_logging_middleware(app)

    # 2. Attach unified standard error envelope handlers
    register_error_handlers(app)

    # 3. Configure CORS: support localhost on any dev port and Chrome/Edge Private Network requests
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.FRONTEND_ORIGINS,
        allow_origin_regex=r"^(https?://(localhost|127\.0\.0\.1)(:[0-9]+)?|https://[a-zA-Z0-9-]+\.vercel\.app)$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
        allow_private_network=True,
    )

    # 4. Mount root health check endpoint: GET /health
    app.include_router(root_health_router)

    # 5. Mount versioned API routes under /api/v1 prefix
    app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

    # 6. Mount tasks router under /api prefix for /api/tasks standard endpoints
    from api.tasks import router as direct_tasks_router
    app.include_router(direct_tasks_router, prefix="/api")

    return app


# Module-level ASGI app instance for uvicorn
app = create_app()

if __name__ == "__main__":
    import os
    import uvicorn

    port = int(os.environ.get("PORT", 8001))
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=True)
