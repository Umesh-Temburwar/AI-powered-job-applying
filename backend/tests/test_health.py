from fastapi.testclient import TestClient


def test_root_welcome_page_html(client: TestClient):
    """Verify root GET / with HTML accept header returns status 200 and visual status page."""
    response = client.get("/", headers={"Accept": "text/html"})
    assert response.status_code == 200
    assert "REST API: ON HO GAYI HAI" in response.text
    assert "AI-POWERED-JOB-APPLYING REST API" in response.text
    assert "http://localhost:5173" in response.text


def test_root_welcome_json(client: TestClient):
    """Verify root GET / with JSON accept header returns status 200 with structured status."""
    response = client.get("/", headers={"Accept": "application/json"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "REST API on ho gayi hai" in data["message"]
    assert data["port"] == 8001


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
