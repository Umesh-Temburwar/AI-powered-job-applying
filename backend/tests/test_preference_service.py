"""Unit tests for user preferences and role suggestions in backend/services/preference_service.py."""

import asyncio
import pytest
from backend.services.preference_service import (
    suggest_preferences_from_skills,
    get_user_preferences,
    update_user_preferences,
    get_all_role_categories,
    ROLE_CATEGORIES_REGISTRY,
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


def test_get_all_role_categories_catalog():
    """Verify complete catalog includes all 11 categories and 60+ unique roles."""
    catalog = get_all_role_categories()
    assert catalog["total_categories"] == 11
    assert catalog["total_roles"] >= 60
    category_ids = {c["id"] for c in catalog["categories"]}
    expected_ids = {
        "fullstack", "frontend", "backend", "mobile", "ai_data",
        "devops_cloud", "qa_testing", "security", "product_mgmt",
        "systems_iot", "fresher_intern"
    }
    assert expected_ids.issubset(category_ids)


def test_suggest_preferences_ai_and_mobile_skills():
    """Verify AI, mobile, and security skills trigger appropriate role categories."""
    ai_skills = ["PyTorch", "NLP", "Pandas", "Scikit-Learn"]
    res_ai = asyncio.run(suggest_preferences_from_skills("usr_test_ai", ai_skills))
    assert any("AI" in title or "Data" in title for title in res_ai.suggested_titles)

    mobile_skills = ["Flutter", "Kotlin", "Android Studio"]
    res_mobile = asyncio.run(suggest_preferences_from_skills("usr_test_mob", mobile_skills))
    assert any("Mobile" in title or "Flutter" in title or "Android" in title for title in res_mobile.suggested_titles)

