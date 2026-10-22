import logging
import time
import uuid
from collections.abc import Callable

from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("api.access")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Structured HTTP logging middleware.
    Appends unique X-Request-ID and logs method, path, status code, and latency.
    Excludes bodies, headers, and sensitive query parameters to prevent token leaks.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate or capture incoming request ID
        req_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = req_id

        start_time = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start_time) * 1000.0

        # Inject X-Request-ID into response header
        response.headers["X-Request-ID"] = req_id

        # Clean sanitized logging
        logger.info(
            f"[{req_id[:8]}] {request.method} {request.url.path} "
            f"-> {response.status_code} ({duration_ms:.2f}ms)"
        )

        return response


def setup_logging(debug: bool = False) -> None:
    """Initialize structured server logging configuration."""
    log_level = logging.DEBUG if debug else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def register_logging_middleware(app: FastAPI) -> None:
    """Attach the request logging and X-Request-ID middleware."""
    app.add_middleware(RequestLoggingMiddleware)
