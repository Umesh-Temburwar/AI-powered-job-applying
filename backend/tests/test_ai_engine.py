"""Unit tests for AI Question Answerer and ATS matching in platforms/ai_engine.py."""

import pytest
from unittest.mock import patch
from platforms.ai_engine import QuestionAnswerer


@pytest.fixture
def qa_engine(monkeypatch):
    """Fixture providing QuestionAnswerer instance without external network dependencies."""
    monkeypatch.setenv("GEMINI_API_KEY", "")
    monkeypatch.setenv("AI_API_KEY", "")
    return QuestionAnswerer()


def test_notice_period_heuristic(qa_engine):
    """Test heuristic response for notice period questions."""
    answer = qa_engine.answer_question("What is your current notice period?")
    assert "Immediate" in answer or "0 Days" in answer


def test_relocation_heuristic(qa_engine):
    """Test heuristic response for relocation willingness."""
    answer = qa_engine.answer_question("Are you willing to relocate?")
    assert "Yes" in answer or "relocate" in answer.lower()


def test_expected_ctc_heuristic(qa_engine):
    """Test heuristic response for expected CTC queries."""
    answer = qa_engine.answer_question("What is your expected CTC?")
    assert answer is not None
    assert len(answer) > 0


def test_graduation_year_heuristic(qa_engine):
    """Test heuristic response for graduation year."""
    answer = qa_engine.answer_question("What is your year of passing?")
    assert len(answer) == 4 or "20" in answer
