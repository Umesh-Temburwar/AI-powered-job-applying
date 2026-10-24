"""Unit tests for Pydantic schema validation in backend/schemas/."""

import pytest
from pydantic import ValidationError
from backend.schemas.tasks import TaskCreateRequest
from backend.schemas.application import ApplicationCreateRequest


def test_task_create_request_defaults():
    """Test standard defaults for TaskCreateRequest."""
    req = TaskCreateRequest()
    assert req.platform == "All Platforms"
    assert req.task_type == "job_apply"
    assert req.dry_run is True
    assert req.max_applications == 25


def test_task_create_request_keyword_parsing():
    """Test string list parsing for keywords and locations."""
    req = TaskCreateRequest(
        keywords="Python, FastAPI , React",
        locations="Bengaluru, Pune",
        max_applications=50
    )
    assert req.keywords == ["Python", "FastAPI", "React"]
    assert req.locations == ["Bengaluru", "Pune"]
    assert req.max_applications == 50


def test_task_create_invalid_task_type():
    """Test that invalid task type raises validation error."""
    with pytest.raises(ValidationError):
        TaskCreateRequest(task_type="invalid_action_type")


def test_application_create_validation():
    """Test application create request validation."""
    app = ApplicationCreateRequest(
        job_title="Software Engineer",
        company="GlobalTech",
        job_url="https://example.com/jobs/1",
        platform="LinkedIn"
    )
    assert app.job_title == "Software Engineer"
    assert app.status == "applied"
