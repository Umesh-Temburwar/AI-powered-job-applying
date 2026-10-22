from fastapi.testclient import TestClient


def test_dashboard_summary_contract(client: TestClient):
    """Verify GET /api/v1/dashboard/summary delivers typed demo summary payload."""
    response = client.get("/api/v1/dashboard/summary")
    assert response.status_code == 200

    data = response.json()
    assert data["mode"] == "demo"
    assert isinstance(data["total_applications"], int)
    assert isinstance(data["pending_review"], int)
    assert isinstance(data["failed_tasks"], int)
    assert data["automation_status"] in [
        "idle",
        "running",
        "paused",
        "review_required",
        "error",
    ]
    assert "sample" in data["message"].lower() or "demo" in data["message"].lower()


def test_dashboard_summary_integrity(client: TestClient):
    """Verify demo summary values meet expected Phase 3 baseline."""
    response = client.get("/api/v1/dashboard/summary")
    data = response.json()
    assert data["total_applications"] >= 0
    assert data["pending_review"] >= 0
    assert data["failed_tasks"] >= 0
