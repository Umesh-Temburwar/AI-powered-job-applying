import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient


from core.config import Settings
from main import create_app
from services.automation_runner import (
    TaskCancelledException,
    execute_automation_task,
    sanitize_text,
)


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



def test_enqueue_unauthenticated_returns_401(test_client: TestClient):
    """Unauthenticated POST /api/tasks must return 401."""
    res = test_client.post("/api/tasks", json={"platform": "Naukri", "dry_run": True})
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "UNAUTHORIZED"


def test_list_tasks_unauthenticated_returns_401(test_client: TestClient):
    """Unauthenticated GET /api/tasks must return 401."""
    res = test_client.get("/api/tasks")
    assert res.status_code == 401


def test_enqueue_task_valid(test_client: TestClient):
    """Authenticated user can enqueue a task successfully."""
    headers = {"Authorization": "Bearer test-token-alice"}
    payload = {
        "platform": "Naukri",
        "dry_run": True,
        "max_applications": 15,
        "keywords": ["Full Stack Developer"],
    }
    res = test_client.post("/api/tasks", headers=headers, json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["user_id"] == "usr_alice"
    assert data["status"] == "queued"
    assert data["platform"] == "Naukri"
    assert data["dry_run"] is True
    assert data["progress"] == 0
    assert "id" in data


def test_enqueue_task_v1_endpoint(test_client: TestClient):
    """Authenticated user can enqueue and list tasks via versioned /api/v1/tasks."""
    headers = {"Authorization": "Bearer test-token-v1-tester"}
    payload = {
        "platform": "Indeed",
        "task_type": "job_apply",
        "dry_run": True,
        "max_applications": 20,
        "keywords": ["React Developer", "TypeScript"],
        "locations": ["Remote", "Bengaluru"],
    }
    # Test POST /api/v1/tasks
    res = test_client.post("/api/v1/tasks", headers=headers, json=payload)
    assert res.status_code == 201
    task = res.json()
    assert task["platform"] == "Indeed"
    assert task["dry_run"] is True
    assert task["user_id"] == "usr_v1-tester"

    # Test GET /api/v1/tasks
    list_res = test_client.get("/api/v1/tasks", headers=headers)
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(t["id"] == task["id"] for t in list_data["tasks"])

    # Test GET /api/v1/tasks/{id}
    get_res = test_client.get(f"/api/v1/tasks/{task['id']}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == task["id"]

    # Test POST /api/v1/tasks/{id}/cancel
    cancel_res = test_client.post(f"/api/v1/tasks/{task['id']}/cancel", headers=headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["success"] is True
    assert cancel_res.json()["status"] == "cancelled"


def test_duplicate_task_prevention(test_client: TestClient):
    """Enqueueing a second active task for the same user without force flag returns 409."""
    headers = {"Authorization": "Bearer test-token-bob"}
    # First task
    res1 = test_client.post(
        "/api/tasks",
        headers=headers,
        json={"platform": "Internshala", "dry_run": True},
    )
    assert res1.status_code == 201

    # Second active task -> 409 Conflict
    res2 = test_client.post(
        "/api/tasks",
        headers=headers,
        json={"platform": "Indeed", "dry_run": True},
    )
    assert res2.status_code == 409
    assert res2.json()["error"]["code"] == "DUPLICATE_TASK"


def test_duplicate_task_with_force_bypasses(test_client: TestClient):
    """Enqueueing with force=True bypasses the single-active-task constraint."""
    headers = {"Authorization": "Bearer test-token-charlie"}
    res1 = test_client.post(
        "/api/tasks",
        headers=headers,
        json={"platform": "Internshala", "dry_run": True},
    )
    assert res1.status_code == 201

    res2 = test_client.post(
        "/api/tasks",
        headers=headers,
        json={"platform": "Indeed", "dry_run": True, "force": True},
    )
    assert res2.status_code == 201


def test_tasks_user_isolation(test_client: TestClient):
    """User David cannot view or cancel User Eve's tasks."""
    eve_headers = {"Authorization": "Bearer test-token-eve"}
    david_headers = {"Authorization": "Bearer test-token-david"}

    # Eve enqueues a task
    eve_task = test_client.post(
        "/api/tasks",
        headers=eve_headers,
        json={"platform": "LinkedIn", "dry_run": True},
    ).json()

    task_id = eve_task["id"]

    # David tries to get Eve's task -> 403 Forbidden
    res = test_client.get(f"/api/tasks/{task_id}", headers=david_headers)
    assert res.status_code == 403

    # David tries to cancel Eve's task -> 403 Forbidden
    res_cancel = test_client.post(f"/api/tasks/{task_id}/cancel", headers=david_headers)
    assert res_cancel.status_code == 403


def test_cancel_task_success(test_client: TestClient):
    """User can cancel their own active task."""
    headers = {"Authorization": "Bearer test-token-frank"}
    task = test_client.post(
        "/api/tasks",
        headers=headers,
        json={"platform": "Naukri", "dry_run": True},
    ).json()

    task_id = task["id"]
    res = test_client.post(f"/api/tasks/{task_id}/cancel", headers=headers)
    assert res.status_code == 200
    action_data = res.json()
    assert action_data["success"] is True
    assert action_data["status"] == "cancelled"

    # Confirm task status is cancelled
    check = test_client.get(f"/api/tasks/{task_id}", headers=headers)
    assert check.json()["status"] == "cancelled"


def test_cancel_already_cancelled_returns_400(test_client: TestClient):
    """Attempting to cancel an already cancelled task returns 400 Bad Request."""
    headers = {"Authorization": "Bearer test-token-grace"}
    task = test_client.post(
        "/api/tasks",
        headers=headers,
        json={"platform": "Naukri", "dry_run": True},
    ).json()

    task_id = task["id"]
    test_client.post(f"/api/tasks/{task_id}/cancel", headers=headers)

    # Second cancel attempt
    res2 = test_client.post(f"/api/tasks/{task_id}/cancel", headers=headers)
    assert res2.status_code == 400


def test_retry_eligible_failed_task(test_client: TestClient):
    """Failed tasks can be retried and reset to queued status."""
    from services.task_service import _MEMORY_TASKS

    headers = {"Authorization": "Bearer test-token-heidi"}
    task = test_client.post(
        "/api/tasks",
        headers=headers,
        json={"platform": "Indeed", "dry_run": True},
    ).json()

    task_id = task["id"]

    # Simulate worker marking it failed
    _MEMORY_TASKS[task_id]["status"] = "failed"
    _MEMORY_TASKS[task_id]["error_details"] = "Network timeout"

    # Retry task
    res = test_client.post(f"/api/tasks/{task_id}/retry", headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "queued"

    # Verify task state
    check = test_client.get(f"/api/tasks/{task_id}", headers=headers)
    data = check.json()
    assert data["status"] == "queued"
    assert data["retry_count"] == 1
    assert data["error_details"] is None


def test_retry_queued_task_returns_400(test_client: TestClient):
    """Non-failed task cannot be retried."""
    headers = {"Authorization": "Bearer test-token-ivan"}
    task = test_client.post(
        "/api/tasks",
        headers=headers,
        json={"platform": "Naukri", "dry_run": True},
    ).json()

    res = test_client.post(f"/api/tasks/{task['id']}/retry", headers=headers)
    assert res.status_code == 400


def test_execute_automation_task_dry_run():
    """Automation runner in dry-run mode completes without real submissions."""
    progress_calls = []

    async def mock_run(**kwargs):
        kwargs["update_task_state"]("completed", 100, "Done")

    with patch("services.platform_automation.runner.run_platform_automation_task", side_effect=mock_run):
        result = execute_automation_task(
            task_id="test-123",
            platform="Naukri",
            payload={"max_applications": 5, "keywords": ["Python"]},
            dry_run=True,
            progress_callback=lambda p, m: progress_calls.append((p, m)),
            cancel_check_callback=lambda: False,
        )

        assert result["status"] == "completed"
        assert result["dry_run"] is True
        assert result["applications_submitted"] == 0
        assert any(p == 100 for p, _ in progress_calls)


def test_execute_automation_task_cancellation():
    """Automation runner aborts immediately when cancellation callback triggers."""
    is_cancelled = False

    def progress_cb(p, m):
        nonlocal is_cancelled
        if p >= 40:
            is_cancelled = True

    async def mock_run(**kwargs):
        kwargs["update_task_state"]("running", 20, "Starting")
        kwargs["update_task_state"]("running", 50, "Searching")

    with patch("services.platform_automation.runner.run_platform_automation_task", side_effect=mock_run):
        with pytest.raises(TaskCancelledException):
            execute_automation_task(
                task_id="test-cancel",
                platform="Internshala",
                payload={"max_applications": 5},
                dry_run=True,
                progress_callback=progress_cb,
                cancel_check_callback=lambda: is_cancelled,
            )



def test_sanitize_text_redacts_credentials():
    """Sensitive credentials and JWT tokens are thoroughly redacted."""
    raw = "User password=SuperSecretPassword123 with token: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.xyz and Bearer test-key-123"
    sanitized = sanitize_text(raw)
    assert "SuperSecretPassword123" not in sanitized
    assert "[REDACTED]" in sanitized


def test_enqueue_task_dynamic_payload(test_client: TestClient):
    """Task payload dynamically preserves custom task_type, keywords, locations, and limits."""
    headers = {"Authorization": "Bearer test-token-dynamic-user"}
    payload = {
        "platform": "Indeed",
        "task_type": "profile_update",
        "dry_run": True,
        "max_applications": 40,
        "keywords": ["React Specialist", "Node.js Architect"],
        "locations": ["Bengaluru", "Pune", "Remote"],
        "force": False,
    }
    res = test_client.post("/api/tasks", headers=headers, json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["task_type"] == "profile_update"
    assert data["platform"] == "Indeed"
    assert data["payload"]["keywords"] == ["React Specialist", "Node.js Architect"]
    assert data["payload"]["locations"] == ["Bengaluru", "Pune", "Remote"]
    assert data["payload"]["max_applications"] == 40


def test_enqueue_task_live_submission_without_confirmation_fails_422(test_client: TestClient):
    """Enabling dry_run=False without user_confirmed_real_submission=True is rejected with 422."""
    headers = {"Authorization": "Bearer test-token-unsafe-user"}
    payload = {
        "platform": "Naukri",
        "dry_run": False,
        "user_confirmed_real_submission": False,
    }
    res = test_client.post("/api/tasks", headers=headers, json=payload)
    assert res.status_code == 422
    assert "Live job submission is disabled for safety" in str(res.json())


def test_enqueue_task_live_submission_with_confirmation_succeeds(test_client: TestClient):
    """Enabling dry_run=False with user_confirmed_real_submission=True succeeds."""
    headers = {"Authorization": "Bearer test-token-safe-confirmed-user"}
    payload = {
        "platform": "Naukri",
        "dry_run": False,
        "user_confirmed_real_submission": True,
        "max_applications": 10,
    }
    res = test_client.post("/api/tasks", headers=headers, json=payload)
    assert res.status_code == 201
    assert res.json()["dry_run"] is False


def test_enqueue_task_invalid_jwt_signature():
    """Enqueueing task with invalid JWT signature must return 401."""
    import time
    import jwt

    test_secret = "test-secret-at-least-32-bytes-long-123456"
    test_settings = Settings(
        ENVIRONMENT="production",
        SUPABASE_JWT_SECRET=test_secret,
    )
    client = TestClient(create_app(settings=test_settings))

    payload = {
        "sub": "55555555-5555-5555-5555-555555555555",
        "email": "hacker@example.com",
        "role": "authenticated",
        "aud": "authenticated",
        "exp": int(time.time()) + 3600,
    }
    bad_token = jwt.encode(payload, "wrong-secret-key-at-least-32-bytes-long", algorithm="HS256")
    headers = {"Authorization": f"Bearer {bad_token}"}

    res = client.post("/api/v1/tasks", headers=headers, json={"platform": "Naukri", "dry_run": True})
    assert res.status_code == 401
    assert "invalid authentication token signature" in res.json()["error"]["message"].lower()


def test_enqueue_task_expired_jwt_token():
    """Enqueueing task with expired JWT token must return 401 with expired message."""
    import time
    import jwt

    test_secret = "test-secret-at-least-32-bytes-long-123456"
    test_settings = Settings(
        ENVIRONMENT="production",
        SUPABASE_JWT_SECRET=test_secret,
    )
    client = TestClient(create_app(settings=test_settings))

    payload = {
        "sub": "55555555-5555-5555-5555-555555555555",
        "email": "expired@example.com",
        "role": "authenticated",
        "aud": "authenticated",
        "exp": int(time.time()) - 3600,
    }
    expired_token = jwt.encode(payload, test_secret, algorithm="HS256")
    headers = {"Authorization": f"Bearer {expired_token}"}

    res = client.post("/api/v1/tasks", headers=headers, json={"platform": "Naukri", "dry_run": True})
    assert res.status_code == 401
    assert "expired" in res.json()["error"]["message"].lower()


def test_enqueue_task_with_valid_asymmetric_es256_token():
    """Enqueueing task with a valid asymmetric ES256 Supabase token succeeds."""
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

    target_user_id = "66666666-6666-6666-6666-666666666666"
    payload = {
        "sub": target_user_id,
        "email": "task.es256@example.com",
        "role": "authenticated",
        "aud": "authenticated",
        "iss": "https://prodproj.supabase.co/auth/v1",
        "exp": int(time.time()) + 3600,
    }
    token = jwt.encode(payload, priv_key, algorithm="ES256", headers={"kid": "key-es256-tasks"})

    mock_signing_key = MagicMock()
    mock_signing_key.key = pub_key

    mock_jwks_client = MagicMock()
    mock_jwks_client.get_signing_key_from_jwt.return_value = mock_signing_key

    headers = {"Authorization": f"Bearer {token}"}
    task_payload = {"platform": "Naukri", "dry_run": True, "keywords": ["Python Developer"]}

    with patch("core.auth.get_jwks_client", return_value=mock_jwks_client):
        res = client.post("/api/v1/tasks", headers=headers, json=task_payload)
        assert res.status_code == 201
        data = res.json()
        assert data["user_id"] == target_user_id
        assert data["status"] == "queued"
