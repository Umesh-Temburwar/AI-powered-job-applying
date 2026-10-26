import asyncio
import pytest
from services.platform_automation.base import ApplyResult, JobOpportunity
from services.platform_automation.indeed import IndeedPlatformAdapter
from services.platform_automation.internshala import InternshalaPlatformAdapter
from services.platform_automation.linkedin import LinkedInPlatformAdapter
from services.platform_automation.naukri import NaukriPlatformAdapter
from services.platform_automation.runner import get_adapter_for_platform, run_platform_automation_task
from services.portal_registry import PORTAL_REGISTRY, get_all_portals, get_portal
from services.connection_service import connection_service


@pytest.fixture
def anyio_backend():
    return "asyncio"


def test_portal_registry_completeness():
    portals = get_all_portals()
    expected_ids = {"naukri", "internshala", "indeed", "linkedin", "foundit", "wellfound", "glassdoor", "cutshort"}
    registered_ids = {p.id for p in portals}
    assert expected_ids.issubset(registered_ids)

    # Check Naukri definition
    naukri = get_portal("naukri")
    assert naukri is not None
    assert naukri.name == "Naukri.com"
    assert naukri.capabilities.public_job_discovery is True
    assert naukri.capabilities.application_submission is True

    # Check LinkedIn definition
    linkedin = get_portal("linkedin")
    assert linkedin is not None
    assert linkedin.name == "LinkedIn Jobs"
    assert "manual_browser_login" in linkedin.supported_auth_methods


def test_platform_adapter_resolution():
    naukri_adapter = get_adapter_for_platform("Naukri")
    assert isinstance(naukri_adapter, NaukriPlatformAdapter)
    assert naukri_adapter.platform_name == "Naukri"

    internshala_adapter = get_adapter_for_platform("Internshala")
    assert isinstance(internshala_adapter, InternshalaPlatformAdapter)
    assert internshala_adapter.platform_name == "Internshala"

    indeed_adapter = get_adapter_for_platform("Indeed")
    assert isinstance(indeed_adapter, IndeedPlatformAdapter)
    assert indeed_adapter.platform_name == "Indeed"

    linkedin_adapter = get_adapter_for_platform("LinkedIn")
    assert isinstance(linkedin_adapter, LinkedInPlatformAdapter)
    assert linkedin_adapter.platform_name == "LinkedIn"


def test_naukri_url_generation_and_dry_run():
    adapter = NaukriPlatformAdapter()
    urls = adapter.build_search_urls(keywords=["Full Stack Developer"], locations=["Pune"])
    assert len(urls) == 1
    assert "full-stack-developer-jobs-in-pune" in urls[0]

    job = JobOpportunity(
        job_title="Full Stack Developer",
        company="Persistent Systems",
        job_url="https://www.naukri.com/job-listings-12345",
        platform="Naukri",
        location="Pune",
        salary="₹8 - 14 LPA",
    )

    # Dry run review mode
    res = adapter.apply_to_job(
        driver=None,
        job=job,
        user_profile={"full_name": "Alice Tester"},
        resume_path=None,
        dry_run=True,
    )
    assert res.success is True
    assert res.status == "review_needed"
    assert "[DRY RUN]" in res.notes

    # Live submission without explicit confirmation must fail safely
    live_res = adapter.apply_to_job(
        driver=None,
        job=job,
        user_profile={"full_name": "Alice Tester"},
        resume_path=None,
        dry_run=False,
        user_confirmed=False,
    )
    assert live_res.success is False
    assert live_res.status == "review_needed"
    assert "confirmation" in live_res.error.lower()


