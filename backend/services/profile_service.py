import logging
import time
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

# Short TTL cache to prevent duplicate roundtrips across rapid page loads/guards
_CACHE_TTL_SECONDS = 8.0
_STATUS_CACHE: dict[str, tuple[float, OnboardingStatusResponse]] = {}
_PROFILE_CACHE: dict[str, tuple[float, ProfileResponse]] = {}


from core.supabase import get_supabase_client

_MAX_CACHE_ENTRIES = 100


def _prune_expired_cache() -> None:
    now = time.time()
    for k in list(_STATUS_CACHE.keys()):
        if now - _STATUS_CACHE[k][0] > _CACHE_TTL_SECONDS:
            _STATUS_CACHE.pop(k, None)
    if len(_STATUS_CACHE) > _MAX_CACHE_ENTRIES:
        _STATUS_CACHE.clear()

    for k in list(_PROFILE_CACHE.keys()):
        if now - _PROFILE_CACHE[k][0] > _CACHE_TTL_SECONDS:
            _PROFILE_CACHE.pop(k, None)
    if len(_PROFILE_CACHE) > _MAX_CACHE_ENTRIES:
        _PROFILE_CACHE.clear()


def invalidate_profile_cache(user_id: str) -> None:
    """Invalidate cached profile and onboarding status for a user."""
    _STATUS_CACHE.pop(user_id, None)
    _PROFILE_CACHE.pop(user_id, None)


def _get_supabase_client():
    """Return shared singleton authenticated Supabase client."""
    return get_supabase_client()


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


def _normalize_edu_item(e: Any) -> EducationItem:
    if isinstance(e, EducationItem):
        return e
    if not isinstance(e, dict):
        return EducationItem()
    return EducationItem(
        id=str(e.get("id")) if e.get("id") else None,
        degree=str(e.get("degree") or e.get("degree_name") or ""),
        institution=str(e.get("institution") or e.get("college") or e.get("university") or e.get("school") or ""),
        year=str(e["year"]) if e.get("year") else (str(e["passing_year"]) if e.get("passing_year") else None),
        score=str(e["score"]) if e.get("score") else (str(e["cgpa"]) if e.get("cgpa") else (str(e["percentage"]) if e.get("percentage") else None)),
        field_of_study=e.get("field_of_study"),
        location=e.get("location"),
    )


def _normalize_exp_item(x: Any) -> ExperienceItem:
    if isinstance(x, ExperienceItem):
        return x
    if not isinstance(x, dict):
        return ExperienceItem()
    desc = x.get("description")
    if not desc and isinstance(x.get("highlights"), list):
        desc = " ".join([str(h).lstrip("-• ") for h in x["highlights"]])
    return ExperienceItem(
        id=str(x.get("id")) if x.get("id") else None,
        company=str(x.get("company") or x.get("organization") or x.get("employer") or ""),
        role=str(x.get("role") or x.get("title") or x.get("position") or ""),
        duration=str(x.get("duration") or "") or None,
        start_date=x.get("start_date"),
        end_date=x.get("end_date"),
        description=desc,
        location=x.get("location"),
        is_current=bool(x.get("is_current", False)),
    )


def _normalize_proj_item(p: Any) -> ProjectItem:
    if isinstance(p, ProjectItem):
        return p
    if not isinstance(p, dict):
        return ProjectItem()
    techs = p.get("technologies") or []
    if not techs and p.get("tech_stack"):
        if isinstance(p["tech_stack"], list):
            techs = p["tech_stack"]
        elif isinstance(p["tech_stack"], str):
            techs = [t.strip() for t in p["tech_stack"].split(",") if t.strip()]
    return ProjectItem(
        id=str(p.get("id")) if p.get("id") else None,
        title=str(p.get("title") or p.get("name") or ""),
        description=p.get("description"),
        technologies=techs,
        url=p.get("url") or p.get("link"),
    )


def _normalize_cert_item(c: Any) -> CertificationItem:
    if isinstance(c, CertificationItem):
        return c
    if not isinstance(c, dict):
        return CertificationItem()
    return CertificationItem(
        id=str(c.get("id")) if c.get("id") else None,
        name=str(c.get("name") or c.get("title") or ""),
        issuer=c.get("issuer") or c.get("organization"),
        date=str(c.get("date") or c.get("year") or "") or None,
        url=c.get("url") or c.get("link"),
    )


