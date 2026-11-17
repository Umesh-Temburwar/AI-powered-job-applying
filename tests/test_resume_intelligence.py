"""
Unit tests for Resume Intelligence Engine (platforms/resume_intelligence.py)
"""

import pytest
from platforms.resume_intelligence import ResumeKnowledgeGraph


@pytest.fixture
def graph():
    return ResumeKnowledgeGraph()


def test_resume_knowledge_graph_personal_info(graph):
    assert graph.name == "Umesh Temburwar" or "Umesh" in graph.name
    assert "@" in graph.email
    assert graph.phone is not None
    assert graph.notice_period == "Immediate (0 Days)"
    assert graph.total_experience_years >= 1.0


def test_resume_knowledge_graph_skills(graph):
    assert graph.has_skill("react") is True
    assert graph.has_skill("React.js") is True
    assert graph.has_skill("Node.js") is True
    assert graph.has_skill("PostgreSQL") is True
    assert graph.has_skill("Postgres") is True
    assert graph.has_skill("MongoDB") is True
    assert graph.has_skill("JavaScript") is True
    assert graph.has_skill("JS") is True


def test_resume_knowledge_graph_skill_experience(graph):
    react_exp = graph.get_skill_experience_years("React")
    assert react_exp >= 1.0
    node_exp = graph.get_skill_experience_years("Node.js")
    assert node_exp >= 1.0
    sql_exp = graph.get_skill_experience_years("PostgreSQL")
    assert sql_exp >= 1.0


def test_resume_knowledge_graph_projects(graph):
    best_db_proj = graph.get_best_matching_project("Supabase PostgreSQL database")
    assert best_db_proj is not None
    assert "EdTech" in best_db_proj.get("title", "")

    best_traffic_proj = graph.get_best_matching_project("handling 2000 visitors")
    assert best_traffic_proj is not None
    assert "ByteFest" in best_traffic_proj.get("title", "")

    narrative = graph.get_project_narrative("Describe your EdTech platform")
    assert "EdTech" in narrative
    assert len(narrative) > 50


def test_resume_knowledge_graph_education(graph):
    edu = graph.get_education_details()
    assert "B.Tech" in edu["degree"] or "Bachelor" in edu["degree"]
    assert "Computer Science" in edu["major"]
    assert edu["cgpa"] == "6.06"
    assert "2025" in edu["year"]


def test_resume_knowledge_graph_cover_letter_pitch(graph):
    pitch = graph.get_cover_letter_elevator_pitch("React Developer")
    assert "React Developer" in pitch
    assert "Umesh" in pitch
    assert "EdTech" in pitch
    assert "Immediate (0 Days)" in pitch


def test_dynamic_certifications_languages_and_achievements():
    custom_profile = {
        "personal": {
            "name": "Priya Sharma",
            "email": "priya.sharma@example.com",
            "phone": "+91 9876543210",
            "current_location": "Bengaluru",
            "notice_period": "15 Days",
            "expected_ctc": "8 LPA",
            "total_experience_years": 2.0,
        },
        "key_skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS"],
        "certifications": [{"name": "AWS Certified Developer", "issuer": "Amazon"}],
        "languages": ["English", "Hindi", "Kannada"],
        "achievements": ["Reduced API P95 latency by 45%"],
        "projects": [{"title": "FinTech Ledger API", "tech_stack": ["Python", "FastAPI", "PostgreSQL"]}],
    }
    g = ResumeKnowledgeGraph(custom_profile)
    assert "AWS Certified Developer (Amazon)" in g.get_certifications()
    assert g.get_languages() == ["English", "Hindi", "Kannada"]
    assert "Reduced API P95 latency by 45%" in g.get_achievements()

    fit = g.compute_role_fit_score("Backend Python Engineer", "Need Python, FastAPI, Docker, PostgreSQL")
    assert fit["fit_score"] == 100.0
    assert fit["recommended_to_apply"] is True

    summary = g.generate_role_summary("Backend Engineer")
    assert "Backend Engineer" in summary
    assert "Python" in summary

    ctx = g.to_template_context()
    assert ctx["candidate_name"] == "Priya Sharma"
    assert ctx["primary_project"] == "FinTech Ledger API"
    assert ctx["expected_ctc"] == "8 LPA"


