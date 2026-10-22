import asyncio
import pytest
from services.platform_automation.base import ApplyResult, JobOpportunity
from services.platform_automation.indeed import IndeedPlatformAdapter
from services.platform_automation.internshala import InternshalaPlatformAdapter
from services.platform_automation.naukri import NaukriPlatformAdapter
from services.platform_automation.runner import get_adapter_for_platform, run_platform_automation_task


@pytest.fixture
def anyio_backend():
    return "asyncio"


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


@pytest.mark.anyio
async def test_automation_runner_rejects_incomplete_profile():
    state_updates = []

    def update_task_state(status_val, progress_val, message_val, **kwargs):
        state_updates.append((status_val, progress_val, message_val))

    def is_cancelled():
        return False

    # Mock user with blank name
    task_id = "test-task-incomplete"
    user_id = "usr_blank_candidate"
    record = {
        "platform": "Naukri",
        "dry_run": True,
        "task_type": "job_apply",
        "payload": {},
    }

    # Clear any memory profile so it starts empty
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

    # Must fail during stage 1 validation
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