def _row_to_profile(row: dict[str, Any]) -> ProfileResponse:
    pct, missing = calculate_completion(row)
    
    edu_list = [_normalize_edu_item(e) for e in row.get("education") or []]
    exp_list = [_normalize_exp_item(x) for x in row.get("experience") or []]
    proj_list = [_normalize_proj_item(p) for p in row.get("projects") or []]
    cert_list = [_normalize_cert_item(c) for c in row.get("certifications") or []]
    
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
    now = time.time()
    if user_id in _PROFILE_CACHE:
        cached_time, cached_prof = _PROFILE_CACHE[user_id]
        if now - cached_time < _CACHE_TTL_SECONDS:
            return cached_prof

    client = _get_supabase_client() if not user_id.startswith("usr_") else None
    
    if client:
        try:
            res = client.table("profiles").select("*").eq("id", user_id).limit(1).execute()
            if res.data and len(res.data) > 0:
                prof = _row_to_profile(res.data[0])
                _PROFILE_CACHE[user_id] = (now, prof)
                return prof
            
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
            prof = _row_to_profile(new_row)
            _PROFILE_CACHE[user_id] = (now, prof)
            return prof
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
    prof = _row_to_profile(_MEMORY_PROFILES[user_id])
    _PROFILE_CACHE[user_id] = (now, prof)
    return prof


async def update_user_profile(user_id: str, updates: ProfileUpdateRequest) -> ProfileResponse:
    """Update profile attributes and recalculate completion."""
    invalidate_profile_cache(user_id)
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
                prof = _row_to_profile(res.data[0])
                _PROFILE_CACHE[user_id] = (time.time(), prof)
                return prof
            else:
                # Row didn't exist in profiles table yet -> insert
                insert_dict = {"id": user_id, "created_at": now_iso, **update_dict}
                res_ins = client.table("profiles").insert(insert_dict).execute()
                if res_ins.data and len(res_ins.data) > 0:
                    prof = _row_to_profile(res_ins.data[0])
                    _PROFILE_CACHE[user_id] = (time.time(), prof)
                    return prof
        except Exception as exc:
            logger.error("Error updating profile in Supabase: %s", exc)

    # In-memory store fallback
    if user_id not in _MEMORY_PROFILES:
        await get_or_create_profile(user_id)
    _MEMORY_PROFILES[user_id].update(update_dict)
    prof = _row_to_profile(_MEMORY_PROFILES[user_id])
    _PROFILE_CACHE[user_id] = (time.time(), prof)
    return prof


async def get_user_onboarding_status(user_id: str) -> OnboardingStatusResponse:
    """Retrieve fast onboarding status to guide frontend routing."""
    now = time.time()
    if user_id in _STATUS_CACHE:
        cached_time, cached_res = _STATUS_CACHE[user_id]
        if now - cached_time < _CACHE_TTL_SECONDS:
            return cached_res

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

    res = OnboardingStatusResponse(
        is_onboarded=profile.is_onboarded,
        onboarding_step=profile.onboarding_step,
        completion_percentage=profile.completion_percentage,
        missing_fields=profile.missing_fields,
        has_resume=has_resume,
        has_preferences=has_prefs,
    )
    _STATUS_CACHE[user_id] = (now, res)
    return res


