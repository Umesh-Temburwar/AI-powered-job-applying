from fastapi import APIRouter
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field

from core.config import Settings
from main import create_app


def test_404_not_found_standard_envelope(client: TestClient):
    """Verify unknown route returns 404 in standard error envelope."""
    response = client.get("/api/v1/non_existent_route")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"
    assert "message" in data["error"]


def test_405_method_not_allowed_standard_envelope(client: TestClient):
    """Verify requesting wrong HTTP method returns 405 in standard error envelope."""
    response = client.post("/health")
    assert response.status_code == 405
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "METHOD_NOT_ALLOWED"


def test_422_validation_error_standard_envelope():
    """Verify request validation error returns 422 with field-level details."""
    test_router = APIRouter()

    class TestInput(BaseModel):
        count: int = Field(gt=0)

    @test_router.post("/test-validate")
    def validate_endpoint(item: TestInput):
        return {"count": item.count}

    app = create_app()
    app.include_router(test_router)
    custom_client = TestClient(app)

    # Send negative integer to trigger validation failure
    response = custom_client.post("/test-validate", json={"count": -5})
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert "details" in data["error"]
    assert isinstance(data["error"]["details"], list)
    assert len(data["error"]["details"]) > 0
    assert "field" in data["error"]["details"][0]


def test_500_unhandled_exception_production_mode():
    """Verify 500 error hides internal stack traces and error details in production."""
    test_router = APIRouter()

    @test_router.get("/trigger-crash")
    def crash_endpoint():
        raise RuntimeError("Secret internal database password database_pwd_xyz")

    prod_settings = Settings(
        APP_NAME="AI-powered-job-applying API",
        ENVIRONMENT="production",
        DEBUG=False,
    )
    prod_app = create_app(settings=prod_settings)
    prod_app.include_router(test_router)
    prod_client = TestClient(prod_app, raise_server_exceptions=False)

    response = prod_client.get("/trigger-crash")
    assert response.status_code == 500
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "INTERNAL_SERVER_ERROR"
    # Never leak internal error message or secret text in production
    assert "database_pwd_xyz" not in data["error"]["message"]
    assert data["error"].get("details") is None
