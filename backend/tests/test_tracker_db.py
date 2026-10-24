"""Unit tests for SQLite Job Tracker Database in platforms/tracker_db.py."""

import sqlite3
import pytest
from unittest.mock import patch, MagicMock
from platforms import tracker_db


@pytest.fixture
def in_memory_db(monkeypatch):
    """Fixture providing an isolated in-memory SQLite connection for testing."""
    test_conn = sqlite3.connect(":memory:")
    test_conn.row_factory = sqlite3.Row

    # Initialize schema
    test_conn.execute("""
        CREATE TABLE applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            platform TEXT NOT NULL,
            job_id TEXT,
            job_title TEXT NOT NULL,
            company TEXT,
            location TEXT,
            url TEXT,
            status TEXT DEFAULT 'Applied',
            applied_date TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            notes TEXT
        );
    """)

    monkeypatch.setattr(tracker_db, "get_connection", lambda: test_conn)
    monkeypatch.setattr(tracker_db, "get_supabase_client", lambda: None)
    return test_conn


def test_has_applied_empty_inputs(in_memory_db):
    """Test that has_applied returns False when all inputs are empty."""
    assert tracker_db.has_applied() is False
    assert tracker_db.has_applied("", "", "", "") is False


def test_record_application_and_has_applied(in_memory_db):
    """Test recording an application and verifying deduplication."""
    success = tracker_db.record_application(
        platform="Naukri",
        job_title="Full Stack Engineer",
        company="TechCorp",
        location="Remote",
        url="https://naukri.com/job/12345",
        job_id="naukri_12345",
        status="Applied"
    )
    assert success > 0

    # Check by URL

    assert tracker_db.has_applied(url="https://naukri.com/job/12345") is True
    # Check by Job ID
    assert tracker_db.has_applied(job_id="naukri_12345") is True
    # Check by company + title
    assert tracker_db.has_applied(company="TechCorp", title="Full Stack Engineer") is True
    # Non-existent job
    assert tracker_db.has_applied(url="https://naukri.com/job/99999") is False
