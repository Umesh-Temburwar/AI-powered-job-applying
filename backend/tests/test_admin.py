from fastapi.testclient import TestClient


def test_admin_stats_endpoint(client: TestClient):
    """Verify GET /api/v1/admin/stats returns valid system telemetry."""
    response = client.get("/api/v1/admin/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_candidates" in data
    assert "total_applications" in data
    assert "applied_today" in data
    assert "success_rate_percent" in data
    assert "active_workers" in data
    assert "total_connected_portals" in data
    assert data["system_status"] == "operational"


def test_admin_portals_endpoints(client: TestClient):
    """Verify fetching and updating portal administrative configurations."""
    # 1. Fetch portal configs
    response = client.get("/api/v1/admin/portals")
    assert response.status_code == 200
    portals = response.json()
    assert len(portals) == 8
    naukri = next(p for p in portals if p["id"] == "naukri")
    assert naukri["name"] == "Naukri.com"
    assert naukri["is_enabled"] is True

    # 2. Update naukri daily limit and delay
    update_res = client.post(
        "/api/v1/admin/portals/naukri/config",
        json={"daily_limit": 65, "delay_seconds": 30, "is_enabled": False},
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["daily_limit"] == 65
    assert updated_data["delay_seconds"] == 30
    assert updated_data["is_enabled"] is False

    # 3. Invalid portal update should return 404
    invalid_res = client.post(
        "/api/v1/admin/portals/unknown_xyz/config",
        json={"daily_limit": 20},
    )
    assert invalid_res.status_code == 404

    # 4. Restore naukri portal to enabled
    client.post(
        "/api/v1/admin/portals/naukri/config",
        json={"daily_limit": 50, "delay_seconds": 25, "is_enabled": True},
    )


def test_admin_candidates_endpoints(client: TestClient):
    """Verify candidate list and status modification endpoints."""
    # 1. Fetch candidates
    response = client.get("/api/v1/admin/candidates?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert "candidates" in data
    assert "total" in data
    assert len(data["candidates"]) >= 1

    # 2. Update candidate status
    status_res = client.post(
        "/api/v1/admin/candidates/usr_cand_01/status",
        json={"status": "suspended"},
    )
    assert status_res.status_code == 200
    assert status_res.json()["account_status"] == "suspended"

    # Reactivate candidate
    status_res_reactivate = client.post(
        "/api/v1/admin/candidates/usr_cand_01/status",
        json={"status": "active"},
    )
    assert status_res_reactivate.status_code == 200
    assert status_res_reactivate.json()["account_status"] == "active"


def test_admin_audit_logs_endpoint(client: TestClient):
    """Verify admin audit logs retrieval."""
    response = client.get("/api/v1/admin/logs?limit=25")
    assert response.status_code == 200
    data = response.json()
    assert "logs" in data
    assert isinstance(data["logs"], list)
    assert len(data["logs"]) >= 1
    first_log = data["logs"][0]
    assert "level" in first_log
    assert "portal" in first_log
    assert "action" in first_log
    assert "details" in first_log


def test_admin_forbidden_for_non_admin_users(client: TestClient):
    """Verify that unauthorized non-admin tokens are blocked with 403 Forbidden."""
    headers_non_admin = {"Authorization": "Bearer test-non-admin-token"}
    response = client.get("/api/v1/admin/stats", headers=headers_non_admin)
    assert response.status_code == 403
    assert "administrator permissions" in response.json()["detail"].lower()
