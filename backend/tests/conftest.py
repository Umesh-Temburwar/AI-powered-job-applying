import os
import pytest
from fastapi.testclient import TestClient

os.environ["ENVIRONMENT"] = "test"

from core.config import Settings
from main import create_app


@pytest.fixture(autouse=True)
def configure_test_environment(monkeypatch):
    """Ensure test environment variables and clean in-memory state across all tests."""
    monkeypatch.setenv("ENVIRONMENT", "test")
    from core.config import get_settings
    get_settings.cache_clear()
    from services.task_service import _MEMORY_TASKS, _RUNNING_ASYNC_TASKS
    _MEMORY_TASKS.clear()
    _RUNNING_ASYNC_TASKS.clear()
    yield
    get_settings.cache_clear()
    _MEMORY_TASKS.clear()
    _RUNNING_ASYNC_TASKS.clear()


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