def sync_local_profile_data(data: dict[str, Any]) -> None:
    """Sync updated profile fields back to local profile_data.json for bot scripts."""
    try:
        import json
        import os
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        p_path = os.path.join(base_dir, "data", "profile_data.json") if os.path.exists(os.path.join(base_dir, "data", "profile_data.json")) else os.path.join(base_dir, "profile_data.json")
        if os.path.exists(p_path):
            existing: dict[str, Any] = {}
            try:
                with open(p_path, "r", encoding="utf-8") as f:
                    existing = json.load(f)
            except Exception:
                pass

            full_name = data.get("full_name") or existing.get("personal", {}).get("name", "")
            names = full_name.split() if full_name else []
            fname = names[0] if names else ""
            lname = " ".join(names[1:]) if len(names) > 1 else ""

            existing["personal"] = {
                "name": full_name,
                "firstname": fname,
                "lastname": lname,
                "email": data.get("email") or existing.get("personal", {}).get("email", ""),
                "phone": data.get("phone") or existing.get("personal", {}).get("phone", ""),
                "current_location": data.get("city") or existing.get("personal", {}).get("current_location", "Pune"),
                "preferred_locations": existing.get("personal", {}).get("preferred_locations", ["Pune", "Bangalore", "Mumbai", "Hyderabad", "Remote"]),
                "notice_period": "Immediate (0 Days)",
                "total_experience_years": 0 if (data.get("additional_info") or {}).get("is_fresher") else 1,
                "expected_ctc": "4.5 Lakhs",
            }
            if data.get("headline"):
                existing["naukri_headline"] = data["headline"]
            if data.get("summary"):
                existing["profile_summary"] = data["summary"]
            if data.get("skills"):
                existing["key_skills"] = data["skills"]
            if data.get("education") and len(data["education"]) > 0:
                first_edu = data["education"][0]
                existing["education"] = {
                    "degree": first_edu.get("degree") or "",
                    "field_of_study": first_edu.get("field_of_study") or "Computer Science",
                    "college": first_edu.get("institution") or first_edu.get("college") or "",
                    "location": first_edu.get("location") or "Ambajogai, Maharashtra",
                    "cgpa": first_edu.get("score") or first_edu.get("cgpa") or "",
                    "passing_year": first_edu.get("year") or first_edu.get("passing_year") or "",
                }
            if data.get("experience"):
                existing["experience"] = [
                    {
                        "role": x.get("role") or "",
                        "organization": x.get("company") or x.get("organization") or "",
                        "duration": x.get("duration") or "",
                        "location": x.get("location") or "",
                        "highlights": [x.get("description")] if x.get("description") else [],
                    }
                    for x in data["experience"]
                ]
            if data.get("projects"):
                existing["projects"] = [
                    {
                        "title": p.get("title") or "",
                        "tech_stack": ", ".join(p.get("technologies") or []) if isinstance(p.get("technologies"), list) else str(p.get("tech_stack") or ""),
                        "description": p.get("description") or "",
                    }
                    for p in data["projects"]
                ]
            with open(p_path, "w", encoding="utf-8") as f:
                json.dump(existing, f, indent=2)
    except Exception as exc:
        logger.debug("Could not sync local profile_data.json: %s", exc)


