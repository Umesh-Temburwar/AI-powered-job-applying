import io
import pytest
from fastapi.testclient import TestClient

from core.config import Settings
from main import create_app
from services.resume_parser import extract_raw_text, extract_structured_data
from services.resume_service import validate_resume_file


@pytest.fixture
def test_client() -> TestClient:
    settings = Settings(
        APP_NAME="Universal Job Apply Bot API",
        ENVIRONMENT="development",
        DEBUG=True,
        API_V1_PREFIX="/api/v1",
        FRONTEND_ORIGINS=["http://localhost:5173"],
    )
    app = create_app(settings=settings)
    return TestClient(app)


def test_resume_file_validation_magic_bytes():
    """Verify file validation checks genuine magic bytes, not merely extension."""
    # 1. Valid PDF
    pdf_bytes = b"%PDF-1.4\n%real pdf content\n%%EOF" + b"x" * 50
    mime = validate_resume_file(pdf_bytes, "my_resume.pdf", "application/pdf")
    assert mime == "application/pdf"

    # 2. Fake PDF (text disguised as .pdf)
    fake_pdf = b"Hello, this is just plain text without PDF signature."
    with pytest.raises(Exception) as exc:
        validate_resume_file(fake_pdf, "evil.pdf", "application/pdf")
    assert "Header signature mismatch" in str(exc.value)

    # 3. Valid DOCX
    docx_bytes = b"PK\x03\x04" + b"\x00" * 40
    mime_docx = validate_resume_file(docx_bytes, "resume.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    assert "wordprocessingml" in mime_docx

    # 4. Unsupported extension
    with pytest.raises(Exception) as exc_unsupported:
        validate_resume_file(b"MZ\x90\x00" + b"\x00" * 40, "payload.exe", "application/x-msdownload")
    assert "Unsupported file format" in str(exc_unsupported.value)


def test_resume_parser_structured_extraction():
    """Verify regex and heuristic extraction for contact, skills, and education."""
    sample_resume_text = """
    Alex Vance
    alex.vance@example.com | +91 9876543210 | Bengaluru, India
    linkedin.com/in/alexvance | github.com/alexvance

    EDUCATION
    Bachelor of Technology (B.Tech) in Computer Science
    Bangalore Institute of Technology, 2024
    CGPA: 8.8 / 10

    SKILLS
    Python, React, TypeScript, FastAPI, PostgreSQL, Docker, Git, REST API

    PROJECTS
    Universal Job Apply Bot
    Automated candidate application bot with React and FastAPI.

    WORK EXPERIENCE
    Software Engineer Intern at Tech Corp
    Built responsive dashboard features.
    """
    data = extract_structured_data(sample_resume_text)
    assert data["full_name"] == "Alex Vance"
    assert data["email"] == "alex.vance@example.com"
    assert data["phone"] == "+91 9876543210"
    assert data["city"] == "Bengaluru"
    assert "linkedin.com/in/alexvance" in data["linkedin_url"]
    assert "github.com/alexvance" in data["github_url"]
    assert "Python" in data["skills"]
    assert "React" in data["skills"]
    assert "FastAPI" in data["skills"]
    assert len(data["education"]) >= 1
    assert "B.Tech" in data["education"][0]["degree"]


def test_resume_parser_scanned_pdf_ocr_flag():
    """Verify that empty or image-only documents trigger the ocr_needed flag."""
    # A PDF with practically 0 extractable characters
    empty_pdf_stream = io.BytesIO()
    import pypdf
    writer = pypdf.PdfWriter()
    writer.add_blank_page(width=100, height=100)
    writer.write(empty_pdf_stream)
    empty_bytes = empty_pdf_stream.getvalue()

    text, ocr_needed = extract_raw_text(empty_bytes, "scanned.pdf", "application/pdf")
    assert ocr_needed is True


def test_upload_resume_endpoint_authenticated(test_client: TestClient):
    """Authenticated user can upload a valid PDF and receive parsed profile data."""
    headers = {"Authorization": "Bearer test-token-candidate1"}
    
    # Generate minimal valid PDF
    pdf_stream = io.BytesIO()
    import pypdf
    writer = pypdf.PdfWriter()
    writer.add_blank_page(width=200, height=200)
    writer.write(pdf_stream)
    pdf_content = pdf_stream.getvalue()

    files = {"file": ("alex_resume.pdf", pdf_content, "application/pdf")}
    res = test_client.post("/api/v1/resumes/upload", headers=headers, files=files)
    assert res.status_code == 201
    payload = res.json()
    assert "resume" in payload
    assert payload["resume"]["file_name"] == "alex_resume.pdf"
    assert payload["resume"]["user_id"] == "usr_candidate1"
    assert "parsed_profile" in payload


def test_profile_lifecycle_and_onboarding_status(test_client: TestClient):
    """Verify profile retrieval, update, completion scoring, and onboarding status."""
    headers = {"Authorization": "Bearer test-token-newuser"}

    # 1. Initially check onboarding status
    status_res = test_client.get("/api/v1/profile/status", headers=headers)
    assert status_res.status_code == 200
    assert status_res.json()["is_onboarded"] is False

    # 2. Get profile
    prof_res = test_client.get("/api/v1/profile", headers=headers)
    assert prof_res.status_code == 200
    profile = prof_res.json()
    assert profile["id"] == "usr_newuser"

    # 3. Update profile to complete onboarding
    updates = {
        "full_name": "Jordan Lee",
        "phone": "+91 9123456789",
        "city": "Pune",
        "skills": ["React", "TypeScript", "Node.js", "PostgreSQL"],
        "education": [{"degree": "B.Tech", "institution": "Pune University", "year": "2023"}],
        "additional_info": {"is_fresher": True, "notice_period_days": 30},
        "is_onboarded": True,
        "onboarding_step": 7,
    }
    put_res = test_client.put("/api/v1/profile", headers=headers, json=updates)
    assert put_res.status_code == 200
    updated = put_res.json()
    assert updated["full_name"] == "Jordan Lee"
    assert updated["is_onboarded"] is True
    assert updated["completion_percentage"] >= 80

    # 4. Check status again -> is_onboarded must be True
    final_status = test_client.get("/api/v1/profile/status", headers=headers).json()
    assert final_status["is_onboarded"] is True


def test_preferences_suggestions_from_skills(test_client: TestClient):
    """Verify preference suggestions derive appropriate roles from confirmed skills."""
    headers = {"Authorization": "Bearer test-token-coder"}
    res = test_client.post(
        "/api/v1/preferences/suggest",
        headers=headers,
        json={"skills": ["React", "Next.js", "Tailwind CSS", "JavaScript"]},
    )
    assert res.status_code == 200
    data = res.json()
    assert "Frontend Developer" in data["suggested_titles"]
    assert "React" in data["suggested_keywords"]
