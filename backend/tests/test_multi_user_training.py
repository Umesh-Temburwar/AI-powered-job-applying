"""
Multi-User Public Bot Training & Persona Isolation Tests
================================================================================
Verifies that the Universal Job Apply Bot operates accurately as a multi-user,
public platform supporting diverse candidates (Freshers, Experienced, Backend,
Frontend, AI/ML, DevOps, QA, Mobile) with 100% accuracy and zero PII cross-leakage.
"""

import pytest
from fastapi.testclient import TestClient

from main import app
from services.bot_training.personas import get_all_personas, get_persona_by_id
from services.bot_training.engine import BotTrainer
from services.bot_training.questionnaire_simulator import QuestionnaireSimulator
from services.training_service import training_service
from train_bot import load_all_datasets


@pytest.fixture
def test_client():
    return TestClient(app)


def test_public_candidate_personas_catalog():
    """Verify that all 8 diverse public candidate personas are registered."""
    personas = get_all_personas()
    assert len(personas) >= 8

    domains = {p.get("domain") for p in personas}
    expected_domains = {"frontend", "backend", "fullstack", "ai_data", "devops_cloud", "qa_testing", "mobile"}
    assert expected_domains.issubset(domains)

    # Check that both freshers and experienced candidates exist
    experiences = [p["personal"]["total_experience_years"] for p in personas]
    assert any(exp == 0.0 for exp in experiences)  # Fresher
    assert any(exp >= 3.0 for exp in experiences)  # Senior/Experienced


def test_multi_user_isolation_zero_leaks():
    """Verify zero cross-candidate PII or academic leakage across all candidate personas."""
    personas = get_all_personas()
    report = QuestionnaireSimulator.verify_multi_user_isolation(personas)

    assert report["candidates_tested"] == len(personas)
    assert report["isolated"] is True
    assert len(report["leaks"]) == 0


def test_dynamic_candidate_profile_loading():
    """Verify that BotTrainer dynamically resolves candidate-specific details on persona switch."""
    trainer = BotTrainer()
    aarav = get_persona_by_id("fresher_frontend")
    priya = get_persona_by_id("experienced_backend")
    assert aarav is not None
    assert priya is not None

    # Test Candidate 1: Aarav (Fresher, PICT Pune, 4.5 LPA, Immediate)
    trainer.load_candidate_profile(aarav)
    res_aarav_college = trainer.evaluate_question("Which college or university did you graduate from?")
    assert "PICT" in res_aarav_college.predicted_answer or "Pune Institute of Computer Technology" in res_aarav_college.predicted_answer
    assert "MBES" not in res_aarav_college.predicted_answer

    res_aarav_notice = trainer.evaluate_question("What is your official notice period?")
    assert "Immediate" in res_aarav_notice.predicted_answer

    # Test Candidate 2: Priya (Experienced 3 yrs, R.V. College Bengaluru, 14 LPA, 30 Days)
    trainer.load_candidate_profile(priya)
    res_priya_college = trainer.evaluate_question("Which college or university did you graduate from?")
    assert "R.V. College" in res_priya_college.predicted_answer
    assert "PICT" not in res_priya_college.predicted_answer
    assert "MBES" not in res_priya_college.predicted_answer

    res_priya_notice = trainer.evaluate_question("What is your official notice period?")
    assert "30 Days" in res_priya_notice.predicted_answer
    assert "Immediate" not in res_priya_notice.predicted_answer


def test_full_persona_benchmark_accuracy():
    """Verify that all public candidate personas achieve high accuracy (>98%) on golden benchmarks."""
    personas = get_all_personas()
    benchmark_dataset = load_all_datasets()
    assert len(benchmark_dataset) > 200

    runner = BotTrainer()
    for persona in personas:
        runner.load_candidate_profile(persona)
        summary = runner.run_benchmark(benchmark_dataset)
        assert summary.accuracy_percentage >= 98.0
        assert summary.total_evaluated == len(benchmark_dataset)


def test_training_personas_api_endpoints(test_client):
    """Verify FastAPI /api/v1/training/personas and /api/v1/training/train-all-personas endpoints."""
    # 1. GET /api/v1/training/personas
    res_cat = test_client.get("/api/v1/training/personas")
    assert res_cat.status_code == 200
    data = res_cat.json()
    assert data["total_personas"] >= 8
    assert len(data["personas"]) >= 8

    # 2. POST /api/v1/training/train-all-personas
    res_train = test_client.post("/api/v1/training/train-all-personas")
    assert res_train.status_code == 200
    train_data = res_train.json()
    assert train_data["status"] == "success"
    assert train_data["public_bot_mode"] is True
    assert train_data["overall_accuracy_percentage"] >= 98.0
    assert train_data["multi_user_isolated"] is True
    assert train_data["leaks_count"] == 0
