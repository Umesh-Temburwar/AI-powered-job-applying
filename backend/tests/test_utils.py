"""Unit tests for backend core utility functions in backend/core/utils.py."""

import pytest
from backend.core.utils import (
    sanitize_search_query,
    normalize_job_url,
    split_comma_separated,
)


def test_sanitize_search_query_strips_html_and_spaces():
    """Verify HTML tags and irregular spacing are cleaned."""
    raw = "  <b>Full Stack</b>   Developer\n  "
    cleaned = sanitize_search_query(raw)
    assert cleaned == "Full Stack Developer"


def test_sanitize_search_query_empty():
    """Verify empty input handling."""
    assert sanitize_search_query("") == ""
    assert sanitize_search_query(None) == ""


def test_normalize_job_url_strips_tracking_params():
    """Verify UTM and tracking queries are stripped."""
    url = "https://www.naukri.com/job/12345?utm_source=email&utm_medium=campaign&ref=feed"
    normalized = normalize_job_url(url)
    assert "utm_source" not in normalized
    assert "utm_medium" not in normalized
    assert normalized == "https://www.naukri.com/job/12345"


def test_split_comma_separated_deduplication():
    """Verify splitting and case-insensitive deduplication."""
    text = "Python, FastAPI; React, python, Docker"
    items = split_comma_separated(text)
    assert len(items) == 4
    assert items == ["Python", "FastAPI", "React", "Docker"]
