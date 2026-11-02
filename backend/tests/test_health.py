from fastapi.testclient import TestClient


def test_root_health_check(client: TestClient):
    """Verify root GET /health returns exact status: ok and service name."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "AI-powered-job-applying API"


def test_versioned_health_check(client: TestClient):
    """Verify GET /api/v1/health returns exact status: ok and service name."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "AI-powered-job-applying API"