def test_internshala_cover_letter_and_slugs():
    adapter = InternshalaPlatformAdapter()
    urls = adapter.build_search_urls(keywords=["react developer", "node"], locations=["Remote"])
    assert any("react-js-development" in u for u in urls)

    profile = {
        "full_name": "Alice Developer",
        "email": "alice@example.com",
        "phone": "+91 9999988888",
        "skills": ["React.js", "Node.js", "TypeScript"],
        "summary": "Enthusiastic full-stack engineer with hands-on project experience.",
    }
    cover_letter = adapter.generate_cover_letter(profile, "React Engineer")
    assert "Alice Developer" in cover_letter
    assert "React.js, Node.js" in cover_letter
    assert "alice@example.com" in cover_letter


def test_indeed_url_generation():
    adapter = IndeedPlatformAdapter()
    urls = adapter.build_search_urls(keywords=["Software Engineer"], locations=["Bengaluru"])
    assert len(urls) == 1
    assert "Software+Engineer" in urls[0]
    assert "5QWDV" in urls[0]  # Easily Apply filter tag


def test_linkedin_url_generation_and_dry_run():
    adapter = LinkedInPlatformAdapter()
    urls = adapter.build_search_urls(keywords=["Full Stack Developer"], locations=["Bengaluru"])
    assert len(urls) == 1
    assert "f_AL=true" in urls[0]
    assert "Full+Stack+Developer" in urls[0]

    job = JobOpportunity(
        job_title="Senior Python Engineer",
        company="Global Tech",
        job_url="https://www.linkedin.com/jobs/view/999888",
        platform="LinkedIn",
        location="Bengaluru",
        is_easy_apply=True,
    )
    dry_res = adapter.apply_to_job(
        driver=None,
        job=job,
        user_profile={"full_name": "Bob Developer"},
        resume_path=None,
        dry_run=True,
    )
    assert dry_res.success is True
    assert dry_res.status == "review_needed"
    assert "[Dry-run]" in dry_res.notes


def test_connection_service_lifecycle():
    user_id = "test_user_conn_lifecycle"
    # 1. Initially not connected
    connections = connection_service.get_user_connections(user_id=user_id)
    assert len(connections) >= 8

    # 2. Open portal
    open_res = connection_service.open_platform_portal(user_id=user_id, platform="naukri")
    assert open_res.status == "connecting"

    # 3. Disconnect
    disc_res = connection_service.disconnect_platform(user_id=user_id, platform="naukri")
    assert disc_res.status == "not_connected"


@pytest.mark.anyio
async def test_automation_runner_rejects_incomplete_profile():
    state_updates = []

    def update_task_state(status_val, progress_val, message_val, **kwargs):
        state_updates.append((status_val, progress_val, message_val))

    def is_cancelled():
        return False

    task_id = "test-task-incomplete"
    user_id = "usr_blank_candidate"
    record = {
        "platform": "Naukri",
        "dry_run": True,
        "task_type": "job_apply",
        "payload": {},
    }

    from services.profile_service import _MEMORY_PROFILES
    _MEMORY_PROFILES[user_id] = {
        "id": user_id,
        "full_name": "",  # Missing mandatory name
        "email": None,
        "phone": None,
        "skills": [],
    }

    await run_platform_automation_task(
        task_id=task_id,
        user_id=user_id,
        record=record,
        update_task_state=update_task_state,
        is_cancelled=is_cancelled,
    )

    final_status = state_updates[-1][0]
    final_msg = state_updates[-1][2]
    assert final_status == "failed"
    assert "Profile incomplete" in final_msg
    assert "Full Name" in final_msg


