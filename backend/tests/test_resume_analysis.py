import io
import pytest
from fastapi.testclient import TestClient

from core.config import Settings
from main import create_app
from services.resume_analysis_service import (
    analyze_resume_record,
    calculate_section_scores,
    extract_skills_from_text,
    match_resume_with_job_description,
)
from services.resume_parser import extract_raw_text, extract_structured_data


@pytest.fixture
def test_client() -> TestClient:
    settings = Settings(
        APP_NAME="Universal Job Apply Bot API",
        ENVIRONMENT="test",
        DEBUG=True,
        API_V1_PREFIX="/api/v1",
        FRONTEND_ORIGINS=["http://localhost:5173"],
    )
    app = create_app(settings=settings)
    return TestClient(app)


def test_extract_skills_from_text():
    """Verify keyword extraction accurately detects tech stack from job descriptions."""
    jd = """
    We are looking for a Senior Full Stack Engineer proficient in React.js, Node.js,
    TypeScript, PostgreSQL, and Docker. Experience with AWS, Redis, and GraphQL is preferred.
    """
    skills = extract_skills_from_text(jd)
    assert "React.js" in skills
    assert "Node.js" in skills
    assert "TypeScript" in skills
    assert "PostgreSQL" in skills
    assert "Docker" in skills
    assert "AWS" in skills
    assert "Redis" in skills
    assert "GraphQL" in skills


def test_calculate_section_scores_completeness():
    """Verify section scoring correctly scores complete and incomplete profiles."""
    complete_profile = {
        "full_name": "Test Candidate",
        "email": "test@example.com",
        "phone": "+91 9876543210",
        "linkedin_url": "https://linkedin.com/in/test",
        "github_url": "https://github.com/test",
        "skills": ["React.js", "Node.js", "Python", "PostgreSQL", "Docker", "Git", "TypeScript", "REST APIs", "AWS", "FastAPI"],
        "experience": [
            {
                "role": "Software Developer",
                "company": "Tech Corp",
                "duration": "2023 - Present",
                "description": "Built scalable APIs handling 5000+ daily requests.",
            }
        ],
        "education": [
            {
                "degree": "Bachelor of Technology (B.Tech)",
                "institution": "Engineering College",
                "year": "2024",
            }
        ],
        "projects": [
            {
                "title": "Job Apply Bot",
                "description": "Automated application system with React and Python.",
            },
            {
                "title": "Inventory App",
                "description": "Web inventory management system.",
            }
        ],
    }

    scores, tips = calculate_section_scores(complete_profile)
    assert scores.contact == 100
    assert scores.skills >= 85
    assert scores.experience >= 80
    assert scores.projects >= 85
    assert scores.education >= 90


@pytest.mark.anyio
async def test_analyze_resume_record_heuristic():
    """Verify structural ATS analysis computes overall score and structured output."""
    sample_text = """
    Jane Smith
    jane@example.com | +91 9876543210
    Bengaluru, Karnataka
    linkedin.com/in/janesmith | github.com/janesmith

    SKILLS
    Python, FastAPI, React.js, PostgreSQL, Docker, Git

    EDUCATION
    B.Tech in Computer Science
    Bangalore Institute of Technology, 2024

    EXPERIENCE
    Software Engineer at Startup
    Built REST APIs with Python and FastAPI.
    """
    res = await analyze_resume_record(
        user_id="usr_test_analyzer",
        resume_name="jane_resume.pdf",
        resume_text=sample_text,
        job_title="Full Stack Developer",
    )
    assert res.overall_score >= 60
    assert res.resume_name == "jane_resume.pdf"
    assert "Python" in res.skills_analysis.candidate_skills
    assert res.section_scores.contact == 100
    assert len(res.actionable_suggestions) >= 1


@pytest.mark.anyio
async def test_match_resume_with_job_description():
    """Verify job description matcher identifies matched and missing skills."""
    resume_text = """
    Alex Candidate
    alex@example.com | +91 9876543210
    SKILLS: React.js, TypeScript, HTML, CSS, Tailwind CSS, Git
    EXPERIENCE: Frontend Developer at WebStudio
    """
    jd_text = """
    Looking for a Frontend Developer with React.js, TypeScript, Tailwind CSS, Redux, and Next.js.
    """
    res = await match_resume_with_job_description(
        user_id="usr_test_matcher",
        resume_name="alex_resume.pdf",
        resume_text=resume_text,
        job_description=jd_text,
        job_title="Frontend Developer",
    )
    assert "React.js" in res.skills_analysis.matched
    assert "TypeScript" in res.skills_analysis.matched
    assert "Next.js" in res.skills_analysis.missing or "Redux" in res.skills_analysis.missing
    assert res.overall_score > 40
    assert len(res.actionable_suggestions) >= 1


def test_txt_resume_parsing():
    """Verify plain text (.txt) resumes parse properly and extract contact & skills."""
    raw_txt = """
    David Miller
    david.miller@example.com | +91 9123456789
    Pune, India
    https://linkedin.com/in/davidmiller
    https://github.com/davidmiller

    SKILLS
    Python, Django, PostgreSQL, Docker, REST APIs

    EDUCATION
    Bachelor of Engineering (B.E)
    Pune Engineering College, 2023
    """
    text, ocr = extract_raw_text(raw_txt.encode("utf-8"), "david.txt", "text/plain")
    assert "David Miller" in text
    assert ocr is False
    structured = extract_structured_data(text)
    assert structured["email"] == "david.miller@example.com"
    assert "Python" in structured["skills"]
    assert len(structured["education"]) >= 1


def test_resume_analysis_api_endpoints_workflow(test_client: TestClient):
    """Verify complete API workflow for upload, analyze, match-job, history, and delete."""
    headers = {"Authorization": "Bearer test-token-candidate-analysis"}

    # 1. Upload TXT resume
    txt_content = b"""
    Candidate User
    candidate@example.com | +91 9988776655
    SKILLS: Python, FastAPI, React.js, PostgreSQL, Docker, Git
    EDUCATION: B.Tech in Computer Science, 2024
    """
    files = {"file": ("my_resume.txt", txt_content, "text/plain")}
    data = {"job_title": "Full Stack Engineer"}

    res_upload = test_client.post("/api/resume/upload", headers=headers, files=files, data=data)
    assert res_upload.status_code == 201
    upload_body = res_upload.json()
    assert upload_body["overall_score"] >= 50
    assert upload_body["resume_name"] == "my_resume.txt"
    analysis_id = upload_body["id"]

    # 2. Match with Job Description
    jd_payload = {
        "resume_id": analysis_id,
        "resume_text": txt_content.decode("utf-8"),
        "job_title": "Senior Python Developer",
        "job_description": "We need a Senior Python Developer with FastAPI, PostgreSQL, Docker, Kubernetes, and AWS experience.",
    }
    res_match = test_client.post("/api/resume/match-job", headers=headers, json=jd_payload)
    assert res_match.status_code == 200
    match_body = res_match.json()
    assert "FastAPI" in match_body["skills_analysis"]["matched"]
    assert "Kubernetes" in match_body["skills_analysis"]["missing"]

    # 3. Get Analysis History
    res_history = test_client.get("/api/resume/history", headers=headers)
    assert res_history.status_code == 200
    history_body = res_history.json()
    assert history_body["total"] >= 1
    assert any(item["id"] == analysis_id for item in history_body["analyses"])

    # 4. Delete Analysis
    res_del = test_client.delete(f"/api/resume/{analysis_id}", headers=headers)
    assert res_del.status_code == 200
    assert res_del.json()["status"] == "success"
