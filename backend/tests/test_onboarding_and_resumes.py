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
        ENVIRONMENT="test",
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
    assert any("react" in s.lower() for s in data["skills"])
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


def _make_dummy_pdf() -> bytes:
    import pypdf
    pdf_stream = io.BytesIO()
    writer = pypdf.PdfWriter()
    writer.add_blank_page(width=200, height=200)
    writer.write(pdf_stream)
    return pdf_stream.getvalue()


def test_resume_upload_unauthorized_without_token(test_client: TestClient):
    """Uploading resume without Authorization header must return 401."""
    pdf_bytes = _make_dummy_pdf()
    files = {"file": ("unauth_resume.pdf", pdf_bytes, "application/pdf")}
    res = test_client.post("/api/v1/resumes/upload", files=files)
    assert res.status_code == 401
    assert "missing or invalid authorization header" in res.json()["error"]["message"].lower()


def test_resume_upload_with_expired_token():
    """Uploading resume with expired JWT token must return 401 with expired message."""
    import time
    import jwt

    test_secret = "test-secret-at-least-32-bytes-long-123456"
    test_settings = Settings(
        ENVIRONMENT="production",
        SUPABASE_JWT_SECRET=test_secret,
    )
    client = TestClient(create_app(settings=test_settings))

    expired_payload = {
        "sub": "33333333-3333-3333-3333-333333333333",
        "email": "expired@example.com",
        "role": "authenticated",
        "aud": "authenticated",
        "exp": int(time.time()) - 3600,
    }
    expired_token = jwt.encode(expired_payload, test_secret, algorithm="HS256")

    pdf_bytes = _make_dummy_pdf()
    files = {"file": ("resume.pdf", pdf_bytes, "application/pdf")}
    headers = {"Authorization": f"Bearer {expired_token}"}
    res = client.post("/api/v1/resumes/upload", headers=headers, files=files)
    assert res.status_code == 401
    assert "expired" in res.json()["error"]["message"].lower()


def test_resume_upload_with_invalid_signature_token():
    """Uploading resume with invalid JWT signature must return 401 invalid signature."""
    import time
    import jwt

    test_secret = "test-secret-at-least-32-bytes-long-123456"
    test_settings = Settings(
        ENVIRONMENT="production",
        SUPABASE_JWT_SECRET=test_secret,
    )
    client = TestClient(create_app(settings=test_settings))

    payload = {
        "sub": "33333333-3333-3333-3333-333333333333",
        "email": "invalid.sig@example.com",
        "role": "authenticated",
        "aud": "authenticated",
        "exp": int(time.time()) + 3600,
    }
    bad_token = jwt.encode(payload, "wrong-secret-key-at-least-32-bytes-long", algorithm="HS256")

    pdf_bytes = _make_dummy_pdf()
    files = {"file": ("resume.pdf", pdf_bytes, "application/pdf")}
    headers = {"Authorization": f"Bearer {bad_token}"}
    res = client.post("/api/v1/resumes/upload", headers=headers, files=files)
    assert res.status_code == 401
    assert "invalid authentication token signature" in res.json()["error"]["message"].lower()


def test_resume_upload_with_valid_asymmetric_es256_token():
    """Uploading resume with a valid asymmetric ES256 Supabase token succeeds and preserves user ownership."""
    import time
    import jwt
    from unittest.mock import MagicMock, patch
    from cryptography.hazmat.primitives.asymmetric import ec
    from core.auth import clear_jwks_cache

    clear_jwks_cache()

    priv_key = ec.generate_private_key(ec.SECP256R1())
    pub_key = priv_key.public_key()

    test_settings = Settings(
        ENVIRONMENT="production",
        SUPABASE_URL="https://prodproj.supabase.co",
    )
    client = TestClient(create_app(settings=test_settings))

    target_user_id = "44444444-4444-4444-4444-444444444444"
    payload = {
        "sub": target_user_id,
        "email": "valid.es256@example.com",
        "role": "authenticated",
        "aud": "authenticated",
        "iss": "https://prodproj.supabase.co/auth/v1",
        "exp": int(time.time()) + 3600,
    }
    token = jwt.encode(payload, priv_key, algorithm="ES256", headers={"kid": "key-es256-1"})

    mock_signing_key = MagicMock()
    mock_signing_key.key = pub_key

    mock_jwks_client = MagicMock()
    mock_jwks_client.get_signing_key_from_jwt.return_value = mock_signing_key

    pdf_bytes = _make_dummy_pdf()
    files = {"file": ("my_es256_resume.pdf", pdf_bytes, "application/pdf")}
    headers = {"Authorization": f"Bearer {token}"}

    with patch("core.auth.get_jwks_client", return_value=mock_jwks_client):
        res = client.post("/api/v1/resumes/upload", headers=headers, files=files)
        assert res.status_code == 201
        data = res.json()
        assert data["resume"]["user_id"] == target_user_id
        assert data["resume"]["file_name"] == "my_es256_resume.pdf"


def test_resume_user_ownership_isolation(test_client: TestClient):
    """User B cannot view or delete User A's uploaded resume."""
    headers_user_a = {"Authorization": "Bearer test-token-userA"}
    headers_user_b = {"Authorization": "Bearer test-token-userB"}

    pdf_bytes = _make_dummy_pdf()
    files = {"file": ("resume_user_a.pdf", pdf_bytes, "application/pdf")}

    # User A uploads resume
    upload_res = test_client.post("/api/v1/resumes/upload", headers=headers_user_a, files=files)
    assert upload_res.status_code == 201
    resume_id = upload_res.json()["resume"]["id"]

    # User B lists resumes -> must NOT contain User A's resume
    list_b = test_client.get("/api/v1/resumes", headers=headers_user_b)
    assert list_b.status_code == 200
    resumes_b = [r["id"] for r in list_b.json()["resumes"]]
    assert resume_id not in resumes_b

    # User B attempts to delete User A's resume -> 404
    del_res = test_client.delete(f"/api/v1/resumes/{resume_id}", headers=headers_user_b)
    assert del_res.status_code == 404


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