@pytest.mark.anyio
async def test_automation_runner_completes_dry_run_for_valid_profile():
    state_updates = []

    def update_task_state(status_val, progress_val, message_val, **kwargs):
        state_updates.append((status_val, progress_val, message_val))

    def is_cancelled():
        return False

    user_id = "usr_valid_candidate"
    task_id = "test-task-valid"
    from services.profile_service import _MEMORY_PROFILES
    _MEMORY_PROFILES[user_id] = {
        "id": user_id,
        "full_name": "Valid Candidate",
        "email": "valid@example.com",
        "phone": "+91 9876543210",
        "skills": ["React", "Python", "PostgreSQL"],
    }

    record = {
        "platform": "Internshala",
        "dry_run": True,
        "task_type": "job_apply",
        "payload": {
            "keywords": ["Full Stack Developer"],
            "locations": ["Remote"],
            "max_applications": 2,
        },
    }

    await run_platform_automation_task(
        task_id=task_id,
        user_id=user_id,
        record=record,
        update_task_state=update_task_state,
        is_cancelled=is_cancelled,
    )

    statuses = [u[0] for u in state_updates]
    assert "running" in statuses
    assert state_updates[-1][0] == "completed"
    assert state_updates[-1][1] == 100
    assert "[DRY RUN]" in state_updates[-1][2]


def test_connections_api_endpoints_and_lifecycle(client):
    auth_headers = {"Authorization": "Bearer test-token-candidate-connections"}

    # 1. Registry endpoint
    reg_res = client.get("/api/v1/connections/registry")
    assert reg_res.status_code == 200
    data = reg_res.json()
    assert "portals" in data
    portal_names = [p["name"] for p in data["portals"]]
    assert "Naukri.com" in portal_names
    assert "Internshala" in portal_names
    assert "Indeed" in portal_names
    assert "LinkedIn Jobs" in portal_names

    # 2. List connections (both without and with trailing slash)
    list_res1 = client.get("/api/v1/connections", headers=auth_headers)
    assert list_res1.status_code == 200
    list_res2 = client.get("/api/v1/connections/", headers=auth_headers)
    assert list_res2.status_code == 200
    assert len(list_res1.json()["connections"]) >= 4

    # 3. Test open & connect on Naukri (both POST and GET supported)
    open_post = client.post("/api/v1/connections/naukri/open", headers=auth_headers)
    assert open_post.status_code == 200
    assert open_post.json()["success"] is True

    open_get = client.get("/api/v1/connections/naukri/open", headers=auth_headers)
    assert open_get.status_code == 200

    conn_post = client.post("/api/v1/connections/naukri/connect", headers=auth_headers)
    assert conn_post.status_code == 200

    conn_get = client.get("/api/v1/connections/naukri/connect", headers=auth_headers)
    assert conn_get.status_code == 200

    # 4. Verify with account email payload
    ver_res = client.post(
        "/api/v1/connections/naukri/verify",
        headers=auth_headers,
        json={"account_email": "candidate@gmail.com", "confirmed": True},
    )
    assert ver_res.status_code == 200
    assert ver_res.json()["status"] == "connected"
    assert ver_res.json()["connection"]["account_email"] == "candidate@gmail.com"

    # 5. Disconnect
    disc_res = client.post("/api/v1/connections/naukri/disconnect", headers=auth_headers)
    assert disc_res.status_code == 200
    assert disc_res.json()["status"] == "not_connected"


def test_connections_multi_platform_verification(client):
    auth_headers = {"Authorization": "Bearer test-token-candidate-connections"}
    for plat in ["internshala", "indeed", "linkedin"]:
        # Connect
        c_res = client.post(f"/api/v1/connections/{plat}/connect", headers=auth_headers)
        assert c_res.status_code == 200
        assert c_res.json()["success"] is True

        # Verify
        v_res = client.post(
            f"/api/v1/connections/{plat}/verify",
            headers=auth_headers,
            json={"account_email": f"test_{plat}@domain.com", "confirmed": True},
        )
        assert v_res.status_code == 200
        assert v_res.json()["status"] == "connected"


def test_connections_sync_env(client):
    auth_headers = {"Authorization": "Bearer test-token-candidate-connections"}
    sync_res = client.post("/api/v1/connections/sync-env", headers=auth_headers)
    assert sync_res.status_code == 200
    data = sync_res.json()
    assert "connections" in data
    assert len(data["connections"]) >= 4
