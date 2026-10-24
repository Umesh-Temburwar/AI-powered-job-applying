"""Unit tests for standard error envelopes in backend/core/errors.py."""

import pytest
from backend.core.errors import make_error_envelope


def test_make_error_envelope_basic():
    """Verify standard error format without details."""
    envelope = make_error_envelope(code="NOT_FOUND", message="Task not found")
    assert "error" in envelope
    assert envelope["error"]["code"] == "NOT_FOUND"
    assert envelope["error"]["message"] == "Task not found"
    assert "details" not in envelope["error"]


def test_make_error_envelope_with_details():
    """Verify error envelope containing contextual details."""
    details = {"field": "max_applications", "expected": "<= 100"}
    envelope = make_error_envelope(
        code="VALIDATION_FAILED",
        message="Invalid application limit",
        details=details
    )
    assert envelope["error"]["details"] == details
    assert envelope["error"]["code"] == "VALIDATION_FAILED"
