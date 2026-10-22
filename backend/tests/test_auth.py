import time

import jwt
from fastapi.testclient import TestClient

from core.config import Settings
from main import create_app


def test_auth_me_missing_token_returns_401(client: TestClient) -> None:
    """Unauthenticated request to /api/v1/auth/me must return 401 error envelope."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    payload = response.json()
    assert "error" in payload
    assert payload["error"]["code"] == "UNAUTHORIZED"
    assert "Missing or invalid Authorization header" in payload["error"]["message"]


def test_auth_me_malformed_scheme_returns_401(client: TestClient) -> None:
    """Non-Bearer authentication scheme must be rejected with 401."""
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Basic dXNlcjpwYXNz"},
    )
    assert response.status_code == 401
    payload = response.json()
    assert payload["error"]["code"] == "UNAUTHORIZED"


def test_auth_me_empty_bearer_returns_401(client: TestClient) -> None:
    """Empty Bearer token string must return 401."""
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer   "},
    )
    assert response.status_code == 401
    payload = response.json()
    assert payload["error"]["code"] == "UNAUTHORIZED"


def test_auth_me_valid_test_token_returns_identity(client: TestClient) -> None:
    """Valid test environment token resolves correctly without network requests."""
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer test-token-user123"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == "usr_user123"
    assert payload["email"] == "user123@test.example.com"
    assert payload["role"] == "authenticated"


def test_auth_me_jwt_secret_verification() -> None:
    """JWT signature verification with SUPABASE_JWT_SECRET."""
    test_secret = "super-secret-supabase-jwt-key-for-testing-123456"
    test_settings = Settings(
        ENVIRONMENT="production",
        SUPABASE_JWT_SECRET=test_secret,
    )
    test_app = create_app(settings=test_settings)
    test_client = TestClient(test_app)

    # 1. Valid Token
    valid_payload = {
        "sub": "00000000-0000-0000-0000-000000000001",
        "email": "verified.candidate@example.com",
        "role": "authenticated",
        "aud": "authenticated",
        "exp": int(time.time()) + 3600,
    }
    valid_token = jwt.encode(valid_payload, test_secret, algorithm="HS256")
    resp_valid = test_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {valid_token}"},
    )
    assert resp_valid.status_code == 200
    data = resp_valid.json()
    assert data["id"] == "00000000-0000-0000-0000-000000000001"
    assert data["email"] == "verified.candidate@example.com"

    # 2. Expired Token
    expired_payload = {
        **valid_payload,
        "exp": int(time.time()) - 3600,
    }
    expired_token = jwt.encode(expired_payload, test_secret, algorithm="HS256")
    resp_expired = test_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert resp_expired.status_code == 401
    assert "expired" in resp_expired.json()["error"]["message"].lower()

    # 3. Invalid Signature (different secret, >= 32 bytes)
    bad_token = jwt.encode(
        valid_payload,
        "wrong-secret-key-that-is-at-least-32-bytes-long",
        algorithm="HS256",
    )
    resp_bad = test_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {bad_token}"},
    )
    assert resp_bad.status_code == 401
    assert "invalid" in resp_bad.json()["error"]["message"].lower()


def test_auth_me_test_tokens_rejected_in_production(prod_client: TestClient) -> None:
    """Mock test tokens must be rejected in production mode."""
    response = prod_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer test-token-hacker"},
    )
    assert response.status_code == 401
