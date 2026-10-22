import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from core.config import get_settings
from schemas.profile import (
    AdditionalInfo,
    CertificationItem,
    EducationItem,
    ExperienceItem,
    OnboardingStatusResponse,
    ProfileResponse,
    ProfileUpdateRequest,
    ProjectItem,
)

logger = logging.getLogger("profile")

# In-memory storage for test/mock runs
_MEMORY_PROFILES: dict[str, dict[str, Any]] = {}


def _get_supabase_client():
    settings = get_settings()
    if not settings.SUPABASE_URL or not (
        settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
    ):
        return None
    try:
        from supabase import create_client
        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
        return create_client(settings.SUPABASE_URL, key)
    except Exception as exc:
        logger.warning("Could not initialize Supabase client for profile: %s", exc)
        return None


def calculate_completion(profile_data: dict[str, Any]) -> tuple[int, list[str]]:
    """Calculate profile completion percentage (0-100) and identify missing fields."""
    score = 0
    missing = []

    # 1. Identity (15%)
    if profile_data.get("full_name") and len(str(profile_data["full_name"]).strip()) > 2:
        score += 15
    else:
        missing.append("Full Name")

    # 2. Contact details (15%)
    contact_ok = bool(profile_data.get("phone") or profile_data.get("email"))
    if contact_ok:
        score += 15
    else:
        missing.append("Phone or Email")

    # 3. Education (20%)
    edu = profile_data.get("education") or []
    if isinstance(edu, list) and len(edu) > 0:
        score += 20
    else:
        missing.append("Education Details")

    # 4. Skills (20%)
    skills = profile_data.get("skills") or []
    if isinstance(skills, list) and len(skills) >= 3:
        score += 20
    elif isinstance(skills, list) and len(skills) > 0:
        score += 10
        missing.append("At least 3 Skills")
    else:
        missing.append("Key Skills")

    # 5. Experience / Fresher (15%)
    exp = profile_data.get("experience") or []
    add_info = profile_data.get("additional_info") or {}
    is_fresher = add_info.get("is_fresher", False)
    if is_fresher or (isinstance(exp, list) and len(exp) > 0):
        score += 15
    else:
        missing.append("Work Experience or Fresher selection")

    # 6. Projects / Certifications (15%)
    projs = profile_data.get("projects") or []
    certs = profile_data.get("certifications") or []
    if (isinstance(projs, list) and len(projs) > 0) or (isinstance(certs, list) and len(certs) > 0):
        score += 15
    else:
        missing.append("Projects or Certifications")

    return min(100, score), missing


def _row_to_profile(row: dict[str, Any]) -> ProfileResponse:
    pct, missing = calculate_completion(row)
    
    # Parse education
    edu_list = [
        EducationItem(**e) if isinstance(e, dict) else e 
        for e in row.get("education") or []
    ]
    # Parse experience
    exp_list = [
        ExperienceItem(**x) if isinstance(x, dict) else x 
        for x in row.get("experience") or []
    ]
    # Parse projects
    proj_list = [
        ProjectItem(**p) if isinstance(p, dict) else p 
        for p in row.get("projects") or []
    ]
    # Parse certifications
    cert_list = [
        CertificationItem(**c) if isinstance(c, dict) else c 
        for c in row.get("certifications") or []
    ]
    # Parse additional info
    raw_add = row.get("additional_info") or {}
    add_info = AdditionalInfo(**raw_add) if isinstance(raw_add, dict) else AdditionalInfo()

    return ProfileResponse(
        id=str(row["id"]),
        full_name=str(row.get("full_name") or "Candidate"),
        email=row.get("email"),
        phone=row.get("phone"),
        city=row.get("city"),
        headline=row.get("headline"),
        summary=row.get("summary"),
        linkedin_url=row.get("linkedin_url"),
        github_url=row.get("github_url"),
        portfolio_url=row.get("portfolio_url"),
        education=edu_list,
        experience=exp_list,
        skills=row.get("skills") or [],
        projects=proj_list,
        certifications=cert_list,
        additional_info=add_info,
        is_onboarded=bool(row.get("is_onboarded", False)),
        onboarding_step=int(row.get("onboarding_step") or 1),
        onboarded_at=row.get("onboarded_at"),
        completion_percentage=pct,
        missing_fields=missing,
    )


