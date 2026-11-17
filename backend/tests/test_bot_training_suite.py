"""
Comprehensive End-to-End Test Suite for Dynamic Bot Training Pipeline
================================================================================
Verifies:
- All golden JSON domain datasets load cleanly and hydrate without leftover {{placeholders}}
- Multi-user cross-profile isolation (zero PII/college leakage across distinct users)
- Answer quality guardrails (numeric, boolean, markdown stripping, max_chars)
- Salary/Notice unit conversions (LPA, INR, monthly stipend, notice days)
- Gemini & OpenAI JSONL dataset exporter deduplication and dynamic system prompts
- Training API /api/v1/training/datasets catalog endpoint
"""

import os
import glob
import json
import tempfile
from fastapi.testclient import TestClient

from main import create_app
from platforms.resume_intelligence import ResumeKnowledgeGraph
from platforms.form_field_resolver import SalaryAndNoticeResolver
from services.bot_training.answer_guard import guard_form_answer
from services.bot_training.template_renderer import CandidateTemplateRenderer
from services.bot_training.questionnaire_simulator import QuestionnaireSimulator
from services.bot_training.dataset_exporter import DatasetExporter
from services.bot_training.scoring import ConfidenceScorer

DATASETS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "services", "bot_training", "datasets")
)


def test_all_golden_datasets_parse_and_hydrate_cleanly():
    files = sorted(glob.glob(os.path.join(DATASETS_DIR, "*.json")))
    assert len(files) >= 45

    sample_profile = {
        "personal": {
            "name": "Rohan Deshmukh",
            "email": "rohan.d@example.com",
            "phone": "+91 9000011111",
            "current_location": "Hyderabad",
            "preferred_locations": ["Hyderabad", "Bengaluru", "Remote"],
            "notice_period": "15 Days",
            "expected_ctc": "9 LPA",
            "current_ctc": "5 LPA",
            "total_experience_years": 2.0,
            "portfolio": "https://rohandeshmukh.dev",
            "github": "https://github.com/rohandeshmukh",
            "linkedin": "https://linkedin.com/in/rohandeshmukh",
        },
        "education": {
            "degree": "B.Tech",
            "field_of_study": "Computer Science",
            "college": "IIIT Hyderabad",
            "cgpa": "8.8",
            "passing_year": "2023",
        },
        "key_skills": ["Python", "FastAPI", "React.js", "PostgreSQL", "Docker", "AWS"],
        "projects": [{"title": "CloudSync Orchestrator", "tech_stack": ["Python", "FastAPI", "Docker"]}],
    }

    renderer = CandidateTemplateRenderer(sample_profile)
    total_questions = 0
    for fp in files:
        with open(fp, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert isinstance(data, list) and len(data) > 0, f"Empty or invalid dataset: {fp}"
        for entry in data:
            q = entry.get("question_text", "").strip()
            raw_a = entry.get("answer", "").strip()
            rendered_a = renderer.render_text(raw_a)
            assert q, f"Missing question_text in {fp}"
            assert rendered_a, f"Empty rendered answer in {fp}"
            assert not CandidateTemplateRenderer.has_unresolved_placeholders(rendered_a), (
                f"Unresolved placeholder in {fp}: {rendered_a}"
            )
            total_questions += 1

    assert total_questions >= 200


def test_multi_user_isolation_across_three_candidates():
    profiles = [
        {
            "personal": {"name": "Ananya Verma", "expected_ctc": "6 LPA", "notice_period": "Immediate"},
            "education": {"degree": "B.Tech", "field_of_study": "IT", "college": "VJTI Mumbai", "cgpa": "8.5"},
            "key_skills": ["React.js", "JavaScript", "Tailwind CSS"],
        },
        {
            "personal": {"name": "Karthik Reddy", "expected_ctc": "11 LPA", "notice_period": "30 Days"},
            "education": {"degree": "B.E.", "field_of_study": "CSE", "college": "RVCE Bengaluru", "cgpa": "9.1"},
            "key_skills": ["Java", "Spring Boot", "Kubernetes"],
        },
        {
            "personal": {"name": "Neha Kapoor", "expected_ctc": "14 LPA", "notice_period": "15 Days"},
            "education": {"degree": "M.Tech", "field_of_study": "AI", "college": "IIT Delhi", "cgpa": "9.5"},
            "key_skills": ["Python", "PyTorch", "LangChain"],
        },
    ]
    report = QuestionnaireSimulator.verify_multi_user_isolation(profiles)
    assert report["candidates_tested"] == 3
    assert report["isolated"] is True
    assert report["leaks"] == []


def test_answer_guard_sanitizes_all_field_types():
    assert guard_form_answer("4.5 Lakhs", field_type="number") == "4.5"
    assert guard_form_answer("Immediate (0 Days)", field_type="number") == "0"
    assert guard_form_answer("No, I prefer paid roles", field_type="radio") == "No"
    assert guard_form_answer("Yes, available immediately", field_type="radio") == "Yes"
    assert guard_form_answer("**Python** and `FastAPI` {{unknown}}", field_type="text") == "Python and FastAPI"
    truncated = guard_form_answer("Clean modular architecture with high performance", field_type="text", max_chars=25)
    assert len(truncated) <= 25


def test_salary_and_notice_unit_resolver():
    graph = ResumeKnowledgeGraph({
        "personal": {
            "name": "Dev Patel",
            "expected_ctc": "6 Lakhs",
            "current_ctc": "3.6 LPA",
            "notice_period": "2 Months",
        }
    })
    assert SalaryAndNoticeResolver.resolve_salary("Expected CTC in LPA", graph) == "6"
    assert SalaryAndNoticeResolver.resolve_salary("Expected annual salary in INR", graph) == "600000"
    assert SalaryAndNoticeResolver.resolve_salary("Expected monthly stipend", graph) == "50000"
    assert SalaryAndNoticeResolver.resolve_salary("Current CTC in LPA", graph) == "3.6"
    assert SalaryAndNoticeResolver.resolve_notice_days(graph) == "60"


def test_dataset_exporter_openai_and_gemini_jsonl_deduplication():
    bank = {
        "what is your notice period?": {"original_question": "What is your notice period?", "answer": "{{notice_period}}"},
        "WHAT IS YOUR NOTICE PERIOD?": {"original_question": "what is your notice period?", "answer": "{{notice_period}}"},
        "what is your expected ctc?": {"original_question": "What is your expected CTC?", "answer": "{{expected_ctc}}"},
    }
    profile = {
        "personal": {"name": "Siddharth Rao", "notice_period": "15 Days", "expected_ctc": "8 LPA"},
        "key_skills": ["Go", "Docker", "PostgreSQL"],
    }
    with tempfile.TemporaryDirectory() as tmpdir:
        openai_path = os.path.join(tmpdir, "openai.jsonl")
        gemini_path = os.path.join(tmpdir, "gemini.jsonl")
        c1 = DatasetExporter.export_to_jsonl(bank, openai_path, profile)
        c2 = DatasetExporter.export_to_gemini_jsonl(bank, gemini_path, profile)
        assert c1 == 2
        assert c2 == 2
        with open(gemini_path, "r", encoding="utf-8") as f:
            first_row = json.loads(f.readline())
        assert "Siddharth Rao" in first_row["systemInstruction"]["parts"][0]["text"]
        assert first_row["contents"][1]["parts"][0]["text"] == "15 Days"


def test_confidence_scorer_batch_summary():
    scorer = ConfidenceScorer(review_threshold=0.6)
    reports = [
        scorer.score_prediction("exact_bank", 1.0, 10),
        scorer.score_prediction("semantic_fuzzy_match", 0.85, 12),
        scorer.score_prediction("default_fallback", 1.0, 3),
    ]
    summary = ConfidenceScorer.summarize_batch(reports)
    assert summary["total"] == 3
    assert summary["trusted_count"] == 2
    assert summary["review_required_count"] == 1
    assert summary["strategy_breakdown"]["exact_bank"] == 1


def test_training_datasets_catalog_api_endpoint():
    app = create_app()
    client = TestClient(app)
    resp = client.get("/api/v1/training/datasets")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_files"] >= 45
    assert body["total_questions"] >= 200
    assert body["templated_questions"] >= 15
