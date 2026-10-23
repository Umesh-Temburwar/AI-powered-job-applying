import logging
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("api.errors")


def make_error_envelope(
    code: str, message: str, details: Any | None = None
) -> dict[str, Any]:
    """Format errors into the unified standard envelope."""
    payload: dict[str, Any] = {
        "error": {
            "code": code,
            "message": message,
        }
    }
    if details is not None:
        payload["error"]["details"] = details
    return payload


async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """Handle HTTP exceptions with standard error envelope."""
    status_code_map = {
        status.HTTP_404_NOT_FOUND: ("NOT_FOUND", "Resource not found"),
        status.HTTP_405_METHOD_NOT_ALLOWED: (
            "METHOD_NOT_ALLOWED",
            "Method not allowed for requested path",
        ),
        status.HTTP_401_UNAUTHORIZED: ("UNAUTHORIZED", "Authentication required"),
        status.HTTP_403_FORBIDDEN: ("FORBIDDEN", "Access forbidden"),
        status.HTTP_400_BAD_REQUEST: ("BAD_REQUEST", "Invalid request parameters"),
        status.HTTP_409_CONFLICT: ("CONFLICT", "Resource conflict or duplicate"),
    }

    if isinstance(exc.detail, dict):
        code = exc.detail.get("code") or status_code_map.get(exc.status_code, (f"HTTP_{exc.status_code}", ""))[0]
        message = exc.detail.get("message") or "An error occurred"
        content = make_error_envelope(code=code, message=message, details=exc.detail.get("details"))
        content["detail"] = message
        return JSONResponse(
            status_code=exc.status_code,
            content=content,
        )

    code, default_msg = status_code_map.get(
        exc.status_code,
        (f"HTTP_{exc.status_code}", str(exc.detail or "An HTTP error occurred")),
    )

    message = exc.detail if isinstance(exc.detail, str) and exc.detail else default_msg
    content = make_error_envelope(code=code, message=message)
    content["detail"] = message

    return JSONResponse(
        status_code=exc.status_code,
        content=content,
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle Pydantic/FastAPI request validation errors (422)."""
    field_details = []
    for err in exc.errors():
        field_details.append(
            {
                "field": ".".join(
                    str(loc) for loc in err.get("loc", []) if loc != "body"
                ),
                "message": err.get("msg", "Validation error"),
                "type": err.get("type", "value_error"),
            }
        )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=make_error_envelope(
            code="VALIDATION_ERROR",
            message="Request validation failed. Check field parameters.",
            details=field_details,
        ),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler for unhandled internal server exceptions (500)."""
    # Log exception internally without leaking secrets or request body
    request_id = getattr(request.state, "request_id", "unknown")
    logger.error(f"Unhandled server error [req_id={request_id}]: {exc}", exc_info=exc)

    # In production, never expose internal trace or error text
    from core.config import get_settings

    settings = getattr(getattr(request, "app", None), "state", None)
    app_settings = getattr(settings, "settings", None) if settings else None
    current_settings = app_settings or get_settings()

    if current_settings.is_production:
        message = "An unexpected internal server error occurred."
        details = None
    else:
        message = f"Internal Server Error: {exc!s}"
        details = {"type": exc.__class__.__name__}

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=make_error_envelope(
            code="INTERNAL_SERVER_ERROR",
            message=message,
            details=details,
        ),
    )


def register_error_handlers(app: FastAPI) -> None:
    """Attach standard exception handlers to the FastAPI app."""
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
