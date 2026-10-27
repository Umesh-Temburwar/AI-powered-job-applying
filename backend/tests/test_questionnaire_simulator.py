"""
Integration Tests for Mock Screening Questionnaire Simulator
================================================================================
Validates multi-portal questionnaire simulations and format adaptation.
"""

import pytest
from services.bot_training.questionnaire_simulator import (
    QuestionnaireSimulator,
    QuestionItem,
)


def test_naukri_questionnaire_simulation():
    simulator = QuestionnaireSimulator()
    naukri_questions = [
        QuestionItem(
            id="q1",
            prompt="What is your official notice period?",
            field_type="text",
            expected_answer="Immediate",
        ),
        QuestionItem(
            id="q2",
            prompt="Are you an immediate joiner?",
            field_type="radio",
            options=["Yes", "No"],
            expected_answer="Yes",
        ),
        QuestionItem(
            id="q3",
            prompt="Total years of experience in React.js",
            field_type="text",
            expected_answer="1",
        ),
        QuestionItem(
            id="q4",
            prompt="Are you comfortable with relocating?",
            field_type="radio",
            options=["Yes", "No"],
            expected_answer="Yes",
        ),
    ]

    report = simulator.run_simulation("naukri", naukri_questions)
    assert report.total_questions == 4
    assert report.answered == 4
    assert report.completion_rate == 100.0
    assert report.accuracy_rate >= 75.0


def test_internshala_questionnaire_simulation():
    simulator = QuestionnaireSimulator()
    internshala_questions = [
        QuestionItem(
            id="iq1",
            prompt="Can you join immediately?",
            field_type="radio",
            options=["Yes", "No"],
            expected_answer="Yes",
        ),
        QuestionItem(
            id="iq2",
            prompt="Years of experience in Node.js",
            field_type="text",
            expected_answer="1",
        ),
    ]

    report = simulator.run_simulation("internshala", internshala_questions)
    assert report.total_questions == 2
    assert report.answered == 2
    assert report.accuracy_rate >= 50.0
