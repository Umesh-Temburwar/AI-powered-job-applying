from fastapi.testclient import TestClient


def test_applications_unauthenticated_returns_401(client: TestClient):
    """Verify listing or creating applications without auth returns 401."""
    res_list = client.get("/api/v1/applications")
    assert res_list.status_code == 401

    res_post = client.post(
        "/api/v1/applications",
        json={
            "job_title": "Software Engineer",
            "company": "Tech Corp",
            "job_url": "https://example.com/job/202",
            "platform": "Indeed",
        },
    )
    assert res_post.status_code == 401


def test_applications_lifecycle_and_isolation(client: TestClient):
    """Verify application creation, listing, filtering, export, and user isolation."""
    headers_u1 = {"Authorization": "Bearer test-token-candidate-1"}
    headers_u2 = {"Authorization": "Bearer test-token-candidate-2"}

    # 1. Candidate 1 creates two applications
    app1 = client.post(
        "/api/v1/applications",
        json={
            "job_title": "React Frontend Developer",
            "company": "Alpha Tech",
            "job_url": "https://naukri.com/alpha-1",
            "platform": "Naukri",
            "status": "applied",
            "location": "Pune",
            "salary": "₹8 LPA",
            "notes": "Fast track application",
        },
        headers=headers_u1,
    )
    assert app1.status_code == 201
    app1_id = app1.json()["id"]

    app2 = client.post(
        "/api/v1/applications",
        json={
            "job_title": "Python Backend Engineer",
            "company": "Beta Labs",
            "job_url": "https://indeed.com/beta-2",
            "platform": "Indeed",
            "status": "interview",
            "location": "Remote",
            "salary": "₹14 LPA",
        },
        headers=headers_u1,
    )
    assert app2.status_code == 201
    app2_id = app2.json()["id"]

    # 2. Candidate 1 lists applications
    list_res = client.get("/api/v1/applications", headers=headers_u1)
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 2
    assert any(a["id"] == app1_id for a in list_data["items"])
    assert any(a["id"] == app2_id for a in list_data["items"])

    # 3. Filter by platform
    naukri_res = client.get("/api/v1/applications?platform=Naukri", headers=headers_u1)
    assert naukri_res.status_code == 200
    assert all(a["platform"] == "Naukri" for a in naukri_res.json()["items"])

    # 4. Search query
    search_res = client.get("/api/v1/applications?query=Beta", headers=headers_u1)
    assert search_res.status_code == 200
    assert any(a["company"] == "Beta Labs" for a in search_res.json()["items"])

    # 5. Export CSV
    export_res = client.get("/api/v1/applications/export", headers=headers_u1)
    assert export_res.status_code == 200
    assert "Job Title,Company,Platform,Status" in export_res.text
    assert "Alpha Tech" in export_res.text
    assert "Beta Labs" in export_res.text

    # 6. Candidate 2 cannot see Candidate 1's applications
    u2_list = client.get("/api/v1/applications", headers=headers_u2)
    assert u2_list.status_code == 200
    assert not any(a["id"] in (app1_id, app2_id) for a in u2_list.json()["items"])

    # 7. Candidate 2 cannot delete Candidate 1's application
    del_u2 = client.delete(f"/api/v1/applications/{app1_id}", headers=headers_u2)
    assert del_u2.status_code == 404

    # 8. Candidate 1 can delete their own application
    del_u1 = client.delete(f"/api/v1/applications/{app1_id}", headers=headers_u1)
    assert del_u1.status_code == 200

    # Verify deleted
    post_del = client.get("/api/v1/applications", headers=headers_u1)
    assert not any(a["id"] == app1_id for a in post_del.json()["items"])
