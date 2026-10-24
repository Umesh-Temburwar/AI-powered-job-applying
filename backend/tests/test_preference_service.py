"""Unit tests for user preferences and role suggestions in backend/services/preference_service.py."""

import asyncio
import pytest
from backend.services.preference_service import (
    suggest_preferences_from_skills,
    get_user_preferences,
    update_user_preferences,
)
from backend.schemas.preferences import JobPreferencesUpdateRequest


def test_suggest_preferences_frontend_skills():
    """Verify frontend skills trigger Frontend Developer recommendation."""
    skills = ["React.js", "TypeScript", "Tailwind CSS"]
    result = asyncio.run(suggest_preferences_from_skills("usr_test_123", skills))
    assert result is not None
    assert any("Frontend" in title for title in result.suggested_titles)


def test_suggest_preferences_backend_skills():
    """Verify backend skills trigger Backend or Full Stack recommendation."""
    skills = ["Python", "FastAPI", "PostgreSQL", "Docker"]
    result = asyncio.run(suggest_preferences_from_skills("usr_test_123", skills))
    assert result is not None
    assert any("Backend" in title or "Full Stack" in title for title in result.suggested_titles)


def test_update_and_get_user_preferences_memory():
    """Verify in-memory preference update and retrieval."""
    user_id = "usr_memory_test"
    update_req = JobPreferencesUpdateRequest(
        job_titles=["Senior Python Developer"],
        locations=["Remote", "Bengaluru"],
        daily_application_limit=30,
        require_manual_review=False
    )
    res = asyncio.run(update_user_preferences(user_id, update_req))
    assert "Senior Python Developer" in res.job_titles
    assert res.daily_application_limit == 30
    assert res.require_manual_review is False
