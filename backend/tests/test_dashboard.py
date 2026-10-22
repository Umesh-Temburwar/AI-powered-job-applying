from fastapi.testclient import TestClient


def test_dashboard_summary_contract(client: TestClient):
    """Verify GET /api/v1/dashboard/summary delivers typed live summary payload."""
    response = client.get("/api/v1/dashboard/summary")
    assert response.status_code == 200

    data = response.json()
    assert data["mode"] == "live"
    assert isinstance(data["total_applications"], int)
    assert isinstance(data["pending_review"], int)
    assert isinstance(data["failed_tasks"], int)
    assert isinstance(data["active_tasks"], int)
    assert isinstance(data["platform_breakdown"], list)
    assert data["automation_status"] in [
        "idle",
        "queued",
        "running",
        "paused",
        "review_required",
        "completed",
        "failed",
        "error",
    ]


def test_dashboard_summary_authenticated_isolation(client: TestClient):
    """Verify dashboard summary returns user-specific records and activities."""
    headers_user_a = {"Authorization": "Bearer test-token-user-a"}
    headers_user_b = {"Authorization": "Bearer test-token-user-b"}

    # Record application for User A
    app_payload = {
        "job_title": "Full Stack Engineer",
        "company": "Real Corp Inc",
        "job_url": "https://example.com/job/101",
        "platform": "Naukri",
        "status": "applied",
        "location": "Pune",
        "salary": "₹12 LPA",
    }
    create_res = client.post("/api/v1/applications", json=app_payload, headers=headers_user_a)
    assert create_res.status_code == 201

    # User A summary should show at least 1 application
    res_a = client.get("/api/v1/dashboard/summary", headers=headers_user_a)
    assert res_a.status_code == 200
    data_a = res_a.json()
    assert data_a["total_applications"] >= 1
    assert data_a["successful_submissions"] >= 1
    assert len(data_a["platform_breakdown"]) >= 1

    # User A activity should show the application event
    act_a = client.get("/api/v1/dashboard/activities", headers=headers_user_a)
    assert act_a.status_code == 200
    activities_a = act_a.json()
    assert len(activities_a) >= 1
    assert "Real Corp Inc" in activities_a[0]["description"]

    # User B summary should be completely isolated (0 applications if none added)
    res_b = client.get("/api/v1/dashboard/summary", headers=headers_user_b)
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["total_applications"] == 0
    assert data_b["platform_breakdown"] == []

    act_b = client.get("/api/v1/dashboard/activities", headers=headers_user_b)
    assert act_b.status_code == 200
    assert act_b.json() == []