async def get_or_create_profile(user_id: str, default_email: str | None = None) -> ProfileResponse:
    """Fetch user profile from Supabase or memory, seeding defaults if missing."""
    client = _get_supabase_client() if not user_id.startswith("usr_") else None
    
    if client:
        try:
            res = client.table("profiles").select("*").eq("id", user_id).limit(1).execute()
            if res.data and len(res.data) > 0:
                return _row_to_profile(res.data[0])
            
            # Seed new record
            now_iso = datetime.now(timezone.utc).isoformat()
            new_row = {
                "id": user_id,
                "full_name": (default_email.split("@")[0] if default_email else "Candidate").capitalize(),
                "email": default_email,
                "is_onboarded": False,
                "onboarding_step": 1,
                "created_at": now_iso,
                "updated_at": now_iso,
            }
            client.table("profiles").insert(new_row).execute()
            return _row_to_profile(new_row)
        except Exception as exc:
            logger.error("Supabase profile fetch error: %s", exc)
    
    # In-memory store
    if user_id not in _MEMORY_PROFILES:
        _MEMORY_PROFILES[user_id] = {
            "id": user_id,
            "full_name": (default_email.split("@")[0] if default_email else "Candidate").capitalize(),
            "email": default_email,
            "is_onboarded": False,
            "onboarding_step": 1,
            "skills": ["Full Stack Developer", "React", "Python"],
            "education": [{"degree": "B.Tech Computer Science", "institution": "State University", "year": "2024"}],
            "experience": [],
            "projects": [],
            "certifications": [],
            "additional_info": {"is_fresher": True, "notice_period_days": 15},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    return _row_to_profile(_MEMORY_PROFILES[user_id])


async def update_user_profile(user_id: str, updates: ProfileUpdateRequest) -> ProfileResponse:
    """Update profile attributes and recalculate completion."""
    client = _get_supabase_client() if not user_id.startswith("usr_") else None
    now_iso = datetime.now(timezone.utc).isoformat()

    update_dict: dict[str, Any] = {"updated_at": now_iso}

    if updates.full_name is not None:
        update_dict["full_name"] = updates.full_name
    if updates.email is not None:
        update_dict["email"] = updates.email
    if updates.phone is not None:
        update_dict["phone"] = updates.phone
    if updates.city is not None:
        update_dict["city"] = updates.city
    if updates.headline is not None:
        update_dict["headline"] = updates.headline
    if updates.summary is not None:
        update_dict["summary"] = updates.summary
    if updates.linkedin_url is not None:
        update_dict["linkedin_url"] = updates.linkedin_url
    if updates.github_url is not None:
        update_dict["github_url"] = updates.github_url
    if updates.portfolio_url is not None:
        update_dict["portfolio_url"] = updates.portfolio_url
    if updates.skills is not None:
        update_dict["skills"] = updates.skills
    if updates.education is not None:
        update_dict["education"] = [e.model_dump() for e in updates.education]
    if updates.experience is not None:
        update_dict["experience"] = [x.model_dump() for x in updates.experience]
    if updates.projects is not None:
        update_dict["projects"] = [p.model_dump() for p in updates.projects]
    if updates.certifications is not None:
        update_dict["certifications"] = [c.model_dump() for c in updates.certifications]
    if updates.additional_info is not None:
        update_dict["additional_info"] = updates.additional_info.model_dump()
    if updates.onboarding_step is not None:
        update_dict["onboarding_step"] = updates.onboarding_step
    if updates.is_onboarded is not None:
        update_dict["is_onboarded"] = updates.is_onboarded
        if updates.is_onboarded:
            update_dict["onboarded_at"] = now_iso

    if client:
        try:
            res = client.table("profiles").update(update_dict).eq("id", user_id).execute()
            if res.data and len(res.data) > 0:
                return _row_to_profile(res.data[0])
        except Exception as exc:
            logger.error("Error updating profile in Supabase: %s", exc)

    # In-memory store fallback
    if user_id not in _MEMORY_PROFILES:
        await get_or_create_profile(user_id)
    _MEMORY_PROFILES[user_id].update(update_dict)
    return _row_to_profile(_MEMORY_PROFILES[user_id])


async def get_user_onboarding_status(user_id: str) -> OnboardingStatusResponse:
    """Retrieve fast onboarding status to guide frontend routing."""
    profile = await get_or_create_profile(user_id)
    client = _get_supabase_client() if not user_id.startswith("usr_") else None
    
    has_resume = False
    has_prefs = False

    if client:
        try:
            r_res = client.table("resumes").select("id").eq("user_id", user_id).limit(1).execute()
            has_resume = bool(r_res.data and len(r_res.data) > 0)

            p_res = client.table("job_preferences").select("id, job_titles").eq("user_id", user_id).limit(1).execute()
            has_prefs = bool(p_res.data and len(p_res.data) > 0 and len(p_res.data[0].get("job_titles") or []) > 0)
        except Exception as e:
            logger.debug("Error checking status counts: %s", e)
    else:
        from services.resume_service import _MEMORY_RESUMES
        has_resume = any(r["user_id"] == user_id for r in _MEMORY_RESUMES.values())
        has_prefs = profile.is_onboarded

    return OnboardingStatusResponse(
        is_onboarded=profile.is_onboarded,
        onboarding_step=profile.onboarding_step,
        completion_percentage=profile.completion_percentage,
        missing_fields=profile.missing_fields,
        has_resume=has_resume,
        has_preferences=has_prefs,
    )
