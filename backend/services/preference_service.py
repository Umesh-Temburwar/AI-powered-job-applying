import logging
from datetime import datetime, timezone
from typing import Any

from core.config import get_settings
from schemas.preferences import (
    JobPreferencesResponse,
    JobPreferencesUpdateRequest,
    PreferenceSuggestionsResponse,
)

logger = logging.getLogger("preferences")

# In-memory preferences registry for test/mock runs
_MEMORY_PREFERENCES: dict[str, dict[str, Any]] = {}

ROLE_MAPPINGS = [
    (["react", "vue", "angular", "frontend", "html", "css", "tailwind", "javascript"], "Frontend Developer"),
    (["node.js", "express", "fastapi", "django", "flask", "backend", "python", "java", "sql"], "Backend Developer"),
    (["react", "node.js", "python", "fullstack", "full stack", "mongodb", "postgresql"], "Full Stack Developer"),
    (["docker", "kubernetes", "aws", "azure", "gcp", "devops", "ci/cd", "linux"], "DevOps Engineer"),
    (["pandas", "numpy", "tensorflow", "pytorch", "machine learning", "data science"], "Data Scientist / ML Engineer"),
    (["selenium", "playwright", "automation", "qa", "pytest", "jest", "testing"], "QA Automation Engineer"),
    (["fresher", "intern", "trainee", "entry level"], "Software Engineer Intern"),
]


from core.supabase import get_supabase_client


def _get_supabase_client():
    """Return shared singleton authenticated Supabase client."""
    return get_supabase_client()


async def get_user_preferences(user_id: str) -> JobPreferencesResponse:
    """Get candidate job targeting preferences."""
    client = _get_supabase_client() if not user_id.startswith("usr_") else None

    if client:
        try:
            res = client.table("job_preferences").select("*").eq("user_id", user_id).limit(1).execute()
            if res.data and len(res.data) > 0:
                r = res.data[0]
                return JobPreferencesResponse(
                    id=str(r["id"]),
                    user_id=str(r["user_id"]),
                    job_titles=r.get("job_titles") or [],
                    locations=r.get("locations") or [],
                    experience_level=str(r.get("experience_level") or "entry_level"),
                    employment_types=r.get("employment_types") or ["full_time"],
                    min_salary=float(r["min_salary"]) if r.get("min_salary") is not None else None,
                    max_salary=float(r["max_salary"]) if r.get("max_salary") is not None else None,
                    selected_platforms=r.get("selected_platforms") or ["naukri", "internshala", "indeed"],
                    daily_application_limit=int(r.get("daily_application_limit") or 25),
                    require_manual_review=bool(r.get("require_manual_review", True)),
                    updated_at=r.get("updated_at"),
                )
        except Exception as e:
            logger.error("Error fetching job preferences from Supabase: %s", e)

    # In-memory fallback
    if user_id not in _MEMORY_PREFERENCES:
        _MEMORY_PREFERENCES[user_id] = {
            "id": f"pref_{user_id}",
            "user_id": user_id,
            "job_titles": ["Full Stack Developer", "React Developer", "Software Engineer"],
            "locations": ["Remote", "Pune", "Bengaluru"],
            "experience_level": "entry_level",
            "employment_types": ["full_time"],
            "min_salary": 6.0,
            "max_salary": 14.0,
            "selected_platforms": ["naukri", "internshala", "indeed"],
            "daily_application_limit": 25,
            "require_manual_review": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

    p = _MEMORY_PREFERENCES[user_id]
    return JobPreferencesResponse(**p)


async def update_user_preferences(user_id: str, updates: JobPreferencesUpdateRequest) -> JobPreferencesResponse:
    """Save or update candidate targeting preferences."""
    client = _get_supabase_client() if not user_id.startswith("usr_") else None
    now_iso = datetime.now(timezone.utc).isoformat()

    update_dict: dict[str, Any] = {"updated_at": now_iso}

    if updates.job_titles is not None:
        update_dict["job_titles"] = updates.job_titles
    if updates.locations is not None:
        update_dict["locations"] = updates.locations
    if updates.experience_level is not None:
        update_dict["experience_level"] = updates.experience_level
    if updates.employment_types is not None:
        update_dict["employment_types"] = updates.employment_types
    if updates.min_salary is not None:
        update_dict["min_salary"] = updates.min_salary
    if updates.max_salary is not None:
        update_dict["max_salary"] = updates.max_salary
    if updates.selected_platforms is not None:
        update_dict["selected_platforms"] = updates.selected_platforms
    if updates.daily_application_limit is not None:
        update_dict["daily_application_limit"] = min(100, max(1, updates.daily_application_limit))
    if updates.require_manual_review is not None:
        update_dict["require_manual_review"] = updates.require_manual_review

    if client:
        try:
            res = client.table("job_preferences").update(update_dict).eq("user_id", user_id).execute()
            if res.data and len(res.data) > 0:
                r = res.data[0]
                return JobPreferencesResponse(
                    id=str(r["id"]),
                    user_id=str(r["user_id"]),
                    job_titles=r.get("job_titles") or [],
                    locations=r.get("locations") or [],
                    experience_level=str(r.get("experience_level") or "entry_level"),
                    employment_types=r.get("employment_types") or ["full_time"],
                    min_salary=float(r["min_salary"]) if r.get("min_salary") is not None else None,
                    max_salary=float(r["max_salary"]) if r.get("max_salary") is not None else None,
                    selected_platforms=r.get("selected_platforms") or ["naukri", "internshala", "indeed"],
                    daily_application_limit=int(r.get("daily_application_limit") or 25),
                    require_manual_review=bool(r.get("require_manual_review", True)),
                    updated_at=r.get("updated_at"),
                )
        except Exception as e:
            logger.error("Error updating preferences in Supabase: %s", e)

    # In-memory store
    if user_id not in _MEMORY_PREFERENCES:
        await get_user_preferences(user_id)
    _MEMORY_PREFERENCES[user_id].update(update_dict)
    return JobPreferencesResponse(**_MEMORY_PREFERENCES[user_id])


async def suggest_preferences_from_skills(user_id: str, skills: list[str]) -> PreferenceSuggestionsResponse:
    """Suggest job roles and search keywords based on candidate skills."""
    normalized_skills = [s.lower().strip() for s in skills]
    suggested_titles: list[str] = []

    for triggers, title in ROLE_MAPPINGS:
        if any(t in normalized_skills or any(t in s for s in normalized_skills) for t in triggers):
            if title not in suggested_titles:
                suggested_titles.append(title)

    if not suggested_titles:
        suggested_titles = ["Full Stack Developer", "Software Engineer", "Associate Engineer"]

    # Top search keywords from skills
    suggested_keywords = list(dict.fromkeys(skills))[:8]

    return PreferenceSuggestionsResponse(
        suggested_titles=suggested_titles,
        suggested_keywords=suggested_keywords,
        source_skills=skills,
    )