async def autofill_profile_from_user_resume(user_id: str, resume_id: str | None = None) -> ProfileResponse:
    """Extract all details from user's uploaded resume and populate their profile."""
    client = _get_supabase_client() if not user_id.startswith("usr_") else None
    
    file_bytes: bytes | None = None
    file_name = "resume.pdf"
    mime_type = "application/pdf"
    parsed_structured: dict[str, Any] | None = None
    
    if client:
        # Fetch resume record
        q = client.table("resumes").select("*").eq("user_id", user_id)
        if resume_id:
            q = q.eq("id", resume_id)
        else:
            q = q.order("is_default", desc=True).order("created_at", desc=True)
        res = q.limit(1).execute()
        
        if res.data and len(res.data) > 0:
            rec = res.data[0]
            file_name = rec.get("file_name") or "resume.pdf"
            mime_type = rec.get("mime_type") or "application/pdf"
            storage_path = rec.get("storage_path")
            
            if storage_path:
                try:
                    file_bytes = client.storage.from_("resumes").download(storage_path)
                except Exception as down_err:
                    logger.warning("Could not download resume from storage: %s", down_err)
            
            if not file_bytes and rec.get("parsed_data"):
                parsed_structured = rec["parsed_data"]

    # Local file fallback if testing or storage missing
    if not file_bytes and not parsed_structured:
        import os
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        resumes_dir = os.path.join(base_dir, "data", "resumes")
        if os.path.exists(resumes_dir):
            r_files = [f for f in os.listdir(resumes_dir) if f.lower().endswith((".pdf", ".docx", ".txt"))]
            if r_files:
                r_files.sort(key=lambda x: os.path.getmtime(os.path.join(resumes_dir, x)), reverse=True)
                file_name = r_files[0]
                with open(os.path.join(resumes_dir, file_name), "rb") as f:
                    file_bytes = f.read()

        if not file_bytes:
            local_candidates = [
                os.path.join(base_dir, "frontend", "public", "Umesh-Temburwar-Resume.pdf"),
                os.path.join(base_dir, "frontend", "dist", "Umesh-Temburwar-Resume.pdf"),
                os.path.join(base_dir, "Umesh-Temburwar-Resume.pdf"),
                os.path.join(base_dir, "Umesh-Temburwar-OCT.pdf"),
            ]
            for p in local_candidates:
                if os.path.exists(p):
                    with open(p, "rb") as f:
                        file_bytes = f.read()
                    file_name = os.path.basename(p)
                    break

    if not file_bytes and not parsed_structured:
        # Fallback to current profile_data.json if present
        import os, json
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        p_json = os.path.join(base_dir, "data", "profile_data.json")
        if os.path.exists(p_json):
            try:
                with open(p_json, "r", encoding="utf-8") as f:
                    pj = json.load(f)
                    pers = pj.get("personal", {})
                    parsed_structured = {
                        "full_name": pers.get("name") or f"{pers.get('firstname', '')} {pers.get('lastname', '')}".strip(),
                        "email": pers.get("email"),
                        "phone": pers.get("phone"),
                        "city": pers.get("current_location"),
                        "headline": pj.get("naukri_headline"),
                        "summary": pj.get("profile_summary"),
                        "skills": pj.get("key_skills", []),
                        "education": [pj.get("education")] if pj.get("education") else [],
                        "experience": pj.get("experience", []),
                        "projects": pj.get("projects", []),
                        "certifications": pj.get("certifications", []),
                        "linkedin_url": pers.get("linkedin_url"),
                        "github_url": pers.get("github_url"),
                        "portfolio_url": pers.get("portfolio_url"),
                    }
            except Exception:
                pass

    if not file_bytes and not parsed_structured:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No uploaded resume found for candidate. Please upload a resume first.",
        )

    if file_bytes and not parsed_structured:
        from services.resume_parser import extract_file_links, extract_raw_text, extract_structured_data
        raw_text, _ = extract_raw_text(file_bytes, file_name, mime_type)
        links = extract_file_links(file_bytes, file_name, mime_type)
        parsed_structured = extract_structured_data(raw_text, links=links)

    assert parsed_structured is not None
    now_iso = datetime.now(timezone.utc).isoformat()
    
    updates_dict: dict[str, Any] = {
        "updated_at": now_iso,
        "full_name": parsed_structured.get("full_name"),
        "email": parsed_structured.get("email"),
        "phone": parsed_structured.get("phone"),
        "city": parsed_structured.get("city"),
        "headline": parsed_structured.get("headline"),
        "summary": parsed_structured.get("summary"),
        "linkedin_url": parsed_structured.get("linkedin_url"),
        "github_url": parsed_structured.get("github_url"),
        "portfolio_url": parsed_structured.get("portfolio_url"),
        "education": parsed_structured.get("education", []),
        "experience": parsed_structured.get("experience", []),
        "projects": parsed_structured.get("projects", []),
        "certifications": parsed_structured.get("certifications", []),
        "skills": parsed_structured.get("skills", []),
        "additional_info": parsed_structured.get("additional_info", {}),
    }

    cleaned_updates = {k: v for k, v in updates_dict.items() if v is not None}
    cleaned_updates["updated_at"] = now_iso

    # Train bot screening Q&A answer bank immediately
    try:
        from services.config_service import train_bot_with_candidate_details
        names = (parsed_structured.get("full_name") or "").split()
        fname = names[0] if names else ""
        lname = " ".join(names[1:]) if len(names) > 1 else ""
        edu_list = parsed_structured.get("education") or []
        first_edu = edu_list[0] if isinstance(edu_list, list) and edu_list else (edu_list if isinstance(edu_list, dict) else {})
        exp_list = parsed_structured.get("experience") or []
        train_bot_with_candidate_details({
            "user_id": user_id,
            "firstname": fname,
            "lastname": lname,
            "email": parsed_structured.get("email"),
            "phone": parsed_structured.get("phone"),
            "location": parsed_structured.get("city") or "Pune",
            "total_experience_years": str(len(exp_list)) if exp_list else "0",
            "education_degree": first_edu.get("degree") or "Bachelor of Technology (B.Tech)",
            "education_college": first_edu.get("institution") or first_edu.get("college") or "",
            "education_passing_year": str(first_edu.get("year") or first_edu.get("passing_year") or "2025"),
            "education_score": str(first_edu.get("score") or first_edu.get("cgpa") or ""),
            "linkedin_url": parsed_structured.get("linkedin_url") or "",
            "github_url": parsed_structured.get("github_url") or "",
            "portfolio_url": parsed_structured.get("portfolio_url") or "",
        })
    except Exception as train_err:
        logger.debug("Could not train bot in autofill_profile_from_user_resume: %s", train_err)

    if client:
        try:
            up_res = client.table("profiles").update(cleaned_updates).eq("id", user_id).execute()
            if up_res.data and len(up_res.data) > 0:
                sync_local_profile_data(up_res.data[0])
                return _row_to_profile(up_res.data[0])
        except Exception as e:
            logger.error("Failed to update profile from resume in Supabase: %s", e)

    if user_id not in _MEMORY_PROFILES:
        await get_or_create_profile(user_id)
    _MEMORY_PROFILES[user_id].update(cleaned_updates)
    sync_local_profile_data(_MEMORY_PROFILES[user_id])
    return _row_to_profile(_MEMORY_PROFILES[user_id])
