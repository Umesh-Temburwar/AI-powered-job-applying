import pytest
from fastapi.testclient import TestClient

from core.config import Settings
from main import create_app


@pytest.fixture
def test_settings() -> Settings:
    """Fixture providing standard development settings for unit tests."""
    return Settings(
        APP_NAME="Universal Job Apply Bot API",
        ENVIRONMENT="test",
        DEBUG=True,
        API_V1_PREFIX="/api/v1",
        FRONTEND_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"],
    )



@pytest.fixture
def client(test_settings: Settings) -> TestClient:
    """Fixture providing TestClient backed by an isolated app instance."""
    app = create_app(settings=test_settings)
    return TestClient(app)


@pytest.fixture
def prod_client() -> TestClient:
    """Fixture providing TestClient configured in strict production mode."""
    prod_settings = Settings(
        APP_NAME="Universal Job Apply Bot API",
        ENVIRONMENT="production",
        DEBUG=False,
        API_V1_PREFIX="/api/v1",
        FRONTEND_ORIGINS=["http://localhost:5173"],
    )
    prod_app = create_app(settings=prod_settings)
    return TestClient(prod_app)
