"""Unit tests for resume parsing logic in backend/services/resume_parser.py."""

import pytest
from backend.services.resume_parser import normalize_text, extract_structured_data


def test_normalize_text_ligatures():
    """Test unicode ligature replacement in resume texts."""
    raw = "Af\ufb01liation with B. Tech and Python \ufb02uent developer"
    normalized = normalize_text(raw)
    assert "Affiliation" in normalized or "Aff" in normalized
    assert "B.Tech" in normalized
    assert "fluent" in normalized


def test_extract_structured_data_skills():
    """Test skill extraction from structured resume text."""
    sample_resume = """
    John Doe
    john.doe@example.com | +91 9876543210
    Bengaluru, India

    SKILLS
    Python, FastAPI, React.js, TypeScript, PostgreSQL, Docker, Git

    EDUCATION
    B.Tech in Computer Science, 2024
    """
    data = extract_structured_data(sample_resume)
    assert data is not None
    # Verify contact parsing
    assert data.get("email") == "john.doe@example.com"
    # Verify skills detection
    skills = data.get("skills", [])
    assert any("Python" in s for s in skills)

    assert any("React" in s for s in skills)


def test_extract_structured_data_empty():
    """Test behavior on minimal or empty text without crashes."""
    data = extract_structured_data("")
    assert isinstance(data, dict)
    assert data.get("email") is None
