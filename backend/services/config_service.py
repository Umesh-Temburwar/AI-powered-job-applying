import json
import logging
import os
import re
from typing import Any, Optional

from core.supabase import get_supabase_client
from services.profile_service import sync_local_profile_data
from services.resume_parser import (
    extract_file_links,
    extract_raw_text,
    extract_structured_data,
)

logger = logging.getLogger("config_service")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ROOT_ENV_PATH = os.path.join(BASE_DIR, ".env")
ENV_EXAMPLE_PATH = os.path.join(BASE_DIR, ".env.example")
DATA_DIR = os.path.join(BASE_DIR, "data")
RESUMES_DIR = os.path.join(DATA_DIR, "resumes")
PROFILE_DATA_PATH = os.path.join(DATA_DIR, "profile_data.json")
RESUME_INI_PATH = os.path.join(DATA_DIR, "resume.ini")
USER_CONFIGS_DIR = os.path.join(DATA_DIR, "user_configs")


def get_user_config_path(user_id: str) -> str:
    clean_uid = "".join(c for c in str(user_id) if c.isalnum() or c in ("-", "_"))
    return os.path.join(USER_CONFIGS_DIR, f"{clean_uid}.json")


def read_user_config(user_id: Optional[str]) -> Optional[dict[str, Any]]:
    if not user_id:
        return None
    path = get_user_config_path(user_id)
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning("Could not read user config from %s: %s", path, e)
    return None


def write_user_config(user_id: Optional[str], data: dict[str, Any]) -> None:
    if not user_id:
        return
    try:
        os.makedirs(USER_CONFIGS_DIR, exist_ok=True)
        path = get_user_config_path(user_id)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.warning("Could not write user config to %s: %s", path, e)


def delete_user_config(user_id: Optional[str]) -> None:
    if not user_id:
        return
    path = get_user_config_path(user_id)
    if os.path.exists(path):
        try:
            os.remove(path)
        except Exception as e:
            logger.warning("Could not delete user config %s: %s", path, e)


def get_current_env_dict() -> dict[str, str]:
    """Parse key=value pairs from root .env file."""
    env_dict = {}
    path_to_read = ROOT_ENV_PATH if os.path.exists(ROOT_ENV_PATH) else ENV_EXAMPLE_PATH
    if os.path.exists(path_to_read):
        try:
            with open(path_to_read, "r", encoding="utf-8") as f:
                for line in f:
                    stripped = line.strip()
                    if stripped and not stripped.startswith("#") and "=" in stripped:
                        k, v = stripped.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        env_dict[k] = v
        except Exception as e:
            logger.warning("Could not read %s: %s", path_to_read, e)
    return env_dict


def get_current_profile_data() -> dict[str, Any]:
    """Read data/profile_data.json."""
    if os.path.exists(PROFILE_DATA_PATH):
        try:
            with open(PROFILE_DATA_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning("Could not load profile_data.json: %s", e)
    return {}


def get_latest_resume_info() -> tuple[Optional[str], Optional[str]]:
    """Return (resume_filename, resume_filepath) from data/resumes/ if found."""
    if os.path.exists(RESUMES_DIR):
        for f in os.listdir(RESUMES_DIR):
            if f.lower().endswith((".pdf", ".docx", ".txt")):
                return f, os.path.join(RESUMES_DIR, f)
    # Check .env RESUME_PATH fallback
    env = get_current_env_dict()
    env_path = env.get("RESUME_PATH")
    if env_path and os.path.exists(env_path):
        return os.path.basename(env_path), env_path
    return None, None


def get_active_resume_file_response(
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    is_admin: bool = False,
):
    """Serve active candidate resume file with inline disposition for in-browser PDF viewing."""
    from fastapi import HTTPException
    from fastapi.responses import FileResponse, Response, RedirectResponse

    admin_emails = {"umeshtemburwar2002@gmail.com", "utemburwar2002@gmail.com"}
    clean_email = (user_email or "").strip().lower()
    is_effective_admin = is_admin or clean_email in admin_emails or (user_id is None and user_email is None)

    # 1. Supabase storage lookup for this specific candidate
    client = get_supabase_client()
    if client and user_id and not user_id.startswith("usr_"):
        try:
            query = client.table("resumes").select("storage_path, file_name, mime_type").eq("user_id", user_id)
            res = query.eq("is_default", True).limit(1).execute()
            if not res.data:
                res = query.order("created_at", desc=True).limit(1).execute()
            if res.data:
                storage_path = res.data[0]["storage_path"]
                file_name = res.data[0]["file_name"]
                mime_type = res.data[0].get("mime_type") or "application/pdf"
                try:
                    file_bytes = client.storage.from_("resumes").download(storage_path)
                    return Response(
                        content=file_bytes,
                        media_type=mime_type,
                        headers={
                            "Content-Disposition": f'inline; filename="{file_name}"',
                            "Cache-Control": "public, max-age=3600",
                        },
                    )
                except Exception:
                    signed = client.storage.from_("resumes").create_signed_url(storage_path, 3600)
                    signed_url = signed.get("signedUrl") or signed.get("signedURL")
                    if signed_url:
                        return RedirectResponse(url=signed_url)
        except Exception as sup_err:
            logger.debug("Could not retrieve resume from Supabase: %s", sup_err)

    # 2. Check in-memory store for candidate or tests
    try:
        from services.resume_service import _MEMORY_RESUMES
        for r in _MEMORY_RESUMES.values():
            if not user_id or r.get("user_id") == user_id:
                file_bytes = r.get("file_bytes", b"%PDF-1.4 test dummy resume")
                return Response(
                    content=file_bytes,
                    media_type=r.get("mime_type") or "application/pdf",
                    headers={"Content-Disposition": f'inline; filename="{r["file_name"]}"'},
                )
    except Exception:
        pass

    # 3. Only if administrator or local runner without user context: check local disk in data/resumes/ or .env
    if is_effective_admin:
        r_name, r_path = get_latest_resume_info()
        if r_path and os.path.exists(r_path):
            clean_name = r_name or os.path.basename(r_path)
            ext = clean_name.lower()
            if ext.endswith(".pdf"):
                media_type = "application/pdf"
            elif ext.endswith(".docx"):
                media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            elif ext.endswith(".txt"):
                media_type = "text/plain"
            else:
                media_type = "application/octet-stream"

            return FileResponse(
                path=r_path,
                media_type=media_type,
                filename=clean_name,
                headers={
                    "Content-Disposition": f'inline; filename="{clean_name}"',
                    "Cache-Control": "public, max-age=3600",
                },
            )

    raise HTTPException(status_code=404, detail="No active resume file found. Please upload a resume first.")


def get_full_configuration(
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    is_admin: bool = False,
) -> dict[str, Any]:
    """Retrieve configuration for candidate. If candidate has saved their configuration, return it accurately.
    Never leak another user's configuration or credentials.
    """
    admin_emails = {"umeshtemburwar2002@gmail.com", "utemburwar2002@gmail.com"}
    clean_email = (user_email or "").strip().lower()
    is_effective_admin = is_admin or clean_email in admin_emails or (user_id is None and user_email is None)

    # 1. Check if this specific user has a saved configuration on disk
    saved_cfg = read_user_config(user_id) if user_id else None

    # 2. Check Supabase profiles for this user
    supabase = get_supabase_client()
    sb_profile = None
    if supabase and user_id and not str(user_id).startswith("usr_"):
        try:
            p_res = supabase.table("profiles").select("*").eq("id", user_id).limit(1).execute()
            if p_res.data:
                sb_profile = p_res.data[0]
        except Exception as sup_err:
            logger.debug("Could not query Supabase profile for user %s: %s", user_id, sup_err)

    # 3. Check active resume for this user
    r_name = None
    r_path = None
    if supabase and user_id and not str(user_id).startswith("usr_"):
        try:
            res_query = supabase.table("resumes").select("file_name, storage_path").eq("user_id", user_id).eq("is_default", True).limit(1).execute()
            if not res_query.data:
                res_query = supabase.table("resumes").select("file_name, storage_path").eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
            if res_query.data:
                r_name = res_query.data[0].get("file_name")
                r_path = res_query.data[0].get("storage_path")
        except Exception as res_err:
            logger.debug("Could not query Supabase resumes for user %s: %s", user_id, res_err)

    if not r_name:
        try:
            from services.resume_service import _MEMORY_RESUMES
            for r in _MEMORY_RESUMES.values():
                if r.get("user_id") == user_id:
                    r_name = r.get("file_name")
                    r_path = r.get("storage_path")
                    break
        except Exception:
            pass

    # If user has a saved config on disk, return it!
    if saved_cfg:
        if r_name and not saved_cfg.get("resume_name"):
            saved_cfg["resume_name"] = r_name
            saved_cfg["resume_path"] = r_path
        return saved_cfg

    # If user saved in Supabase additional_info
    if sb_profile and isinstance(sb_profile.get("additional_info"), dict) and sb_profile["additional_info"].get("has_saved_config"):
        info = sb_profile["additional_info"]
        fn = sb_profile.get("full_name") or ""
        parts = fn.strip().split() if fn else []
        reconstructed = {
            "firstname": parts[0] if parts else "",
            "lastname": " ".join(parts[1:]) if len(parts) > 1 else "",
            "phone": sb_profile.get("phone") or "",
            "email": sb_profile.get("email") or clean_email,
            "gender": info.get("gender", "Male"),
            "keywords": info.get("keywords") or sb_profile.get("headline") or "",
            "location": info.get("location") or sb_profile.get("city") or "",
            "pages_per_keyword": int(info.get("pages_per_keyword", 2)),
            "max_applications": int(info.get("max_applications", 50)),
            "browser": info.get("browser", "auto"),
            "total_experience_years": str(info.get("total_experience_years", "0")),
            "relevant_experience_years": str(info.get("relevant_experience_years", "0")),
            "current_ctc": str(info.get("current_ctc", "")),
            "expected_ctc": str(info.get("expected_ctc", "")),
            "notice_period": str(info.get("notice_period", "Immediate (0 Days)")),
            "work_mode": str(info.get("work_mode", "Remote / Hybrid")),
            "willing_to_relocate": str(info.get("willing_to_relocate", "Yes")),
            "work_authorization": str(info.get("work_authorization", "Authorized to work in India")),
            "is_fresher": bool(info.get("is_fresher", False)),
            "selected_platforms": info.get("selected_platforms") or ["Naukri", "Internshala", "Indeed", "LinkedIn"],
            "education_degree": str(info.get("education_degree", "")),
            "education_college": str(info.get("education_college", "")),
            "education_passing_year": str(info.get("education_passing_year", "")),
            "education_score": str(info.get("education_score", "")),
            "linkedin_url": str(info.get("linkedin_url") or sb_profile.get("linkedin_url", "")),
            "github_url": str(info.get("github_url") or sb_profile.get("github_url", "")),
            "portfolio_url": str(info.get("portfolio_url") or sb_profile.get("portfolio_url", "")),
            "cover_letter": str(info.get("cover_letter", "")),
            "naukri_email": str(info.get("naukri_email", "")),
            "naukri_password": str(info.get("naukri_password", "")),
            "internshala_email": str(info.get("internshala_email", "")),
            "internshala_password": str(info.get("internshala_password", "")),
            "indeed_email": str(info.get("indeed_email", "")),
            "indeed_password": str(info.get("indeed_password", "")),
            "linkedin_email": str(info.get("linkedin_email", "")),
            "linkedin_password": str(info.get("linkedin_password", "")),
            "resume_name": r_name or info.get("resume_name"),
            "resume_path": r_path or info.get("resume_path"),
            "key_skills": sb_profile.get("skills") or info.get("key_skills", []),
            "profile_summary": sb_profile.get("summary") or info.get("profile_summary", ""),
            "naukri_headline": sb_profile.get("headline") or info.get("naukri_headline", ""),
        }
        if user_id:
            write_user_config(user_id, reconstructed)
        return reconstructed

    # If effective admin and no per-user config: load from host environment
    if is_effective_admin:
        env = get_current_env_dict()
        prof = get_current_profile_data()
        personal = prof.get("personal", {})
        edu = prof.get("education", {})
        if isinstance(edu, list) and len(edu) > 0:
            edu = edu[0]
        elif not isinstance(edu, dict):
            edu = {}
        r_name_env, r_path_env = get_latest_resume_info()

        return {
            "firstname": env.get("FIRSTNAME") or personal.get("firstname") or "",
            "lastname": env.get("LASTNAME") or personal.get("lastname") or "",
            "phone": env.get("PHONE") or personal.get("phone") or "",
            "email": env.get("EMAIL") or personal.get("email") or "",
            "gender": env.get("GENDER") or personal.get("gender") or "Male",
            "keywords": env.get("KEYWORDS") or prof.get("naukri_headline") or "",
            "location": env.get("LOCATION") or personal.get("current_location") or "",
            "pages_per_keyword": int(env.get("PAGES_PER_KEYWORD", 2)),
            "max_applications": int(env.get("MAX_APPLICATIONS", 50)),
            "browser": env.get("BROWSER") or "auto",
            "total_experience_years": env.get("TOTAL_EXPERIENCE_YEARS") or str(personal.get("total_experience_years", "0")),
            "relevant_experience_years": env.get("RELEVANT_EXPERIENCE_YEARS") or str(personal.get("relevant_experience_years", "0")),
            "current_ctc": env.get("CURRENT_CTC") or personal.get("current_ctc", ""),
            "expected_ctc": env.get("EXPECTED_CTC") or personal.get("expected_ctc", ""),
            "notice_period": env.get("NOTICE_PERIOD") or personal.get("notice_period", "Immediate (0 Days)"),
            "work_mode": env.get("WORK_MODE") or personal.get("work_mode", "Remote / Hybrid"),
            "willing_to_relocate": env.get("WILLING_TO_RELOCATE") or personal.get("willing_to_relocate", "Yes"),
            "work_authorization": env.get("WORK_AUTHORIZATION") or personal.get("work_authorization", "Authorized to work in India"),
            "is_fresher": env.get("IS_FRESHER", "").lower() in ("true", "1", "yes") or personal.get("is_fresher", False),
            "selected_platforms": prof.get("selected_platforms") or ["Naukri", "Internshala", "Indeed", "LinkedIn"],
            "education_degree": env.get("EDUCATION_DEGREE") or edu.get("degree", ""),
            "education_college": env.get("EDUCATION_COLLEGE") or edu.get("institution") or edu.get("college", ""),
            "education_passing_year": env.get("EDUCATION_PASSING_YEAR") or str(edu.get("year") or edu.get("passing_year", "")),
            "education_score": env.get("EDUCATION_SCORE") or str(edu.get("score") or edu.get("cgpa", "")),
            "linkedin_url": env.get("LINKEDIN_URL") or personal.get("linkedin_url", ""),
            "github_url": env.get("GITHUB_URL") or personal.get("github_url", ""),
            "portfolio_url": env.get("PORTFOLIO_URL") or personal.get("portfolio_url", ""),
            "cover_letter": env.get("COVER_LETTER") or prof.get("cover_letter", ""),
            "naukri_email": env.get("NAUKRI_EMAIL", ""),
            "naukri_password": env.get("NAUKRI_PASSWORD", ""),
            "internshala_email": env.get("INTERNSHALA_EMAIL", ""),
            "internshala_password": env.get("INTERNSHALA_PASSWORD", ""),
            "indeed_email": env.get("INDEED_EMAIL", ""),
            "indeed_password": env.get("INDEED_PASSWORD", ""),
            "linkedin_email": env.get("LINKEDIN_EMAIL", ""),
            "linkedin_password": env.get("LINKEDIN_PASSWORD", ""),
            "resume_name": r_name or r_name_env,
            "resume_path": r_path or r_path_env,
            "key_skills": prof.get("key_skills", []),
            "profile_summary": prof.get("profile_summary", ""),
            "naukri_headline": prof.get("naukri_headline", ""),
        }

    # Brand new clean candidate account
    cand_fn = ""
    cand_ln = ""
    cand_phone = ""
    cand_email = clean_email
    cand_headline = ""
    cand_summary = ""
    cand_skills = []

    if sb_profile:
        fn = sb_profile.get("full_name") or ""
        parts = fn.strip().split() if fn else []
        cand_fn = parts[0] if parts else ""
        cand_ln = " ".join(parts[1:]) if len(parts) > 1 else ""
        cand_phone = sb_profile.get("phone") or ""
        cand_email = sb_profile.get("email") or clean_email
        cand_headline = sb_profile.get("headline") or ""
        cand_summary = sb_profile.get("summary") or ""
        cand_skills = sb_profile.get("skills") or []

    return {
        "firstname": cand_fn,
        "lastname": cand_ln,
        "phone": cand_phone,
        "email": cand_email,
        "gender": "Male",
        "keywords": cand_headline,
        "location": "",
        "pages_per_keyword": 2,
        "max_applications": 50,
        "browser": "auto",
        "total_experience_years": "0",
        "relevant_experience_years": "0",
        "current_ctc": "",
        "expected_ctc": "",
        "notice_period": "Immediate (0 Days)",
        "work_mode": "Remote / Hybrid",
        "willing_to_relocate": "Yes",
        "work_authorization": "Authorized to work in India",
        "is_fresher": False,
        "selected_platforms": ["Naukri", "Internshala", "Indeed", "LinkedIn"],
        "education_degree": "",
        "education_college": "",
        "education_passing_year": "",
        "education_score": "",
        "linkedin_url": "",
        "github_url": "",
        "portfolio_url": "",
        "cover_letter": "",
        "naukri_email": "",
        "naukri_password": "",
        "internshala_email": "",
        "internshala_password": "",
        "indeed_email": "",
        "indeed_password": "",
        "linkedin_email": "",
        "linkedin_password": "",
        "resume_name": r_name,
        "resume_path": r_path,
        "key_skills": cand_skills,
        "profile_summary": cand_summary,
        "naukri_headline": cand_headline,
    }


def sync_local_resume_ini(
    candidate_name: str,
    skills: list[str] | str,
    certificates: list[Any] | str = "",
    projects: list[Any] | str = "",
) -> None:
    """Format and write data/resume.ini for Internshala and multi-platform bot scripts."""
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        if isinstance(skills, list):
            skills_text = ", ".join(skills)
        else:
            skills_text = str(skills).strip()

        cert_str = ""
        if isinstance(certificates, list):
            cert_lines = []
            for idx, c in enumerate(certificates, 1):
                if isinstance(c, dict):
                    name = c.get("name") or c.get("title") or "Certification"
                    issuer = f" at {c.get('issuer')}" if c.get("issuer") else ""
                    cert_lines.append(f"{idx}. {name}{issuer}")
                else:
                    cert_lines.append(f"{idx}. {c}")
            cert_str = "\n".join(cert_lines)
        else:
            cert_str = str(certificates).strip()

        proj_str = ""
        if isinstance(projects, list):
            proj_lines = []
            for idx, p in enumerate(projects, 1):
                if isinstance(p, dict):
                    title = p.get("title") or p.get("name") or f"Project {idx}"
                    desc = p.get("description") or ""
                    proj_lines.append(f"{idx}. {title}\n   * {desc}")
                else:
                    proj_lines.append(f"{idx}. {p}")
            proj_str = "\n\n".join(proj_lines)
        else:
            proj_str = str(projects).strip()

        content = f'''# ==============================================================================
# INTERNSHALA RESUME CONFIGURATION (Universal Auto-Apply Bot)
# Profile: {candidate_name}
# ==============================================================================

# Enter your Skills Here
SKILLS = """
{skills_text}
"""

# Enter Your Certificates and previous Internship Experiences here
CERTIFICATES = """
{cert_str}
"""

# Add your personal/professional projects here
PROJECTS = """
{proj_str}
"""
'''
        with open(RESUME_INI_PATH, "w", encoding="utf-8") as f:
            f.write(content)
        logger.info("Successfully updated %s", RESUME_INI_PATH)
    except Exception as e:
        logger.warning("Could not sync resume.ini: %s", e)


def update_root_env_file(key_values: dict[str, str]) -> None:
    """Safely update or insert key-values in project root .env preserving comments and formatting."""
    # Sanitize inputs to prevent multi-line pollution
    cleaned_key_values = {}
    for k, v in key_values.items():
        k_clean = str(k).strip().upper()
        v_clean = str(v).replace("\r", " ").replace("\n", " ").strip() if v is not None else ""
        cleaned_key_values[k_clean] = v_clean

    lines: list[str] = []
    if os.path.exists(ROOT_ENV_PATH):
        with open(ROOT_ENV_PATH, "r", encoding="utf-8") as f:
            lines = f.readlines()
    elif os.path.exists(ENV_EXAMPLE_PATH):
        with open(ENV_EXAMPLE_PATH, "r", encoding="utf-8") as f:
            lines = f.readlines()

    keys_found = set()
    new_lines: list[str] = []

    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and "=" in stripped:
            k, _ = stripped.split("=", 1)
            k = k.strip().upper()
            if k in cleaned_key_values:
                keys_found.add(k)
                new_val = cleaned_key_values[k]
                new_lines.append(f"{k}={new_val}\n")
                continue
        # Drop stray lines that are not comments and don't have =
        if stripped and not stripped.startswith("#") and "=" not in stripped:
            continue
        new_lines.append(line)

    # Append any remaining keys that weren't in the file
    missing_keys = [k for k in cleaned_key_values if k not in keys_found]
    if missing_keys:
        if new_lines and not new_lines[-1].endswith("\n"):
            new_lines.append("\n")
        new_lines.append("\n# --- Added by Universal Bot Setup ---\n")
        for k in missing_keys:
            new_lines.append(f"{k}={cleaned_key_values[k]}\n")

    with open(ROOT_ENV_PATH, "w", encoding="utf-8") as f:
        f.writelines(new_lines)

    # Dynamically inject into running os.environ
    for k, v in cleaned_key_values.items():
        os.environ[k] = str(v)

    logger.info("Updated root .env with %d variables", len(cleaned_key_values))



def train_bot_with_candidate_details(config: dict[str, Any]) -> int:
    """Train the bot's screening Q&A answer bank based on candidate profile inputs."""
    os.makedirs(DATA_DIR, exist_ok=True)
    answers_paths = [
        os.path.join(DATA_DIR, "application_answers.csv"),
        os.path.join(BASE_DIR, "application_answers.csv"),
    ]

    fname = str(config.get("firstname") or "").strip()
    lname = str(config.get("lastname") or "").strip()
    full_name = f"{fname} {lname}".strip() or "Candidate"
    phone = str(config.get("phone") or "").strip()
    email = str(config.get("email") or config.get("naukri_email") or "").strip()
    location = str(config.get("location") or "Pune").strip()

    tot_exp = str(config.get("total_experience_years") or "0").strip()
    rel_exp = str(config.get("relevant_experience_years") or tot_exp or "1").strip()
    cur_ctc = str(config.get("current_ctc") or "0").strip()
    exp_ctc = str(config.get("expected_ctc") or "4.5").strip()
    notice = str(config.get("notice_period") or "Immediate").strip()
    is_immediate = "Yes" if "immed" in notice.lower() or "0" in notice else "No"
    work_mode = str(config.get("work_mode") or "Remote / Hybrid").strip()
    relocate = str(config.get("willing_to_relocate") or "Yes").strip()
    gender = str(config.get("gender") or "Male").strip()

    degree = str(config.get("education_degree") or "Bachelor of Technology (B.Tech)").strip()
    college = str(config.get("education_college") or "Engineering College").strip()
    pass_yr = str(config.get("education_passing_year") or "2025").strip()
    score = str(config.get("education_score") or "6.06").strip()

    linkedin = str(config.get("linkedin_url") or "").strip()
    github = str(config.get("github_url") or "").strip()
    portfolio = str(config.get("portfolio_url") or "").strip()

    # Master question-answer pairs to seed/train
    qa_pairs = [
        # Contact coordinates
        ("Full Name", full_name, "text"),
        ("First Name", fname or "Candidate", "text"),
        ("Last Name", lname or "", "text"),
        ("Your Name", full_name, "text"),
        ("Phone Number", phone, "text"),
        ("Mobile", phone, "text"),
        ("Mobile Number", phone, "text"),
        ("Contact Number", phone, "text"),
        ("Email Address", email, "text"),
        ("Email", email, "text"),
        ("Current Location", location, "text"),
        ("Current City", location, "text"),
        ("City", location, "text"),
        ("Location", location, "text"),
        ("Gender", gender, "radio"),

        # Availability & Notice Period
        ("Notice Period", notice, "text"),
        ("What is your official notice period?", notice, "text"),
        ("Notice period in days", "0" if "immed" in notice.lower() or "0" in notice else "30", "text"),
        ("Notice period (in days)", "0" if "immed" in notice.lower() or "0" in notice else "30", "text"),
        ("Are you an immediate joiner?", is_immediate, "radio"),
        ("Can you join immediately?", is_immediate, "radio"),
        ("Immediate Joiner", is_immediate, "radio"),
        ("How soon can you join?", notice, "text"),
        ("Are you available for full-time employment?", "Yes", "radio"),
        ("Available for full-time", "Yes", "radio"),
        ("Availability", "Immediate", "text"),

        # Experience & Career
        ("Total years of experience", tot_exp, "text"),
        ("Total Experience", tot_exp, "text"),
        ("Total Experience in years", tot_exp, "text"),
        ("How many years of experience do you have?", tot_exp, "text"),
        ("Overall Experience", tot_exp, "text"),
        ("Relevant Experience", rel_exp, "text"),
        ("Years of relevant experience", rel_exp, "text"),
        ("Years of experience in Full Stack Development", rel_exp, "text"),
        ("Years of experience in Web Development", rel_exp, "text"),
        ("Years of experience in React", rel_exp, "text"),
        ("Years of experience in Python", rel_exp, "text"),
        ("Years of experience in Node.js", rel_exp, "text"),
        ("Years of experience in SQL", rel_exp, "text"),

        # Compensation & CTC
        ("Current CTC", cur_ctc, "text"),
        ("Current CTC (in LPA)", cur_ctc, "text"),
        ("Current Annual Salary", cur_ctc, "text"),
        ("Expected CTC", exp_ctc, "text"),
        ("Expected CTC (in LPA)", exp_ctc, "text"),
        ("Expected Annual Salary", f"{exp_ctc} Lakhs", "text"),

        # Relocation & Work Mode
        ("Are you willing to relocate?", relocate, "radio"),
        ("Willing to relocate?", relocate, "radio"),
        ("Are you open to relocate?", relocate, "radio"),
        ("Work mode preference", work_mode, "radio"),
        ("Preferred work mode", work_mode, "radio"),
        ("Are you comfortable working remotely?", "Yes" if "remote" in work_mode.lower() or "any" in work_mode.lower() else "No", "radio"),
        ("Are you comfortable working from office / hybrid?", "Yes", "radio"),
        ("Are you comfortable working in Pune?", "Yes", "radio"),
        ("Are you comfortable working in Bengaluru?", "Yes", "radio"),

        # Education & Degrees
        ("Highest qualification", degree, "text"),
        ("Highest Degree", degree, "text"),
        ("Degree", degree, "text"),
        ("Course / Degree", degree, "text"),
        ("Educational Qualification", degree, "text"),
        ("College Name", college, "text"),
        ("University / College", college, "text"),
        ("Institute Name", college, "text"),
        ("Graduation Year", pass_yr, "text"),
        ("Passing Year", pass_yr, "text"),
        ("Year of Graduation", pass_yr, "text"),
        ("Year of Passing", pass_yr, "text"),
        ("CGPA / Percentage", score, "text"),
        ("Percentage / CGPA", score, "text"),
        ("Marks / CGPA", score, "text"),
        ("Score", score, "text"),
        ("Branch", "Computer Science", "text"),
        ("Specialization", "Computer Science", "text"),

        # Online Profiles
        ("LinkedIn Profile URL", linkedin, "text"),
        ("LinkedIn", linkedin, "text"),
        ("LinkedIn URL", linkedin, "text"),
        ("GitHub Profile URL", github, "text"),
        ("GitHub", github, "text"),
        ("GitHub URL", github, "text"),
        ("Portfolio URL", portfolio, "text"),
        ("Personal Website", portfolio, "text"),
        ("Portfolio", portfolio, "text"),

        # Standard Screening Questions
        ("Are you authorized to work in India?", "Yes", "radio"),
        ("Work Authorization", "Authorized to work in India", "text"),
        ("Do you require visa sponsorship?", "No", "radio"),
        ("Do you have experience with Git and GitHub?", "Yes", "radio"),
        ("Do you have experience in REST APIs?", "Yes", "radio"),
        ("Why should we hire you?", f"I am a passionate engineer with hands-on expertise in {degree} and practical full-stack project implementations. I have built production-ready applications with responsive UIs and robust backend APIs, and I am ready to contribute immediately.", "text"),
        ("Why should you be hired for this role?", f"As a motivated developer with strong fundamentals in modern web frameworks and databases, I have completed comprehensive web applications and can deliver scalable code with high ownership.", "text"),
    ]

    import csv
    from datetime import date
    today_str = date.today().isoformat()

    trained_count = 0
    for target_path in answers_paths:
        existing_rows: dict[str, dict[str, str]] = {}
        if os.path.exists(target_path):
            try:
                with open(target_path, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for r in reader:
                        q = (r.get("question_text") or "").strip()
                        if q:
                            existing_rows[q.lower()] = r
            except Exception:
                pass

        for q, a, ft in qa_pairs:
            if not a:
                continue
            existing_rows[q.lower()] = {
                "question_text": q,
                "answer": a,
                "field_type": ft,
                "created_at": today_str,
            }
            trained_count += 1

        try:
            with open(target_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=["question_text", "answer", "field_type", "created_at"])
                writer.writeheader()
                for r in existing_rows.values():
                    writer.writerow(r)
        except Exception as e:
            logger.warning("Could not write trained answers to %s: %s", target_path, e)

    # Sync trained answers into Supabase application_answers table if connected
    supabase = get_supabase_client()
    if supabase and config.get("user_id"):
        try:
            uid = config["user_id"]
            sb_answers = []
            for q, a, ft in qa_pairs:
                if a:
                    sb_answers.append({
                        "user_id": uid,
                        "question": q,
                        "question_text": q,
                        "answer": a,
                        "field_type": ft,
                    })
            supabase.table("application_answers").upsert(sb_answers, on_conflict="user_id,question_text").execute()
        except Exception as sb_err:
            logger.debug("Supabase answer bank sync note: %s", sb_err)

    logger.info("Bot trained with %d candidate screening answers.", len(qa_pairs))
    return trained_count

def save_user_configuration(config: dict[str, Any], user_id: Optional[str] = None) -> dict[str, Any]:
    """Persist user configuration for this specific user.
    Saves to data/user_configs/{user_id}.json, Supabase profiles, and (if admin/local) to .env and profile_data.json.
    """
    clean_uid = str(user_id) if user_id else None
    existing_user_cfg = read_user_config(clean_uid) if clean_uid else {}
    existing_env = get_current_env_dict()

    def _get_val(cfg_key: str, env_key: str, default: str = "") -> str:
        if cfg_key in config and config[cfg_key] is not None:
            return str(config[cfg_key]).strip()
        if existing_user_cfg and cfg_key in existing_user_cfg and existing_user_cfg[cfg_key] is not None:
            return str(existing_user_cfg[cfg_key]).strip()
        return existing_env.get(env_key, default).strip()

    fname = _get_val("firstname", "FIRSTNAME")
    lname = _get_val("lastname", "LASTNAME")
    phone = _get_val("phone", "PHONE")
    cand_email = str(config.get("email") or (existing_user_cfg.get("email") if existing_user_cfg else "") or existing_env.get("EMAIL", "")).strip()
    keywords = _get_val("keywords", "KEYWORDS")
    location = _get_val("location", "LOCATION", "pune")
    pages_per_kw = int(_get_val("pages_per_keyword", "PAGES_PER_KEYWORD", "2") or 2)
    max_apps = int(_get_val("max_applications", "MAX_APPLICATIONS", "50") or 50)
    browser = _get_val("browser", "BROWSER", "auto").lower()

    tot_exp = _get_val("total_experience_years", "TOTAL_EXPERIENCE_YEARS", "0")
    rel_exp = _get_val("relevant_experience_years", "RELEVANT_EXPERIENCE_YEARS", "0")
    cur_ctc = _get_val("current_ctc", "CURRENT_CTC")
    exp_ctc = _get_val("expected_ctc", "EXPECTED_CTC")
    notice = _get_val("notice_period", "NOTICE_PERIOD", "Immediate (0 Days)")
    work_mode = _get_val("work_mode", "WORK_MODE", "Remote / Hybrid")
    relocate = _get_val("willing_to_relocate", "WILLING_TO_RELOCATE", "Yes")
    gender = _get_val("gender", "GENDER", "Male")
    work_auth = str(config.get("work_authorization") or (existing_user_cfg.get("work_authorization") if existing_user_cfg else "") or "Authorized to work in India").strip()
    is_fresher = bool(config.get("is_fresher") or str(tot_exp) in ("0", "Fresher (0 Years)"))

    degree = _get_val("education_degree", "EDUCATION_DEGREE")
    college = _get_val("education_college", "EDUCATION_COLLEGE")
    pass_yr = _get_val("education_passing_year", "EDUCATION_PASSING_YEAR")
    score = _get_val("education_score", "EDUCATION_SCORE")

    linkedin = _get_val("linkedin_url", "LINKEDIN_URL")
    github = _get_val("github_url", "GITHUB_URL")
    portfolio = _get_val("portfolio_url", "PORTFOLIO_URL")
    cover_letter = str(config.get("cover_letter") or (existing_user_cfg.get("cover_letter") if existing_user_cfg else "") or "").strip()

    sel_platforms = config.get("selected_platforms") or (existing_user_cfg.get("selected_platforms") if existing_user_cfg else None) or ["Naukri", "Internshala", "Indeed", "LinkedIn"]
    key_skills = config.get("key_skills") or (existing_user_cfg.get("key_skills") if existing_user_cfg else None) or []
    if not key_skills and keywords:
        key_skills = [k.strip() for k in keywords.split(",") if k.strip()]

    portal_keys = [
        "naukri_email", "naukri_password",
        "internshala_email", "internshala_password",
        "indeed_email", "indeed_password",
        "linkedin_email", "linkedin_password",
    ]
    credentials: dict[str, str] = {}
    for pk in portal_keys:
        if pk in config and config[pk] is not None:
            credentials[pk] = str(config[pk]).strip()
        elif existing_user_cfg and pk in existing_user_cfg and existing_user_cfg[pk] is not None:
            credentials[pk] = str(existing_user_cfg[pk]).strip()
        else:
            credentials[pk] = ""

    resume_name = config.get("resume_name") or (existing_user_cfg.get("resume_name") if existing_user_cfg else None)
    resume_path = config.get("resume_path") or (existing_user_cfg.get("resume_path") if existing_user_cfg else None)

    user_saved_payload: dict[str, Any] = {
        "has_saved_config": True,
        "firstname": fname,
        "lastname": lname,
        "phone": phone,
        "email": cand_email,
        "gender": gender,
        "keywords": keywords,
        "location": location,
        "pages_per_keyword": pages_per_kw,
        "max_applications": max_apps,
        "browser": browser,
        "total_experience_years": tot_exp,
        "relevant_experience_years": rel_exp,
        "current_ctc": cur_ctc,
        "expected_ctc": exp_ctc,
        "notice_period": notice,
        "work_mode": work_mode,
        "willing_to_relocate": relocate,
        "work_authorization": work_auth,
        "is_fresher": is_fresher,
        "selected_platforms": sel_platforms,
        "education_degree": degree,
        "education_college": college,
        "education_passing_year": pass_yr,
        "education_score": score,
        "linkedin_url": linkedin,
        "github_url": github,
        "portfolio_url": portfolio,
        "cover_letter": cover_letter,
        "key_skills": key_skills,
        "profile_summary": str(config.get("profile_summary") or "").strip(),
        "naukri_headline": str(config.get("naukri_headline") or keywords).strip(),
        "resume_name": resume_name,
        "resume_path": resume_path,
        **credentials,
    }

    # 1. Save to data/user_configs/{user_id}.json
    if clean_uid:
        write_user_config(clean_uid, user_saved_payload)

    # 2. Persist to Supabase if available
    supabase = get_supabase_client()
    if supabase and clean_uid and not clean_uid.startswith("usr_"):
        try:
            full_name = f"{fname} {lname}".strip() or "Candidate"
            update_payload = {
                "full_name": full_name,
                "email": cand_email or None,
                "phone": phone or None,
                "city": location or None,
                "headline": keywords or None,
                "skills": key_skills,
                "summary": str(config.get("profile_summary") or None),
                "linkedin_url": linkedin or None,
                "github_url": github or None,
                "portfolio_url": portfolio or None,
                "additional_info": user_saved_payload,
            }
            supabase.table("profiles").update(update_payload).eq("id", clean_uid).execute()
        except Exception as sb_err:
            logger.warning("Could not sync profile to Supabase: %s", sb_err)

    # 3. Only update host root .env if user is admin or local runner without auth
    full_name = f"{fname} {lname}".strip()
    is_admin_user = (
        clean_uid is None
        or (cand_email and cand_email.lower() in ("umeshtemburwar2002@gmail.com", "utemburwar2002@gmail.com"))
    )
    if is_admin_user:
        env_map = {
            "FIRSTNAME": fname,
            "LASTNAME": lname,
            "PHONE": phone,
            "KEYWORDS": keywords,
            "LOCATION": location,
            "PAGES_PER_KEYWORD": str(pages_per_kw),
            "MAX_APPLICATIONS": str(max_apps),
            "BROWSER": browser,
            "TOTAL_EXPERIENCE_YEARS": tot_exp,
            "RELEVANT_EXPERIENCE_YEARS": rel_exp,
            "CURRENT_CTC": cur_ctc,
            "EXPECTED_CTC": exp_ctc,
            "NOTICE_PERIOD": notice,
            "WORK_MODE": work_mode,
            "WILLING_TO_RELOCATE": relocate,
            "WORK_AUTHORIZATION": work_auth,
            "IS_FRESHER": "true" if is_fresher else "false",
            "GENDER": gender,
            "EDUCATION_DEGREE": degree,
            "EDUCATION_COLLEGE": college,
            "EDUCATION_PASSING_YEAR": pass_yr,
            "EDUCATION_SCORE": score,
            "LINKEDIN_URL": linkedin,
            "GITHUB_URL": github,
            "PORTFOLIO_URL": portfolio,
        }
        for pk, env_k in [
            ("naukri_email", "NAUKRI_EMAIL"),
            ("naukri_password", "NAUKRI_PASSWORD"),
            ("internshala_email", "INTERNSHALA_EMAIL"),
            ("internshala_password", "INTERNSHALA_PASSWORD"),
            ("indeed_email", "INDEED_EMAIL"),
            ("indeed_password", "INDEED_PASSWORD"),
            ("linkedin_email", "LINKEDIN_EMAIL"),
            ("linkedin_password", "LINKEDIN_PASSWORD"),
        ]:
            if credentials.get(pk):
                env_map[env_k] = credentials[pk]
            elif env_k in existing_env and existing_env[env_k].strip():
                env_map[env_k] = existing_env[env_k].strip()

        if cand_email:
            env_map["EMAIL"] = cand_email

        update_root_env_file(env_map)

        full_name = f"{fname} {lname}".strip()
        prof_updates = {
            "full_name": full_name or None,
            "email": cand_email or env_map.get("NAUKRI_EMAIL") or None,
            "phone": phone or None,
            "city": location,
            "headline": keywords,
            "linkedin_url": linkedin or None,
            "github_url": github or None,
            "portfolio_url": portfolio or None,
            "skills": key_skills,
        }
        sync_local_profile_data(prof_updates)

    # 2.5 Automatically train bot screening questions with candidate details
    try:
        cfg_train = dict(config)
        if user_id:
            cfg_train["user_id"] = user_id
        train_bot_with_candidate_details(cfg_train)
    except Exception as train_err:
        logger.warning("Bot screening training note: %s", train_err)

    # 3. Update data/resume.ini
    prof = get_current_profile_data()
    skills_for_ini = prof.get("key_skills") or [k.strip() for k in keywords.split(",") if k.strip()]
    certs_for_ini = prof.get("certifications") or []
    projs_for_ini = prof.get("projects") or []
    sync_local_resume_ini(
        candidate_name=full_name or "Job Seeker",
        skills=skills_for_ini,
        certificates=certs_for_ini,
        projects=projs_for_ini,
    )

    # 4. Trigger platform connections refresh
    if user_id:
        try:
            from services.connection_service import connection_service
            connection_service.sync_from_env(user_id)
        except Exception as conn_err:
            logger.debug("Connection sync note: %s", conn_err)

    return {
        "status": "success",
        "message": "All configuration settings and credentials saved to .env, profile_data.json, and resume.ini successfully!",
    }


def parse_and_save_user_resume(
    file_bytes: bytes,
    file_name: str,
    user_id: Optional[str] = None,
) -> dict[str, Any]:
    """Save resume to data/resumes/, parse structured candidate details, and return autofill payload."""
    os.makedirs(RESUMES_DIR, exist_ok=True)
    clean_name = os.path.basename(file_name)
    safe_path = os.path.join(RESUMES_DIR, clean_name)

    # Save physical copy to disk
    with open(safe_path, "wb") as f:
        f.write(file_bytes)
    os.environ["RESUME_PATH"] = safe_path

    # Extract text & structured fields
    mime_type = "application/pdf" if clean_name.lower().endswith(".pdf") else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    raw_text, _ = extract_raw_text(file_bytes, clean_name, mime_type)
    links = extract_file_links(file_bytes, clean_name, mime_type)
    structured = extract_structured_data(raw_text, links=links) if raw_text else {}

    full_name = structured.get("full_name") or ""
    parts = full_name.split() if full_name else []
    fname = parts[0] if parts else ""
    lname = " ".join(parts[1:]) if len(parts) > 1 else ""

    email = structured.get("email") or ""
    phone = structured.get("phone") or ""
    city = structured.get("city") or "Pune"
    headline = structured.get("headline") or ""
    skills = structured.get("skills") or []
    education = structured.get("education") or []
    experience = structured.get("experience") or []
    projects = structured.get("projects") or []
    certifications = structured.get("certifications") or []

    # Derive suggested search keywords from headline & skills
    suggested_keywords = []
    if headline:
        suggested_keywords.append(headline.lower())
    for s in skills[:6]:
        clean_s = s.lower().replace(".js", "").strip()
        if f"{clean_s} developer" not in suggested_keywords and len(clean_s) > 2:
            suggested_keywords.append(f"{clean_s} developer")
    if not suggested_keywords:
        suggested_keywords = ["full stack developer", "react developer", "software engineer"]

    keywords_str = ", ".join(suggested_keywords[:5])

    # Extract links and career metrics
    linkedin_url = structured.get("linkedin_url") or ""
    github_url = structured.get("github_url") or ""
    portfolio_url = structured.get("portfolio_url") or ""

    edu_first = education[0] if (isinstance(education, list) and len(education) > 0) else (education if isinstance(education, dict) else {})
    edu_degree = edu_first.get("degree") or "Bachelor of Technology (B.Tech)"
    edu_college = edu_first.get("institution") or edu_first.get("college") or ""
    edu_year = str(edu_first.get("year") or edu_first.get("passing_year") or "2025")
    edu_score = str(edu_first.get("score") or edu_first.get("cgpa") or "")

    tot_years = str(len(experience)) if experience else "0"
    is_fresher = True if (not experience or tot_years == "0" or "coordinator" in str(experience).lower()) else False

    summary = structured.get("summary") or f"Dedicated and detail-oriented {headline or 'Full Stack Developer'} with strong practical skills in {', '.join(skills[:5]) if skills else 'React, Node.js and modern web architecture'}. Passionate about building robust, high-performance web applications and automated workflows."
    cover_letter = structured.get("cover_letter") or (
        f"Dear Hiring Team,\n\n"
        f"I am writing to express my strong enthusiasm for engineering roles at your organization. "
        f"With hands-on experience in {', '.join(skills[:6]) if skills else 'Full Stack development and modern web technologies'}, "
        f"I have designed, implemented, and deployed responsive applications with clean architecture and seamless API integrations.\n\n"
        f"I am eager to contribute my technical foundation, quick learning capabilities, and problem-solving skills to your team's objectives.\n\n"
        f"Sincerely,\n{full_name or 'Candidate'}"
    )

    # Update profile_data.json
    prof = get_current_profile_data()
    prof["personal"] = prof.get("personal", {})
    prof["personal"].update({
        "name": full_name or prof["personal"].get("name", ""),
        "firstname": fname or prof["personal"].get("firstname", ""),
        "lastname": lname or prof["personal"].get("lastname", ""),
        "email": email or prof["personal"].get("email", ""),
        "phone": phone or prof["personal"].get("phone", ""),
        "current_location": city or prof["personal"].get("current_location", "Pune"),
        "linkedin_url": linkedin_url or prof["personal"].get("linkedin_url", ""),
        "github_url": github_url or prof["personal"].get("github_url", ""),
        "portfolio_url": portfolio_url or prof["personal"].get("portfolio_url", ""),
        "total_experience_years": "0" if is_fresher else (tot_years if tot_years != "0" else "1"),
        "is_fresher": is_fresher,
    })
    prof["resume_path"] = safe_path
    if headline:
        prof["naukri_headline"] = headline
    prof["profile_summary"] = summary
    prof["cover_letter"] = cover_letter
    if skills:
        prof["key_skills"] = skills
    edu_clean = {
        "degree": edu_degree,
        "college": edu_college,
        "institution": edu_college,
        "year": edu_year,
        "passing_year": edu_year,
        "score": edu_score,
        "cgpa": edu_score,
        "field_of_study": edu_first.get("field_of_study") or "Computer Science",
    }
    if education:
        prof["education"] = edu_clean
    if experience:
        prof["experience"] = experience
    if projects:
        prof["projects"] = projects

    with open(PROFILE_DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(prof, f, indent=2)

    # Update resume.ini
    sync_local_resume_ini(
        candidate_name=full_name or "Job Seeker",
        skills=skills,
        certificates=certifications,
        projects=projects,
    )

    # Update .env personal details
    env_updates = {
        "FIRSTNAME": fname,
        "LASTNAME": lname,
        "PHONE": phone,
        "LOCATION": city,
        "KEYWORDS": keywords_str,
        "IS_FRESHER": "True" if is_fresher else "False",
        "COVER_LETTER": cover_letter,
    }
    if email:
        env_updates["NAUKRI_EMAIL"] = email
    if linkedin_url:
        env_updates["LINKEDIN_URL"] = linkedin_url
    if github_url:
        env_updates["GITHUB_URL"] = github_url
    if portfolio_url:
        env_updates["PORTFOLIO_URL"] = portfolio_url
    if edu_degree:
        env_updates["EDUCATION_DEGREE"] = edu_degree
    if edu_college:
        env_updates["EDUCATION_COLLEGE"] = edu_college
    if edu_year:
        env_updates["EDUCATION_PASSING_YEAR"] = edu_year

    update_root_env_file(env_updates)

    # Sync to Supabase storage bucket & resumes table if user_id or client available
    try:
        from core.supabase import get_supabase_client
        sb_client = get_supabase_client()
        target_uid = user_id
        if sb_client and not target_uid and email:
            try:
                prof_chk = sb_client.table("profiles").select("id").eq("email", email.strip().lower()).execute()
                if prof_chk.data:
                    target_uid = prof_chk.data[0]["id"]
            except Exception:
                pass

        if sb_client and target_uid and not str(target_uid).startswith("usr_mock"):
            storage_path = f"{target_uid}/{clean_name}"
            try:
                sb_client.storage.from_("resumes").upload(
                    path=storage_path,
                    file=file_bytes,
                    file_options={"content-type": mime_type, "upsert": "true"},
                )
            except Exception as st_err:
                logger.debug("Storage upload sync error: %s", st_err)

            res_id = str(uuid.uuid4())
            now_iso = datetime.now(timezone.utc).isoformat()
            db_record = {
                "id": res_id,
                "user_id": str(target_uid),
                "file_name": clean_name,
                "storage_path": storage_path,
                "file_size": len(file_bytes),
                "mime_type": mime_type,
                "is_default": True,
                "parsed_data": structured,
                "ocr_needed": False,
                "created_at": now_iso,
                "updated_at": now_iso,
            }
            try:
                sb_client.table("resumes").insert(db_record).execute()
            except Exception as ins_err:
                logger.debug("Resumes table insert error: %s", ins_err)

            from services.resume_service import _MEMORY_RESUMES
            _MEMORY_RESUMES[res_id] = {**db_record, "file_bytes": file_bytes}
    except Exception as sync_exc:
        logger.debug("Could not sync uploaded resume to Supabase: %s", sync_exc)

    # Train bot immediately with extracted details
    try:
        train_bot_with_candidate_details({
            "firstname": fname,
            "lastname": lname,
            "phone": phone,
            "email": email,
            "location": city,
            "total_experience_years": "0" if is_fresher else tot_years,
            "is_fresher": is_fresher,
            "education_degree": edu_degree,
            "education_college": edu_college,
            "education_passing_year": edu_year,
            "education_score": edu_score,
            "linkedin_url": linkedin_url,
            "github_url": github_url,
            "portfolio_url": portfolio_url,
            "cover_letter": cover_letter,
            "notice_period": "Immediate (0 Days)",
            "work_mode": "Remote / Hybrid",
            "willing_to_relocate": "Yes",
            "work_authorization": "Authorized to work in India",
        })
    except Exception as e:
        logger.debug("Auto-train on resume upload note: %s", e)

    return {
        "resume_name": clean_name,
        "resume_path": safe_path,
        "firstname": fname,
        "lastname": lname,
        "full_name": full_name,
        "email": email,
        "phone": phone,
        "city": city,
        "headline": headline,
        "summary": summary,
        "cover_letter": cover_letter,
        "keywords": keywords_str,
        "skills": skills,
        "education": education,
        "experience": experience,
        "projects": projects,
        "certifications": certifications,
        "linkedin_url": linkedin_url,
        "github_url": github_url,
        "portfolio_url": portfolio_url,
        "education_degree": edu_degree,
        "education_college": edu_college,
        "education_passing_year": edu_year,
        "education_score": edu_score,
        "total_experience_years": "0" if is_fresher else tot_years,
        "is_fresher": is_fresher,
        "notice_period": "Immediate (0 Days)",
        "work_mode": "Remote / Hybrid",
        "willing_to_relocate": "Yes",
        "work_authorization": "Authorized to work in India",
    }


def reparse_active_candidate_resume(user_id: Optional[str] = None) -> dict[str, Any]:
    """Locate the candidate's active resume file from local storage, frontend assets,
    or Supabase storage, re-parse all structured fields, update databases and training banks."""
    # 1. Search in local data/resumes directory
    candidate_file_bytes: Optional[bytes] = None
    candidate_file_name: Optional[str] = None

    if os.path.exists(RESUMES_DIR):
        files = [
            f for f in os.listdir(RESUMES_DIR)
            if f.lower().endswith((".pdf", ".docx", ".txt"))
        ]
        if files:
            files.sort(key=lambda x: os.path.getmtime(os.path.join(RESUMES_DIR, x)), reverse=True)
            candidate_file_name = files[0]
            with open(os.path.join(RESUMES_DIR, candidate_file_name), "rb") as f:
                candidate_file_bytes = f.read()

    # 2. Check frontend public or dist assets if not found
    if not candidate_file_bytes:
        public_candidates = [
            os.path.join(BASE_DIR, "frontend", "public", "Umesh-Temburwar-Resume.pdf"),
            os.path.join(BASE_DIR, "frontend", "dist", "Umesh-Temburwar-Resume.pdf"),
            os.path.join(BASE_DIR, "Umesh-Temburwar-Resume.pdf"),
            os.path.join(BASE_DIR, "Umesh-Temburwar-OCT.pdf"),
        ]
        for p in public_candidates:
            if os.path.exists(p):
                with open(p, "rb") as f:
                    candidate_file_bytes = f.read()
                candidate_file_name = os.path.basename(p)
                break

    # 3. Check Supabase storage if client available
    if not candidate_file_bytes and user_id:
        try:
            from services.profile_service import _get_supabase_client
            client = _get_supabase_client()
            if client:
                res = client.table("resumes").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
                if res.data and len(res.data) > 0:
                    storage_path = res.data[0].get("storage_path")
                    if storage_path:
                        candidate_file_bytes = client.storage.from_("resumes").download(storage_path)
                        candidate_file_name = res.data[0].get("file_name") or "resume.pdf"
        except Exception as sb_err:
            logger.debug("Supabase resume download in reparse: %s", sb_err)

    if not candidate_file_bytes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No candidate resume file found on disk or storage. Please upload a resume first.",
        )

    return parse_and_save_user_resume(
        file_bytes=candidate_file_bytes,
        file_name=candidate_file_name or "resume.pdf",
        user_id=user_id,
    )

def delete_user_resume_file() -> dict[str, Any]:
    """Physically remove all uploaded resume files from data/resumes/, clear resume_path,
    and wipe all candidate details and portal credentials from root .env and profile_data.json."""
    deleted_files = []
    if os.path.exists(RESUMES_DIR):
        for f in os.listdir(RESUMES_DIR):
            if f.lower().endswith((".pdf", ".docx")):
                f_path = os.path.join(RESUMES_DIR, f)
                try:
                    os.remove(f_path)
                    deleted_files.append(f)
                    logger.info("Deleted physical resume file: %s", f_path)
                except Exception as e:
                    logger.warning("Could not delete resume file %s: %s", f_path, e)

    # Clear from running environment
    for env_var in ["RESUME_PATH", "RESUME_NAME", "FIRSTNAME", "LASTNAME", "PHONE", "KEYWORDS", "LOCATION"]:
        if env_var in os.environ:
            del os.environ[env_var]

    # Clear all candidate personal fields and portal credentials from root .env
    env_wipes = {
        "FIRSTNAME": "",
        "LASTNAME": "",
        "PHONE": "",
        "KEYWORDS": "",
        "LOCATION": "",
        "NAUKRI_EMAIL": "",
        "NAUKRI_PASSWORD": "",
        "INTERNSHALA_EMAIL": "",
        "INTERNSHALA_PASSWORD": "",
        "INDEED_EMAIL": "",
        "INDEED_PASSWORD": "",
        "LINKEDIN_EMAIL": "",
        "LINKEDIN_PASSWORD": "",
        "FOUNDIT_EMAIL": "",
        "FOUNDIT_PASSWORD": "",
        "WELLFOUND_EMAIL": "",
        "WELLFOUND_PASSWORD": "",
        "GLASSDOOR_EMAIL": "",
        "GLASSDOOR_PASSWORD": "",
        "CUTSHORT_EMAIL": "",
        "CUTSHORT_PASSWORD": "",
        "RESUME_PATH": "",
        "RESUME_NAME": "",
        "TOTAL_EXPERIENCE_YEARS": "0",
        "RELEVANT_EXPERIENCE_YEARS": "0",
        "CURRENT_CTC": "0",
        "EXPECTED_CTC": "0",
        "NOTICE_PERIOD": "Immediate (0 Days)",
        "WORK_MODE": "Remote / Hybrid",
        "WILLING_TO_RELOCATE": "Yes",
        "GENDER": "Male",
        "EDUCATION_DEGREE": "",
        "EDUCATION_COLLEGE": "",
        "EDUCATION_PASSING_YEAR": "",
        "EDUCATION_SCORE": "",
        "LINKEDIN_URL": "",
        "GITHUB_URL": "",
        "PORTFOLIO_URL": "",
    }
    try:
        update_root_env_file(env_wipes)
    except Exception as e:
        logger.warning("Could not wipe root .env on resume delete: %s", e)

    # Completely reset profile_data.json
    try:
        clean_prof = {
            "personal": {
                "name": "",
                "firstname": "",
                "lastname": "",
                "email": "",
                "phone": "",
                "current_location": "",
                "preferred_locations": [],
                "notice_period": "Immediate (0 Days)",
                "total_experience_years": "0",
                "expected_ctc": "0",
                "relevant_experience_years": "0",
                "current_ctc": "0",
                "work_mode": "Remote / Hybrid",
                "willing_to_relocate": "Yes",
                "gender": "Male",
                "linkedin_url": "",
                "github_url": "",
                "portfolio_url": ""
            },
            "naukri_headline": "",
            "profile_summary": "",
            "key_skills": [],
            "education": {
                "degree": "",
                "field_of_study": "",
                "college": "",
                "location": "",
                "cgpa": "",
                "passing_year": "",
                "institution": "",
                "year": "",
                "score": ""
            },
            "experience": [],
            "projects": [],
            "certifications": [],
            "resume_name": None,
            "resume_path": None
        }
        with open(PROFILE_DATA_PATH, "w", encoding="utf-8") as pf:
            json.dump(clean_prof, pf, indent=2)
    except Exception as e:
        logger.warning("Could not reset profile_data.json after resume delete: %s", e)

    return {
        "status": "success",
        "message": f"Successfully deleted {len(deleted_files)} resume file(s) and cleared candidate data from .env and storage.",
        "deleted_files": deleted_files,
    }

def reset_all_candidate_data(user_id: Optional[str] = None) -> dict[str, Any]:
    """Completely wipe candidate data across Supabase, user_configs, SQLite, physical resumes, data/profile_data.json, and .env."""
    if user_id:
        delete_user_config(user_id)
    """Completely wipe candidate data across Supabase, SQLite, physical resumes, data/profile_data.json, and .env."""
    supabase = get_supabase_client()
    supabase_cleaned = []

    target_user_ids = []
    if user_id:
        target_user_ids.append(str(user_id))
    default_cid = os.getenv("CANDIDATE_USER_ID", "0ff8ac23-96d8-419e-9cff-ffd3b3430f17")
    if default_cid and default_cid not in target_user_ids:
        target_user_ids.append(default_cid)

    if supabase:
        tables_to_wipe = [
            "applications",
            "automation_tasks",
            "platform_connections",
            "job_preferences",
            "resumes",
            "application_answers",
        ]
        for tbl in tables_to_wipe:
            for uid in target_user_ids:
                if uid.startswith("usr_"):
                    continue
                try:
                    supabase.table(tbl).delete().eq("user_id", uid).execute()
                    if tbl not in supabase_cleaned:
                        supabase_cleaned.append(tbl)
                except Exception as e:
                    logger.warning("Could not wipe Supabase table %s for user %s: %s", tbl, uid, e)

        # Reset profile row to clean fresh defaults
        for uid in target_user_ids:
            if uid.startswith("usr_"):
                continue
            try:
                supabase.table("profiles").update({
                    "full_name": "Candidate",
                    "phone": None,
                    "city": None,
                    "headline": None,
                    "skills": [],
                    "summary": None,
                    "is_onboarded": False,
                    "onboarding_step": 1,
                    "onboarded_at": None,
                    "education": [],
                    "experience": [],
                    "projects": [],
                    "certifications": [],
                    "additional_info": {},
                    "linkedin_url": None,
                    "github_url": None,
                    "portfolio_url": None,
                }).eq("id", uid).execute()
                if "profiles_reset" not in supabase_cleaned:
                    supabase_cleaned.append("profiles_reset")
            except Exception as e:
                logger.warning("Could not reset profile in Supabase for user %s: %s", uid, e)

    # 2. Delete physical resume files from data/resumes/
    del_res = delete_user_resume_file()

    # 3. Reset data/profile_data.json to clean empty candidate template
    clean_profile = {
        "personal": {
            "firstname": "",
            "lastname": "",
            "phone": "",
            "email": "",
            "current_location": "",
        },
        "naukri_headline": "",
        "profile_summary": "",
        "key_skills": [],
        "education": [],
        "experience": [],
        "projects": [],
        "certifications": [],
        "resume_name": None,
        "resume_path": None,
    }
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(PROFILE_DATA_PATH, "w", encoding="utf-8") as f:
            json.dump(clean_profile, f, indent=2)
    except Exception as e:
        logger.warning("Could not reset profile_data.json: %s", e)

    # 4. Reset data/resume.ini to blank template
    clean_ini = '''# ==============================================================================
# INTERNSHALA RESUME CONFIGURATION (Universal Auto-Apply Bot)
# Profile: Fresh Candidate
# ==============================================================================

SKILLS = """
"""

CERTIFICATES = """
"""

PROJECTS = """
"""
'''
    try:
        with open(RESUME_INI_PATH, "w", encoding="utf-8") as f:
            f.write(clean_ini)
    except Exception as e:
        logger.warning("Could not reset resume.ini: %s", e)

    # 5. Clear local SQLite databases & tracking CSVs
    db_candidates = [
        os.path.join(DATA_DIR, "jobs_tracker.db"),
        os.path.join(BASE_DIR, "jobs_tracker.db"),
    ]
    for db_path in db_candidates:
        if os.path.exists(db_path):
            try:
                import sqlite3
                conn = sqlite3.connect(db_path)
                cur = conn.cursor()
                cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
                for (tbl,) in cur.fetchall():
                    if not tbl.startswith("sqlite_"):
                        cur.execute(f"DELETE FROM {tbl};")
                conn.commit()
                conn.close()
                logger.info("Cleared SQLite DB %s", db_path)
            except Exception as e:
                logger.warning("Could not clear SQLite DB %s: %s", db_path, e)

    csv_candidates = [
        os.path.join(DATA_DIR, "universal_applied_jobs.csv"),
        os.path.join(BASE_DIR, "universal_applied_jobs.csv"),
    ]
    for cp in csv_candidates:
        if os.path.exists(cp):
            try:
                os.remove(cp)
            except Exception:
                pass

    # 6. Wipe browser profile sessions for candidate
    session_base = os.path.join(BASE_DIR, "backend", "browser_sessions")
    if os.path.exists(session_base):
        import shutil
        for item in os.listdir(session_base):
            item_path = os.path.join(session_base, item)
            if os.path.isdir(item_path):
                shutil.rmtree(item_path, ignore_errors=True)

    # 7. Wipe .env candidate fields to empty
    env_wipes = {
        "FIRSTNAME": "",
        "LASTNAME": "",
        "PHONE": "",
        "KEYWORDS": "",
        "LOCATION": "",
        "PAGES_PER_KEYWORD": "2",
        "MAX_APPLICATIONS": "50",
        "BROWSER": "auto",
        "NAUKRI_EMAIL": "",
        "NAUKRI_PASSWORD": "",
        "INTERNSHALA_EMAIL": "",
        "INTERNSHALA_PASSWORD": "",
        "INDEED_EMAIL": "",
        "INDEED_PASSWORD": "",
        "LINKEDIN_EMAIL": "",
        "LINKEDIN_PASSWORD": "",
        "FOUNDIT_EMAIL": "",
        "FOUNDIT_PASSWORD": "",
        "WELLFOUND_EMAIL": "",
        "WELLFOUND_PASSWORD": "",
        "GLASSDOOR_EMAIL": "",
        "GLASSDOOR_PASSWORD": "",
        "CUTSHORT_EMAIL": "",
        "CUTSHORT_PASSWORD": "",
        "RESUME_PATH": "",
        "RESUME_NAME": "",
        "TOTAL_EXPERIENCE_YEARS": "",
        "RELEVANT_EXPERIENCE_YEARS": "",
        "CURRENT_CTC": "",
        "EXPECTED_CTC": "",
        "NOTICE_PERIOD": "",
        "WORK_MODE": "",
        "WILLING_TO_RELOCATE": "",
        "GENDER": "",
        "EDUCATION_DEGREE": "",
        "EDUCATION_COLLEGE": "",
        "EDUCATION_PASSING_YEAR": "",
        "EDUCATION_SCORE": "",
        "LINKEDIN_URL": "",
        "GITHUB_URL": "",
        "PORTFOLIO_URL": "",
        "TELEGRAM_BOT_TOKEN": "",
        "TELEGRAM_CHAT_ID": "",
        "DISCORD_WEBHOOK_URL": "",
        "GEMINI_API_KEY": "",
    }
    update_root_env_file(env_wipes)

    # Clean out repeated added comments and trailing orphan lines from .env
    if os.path.exists(ROOT_ENV_PATH):
        try:
            with open(ROOT_ENV_PATH, "r", encoding="utf-8") as f:
                cur_lines = f.readlines()
            cleaned_lines = []
            prev_was_header = False
            for ln in cur_lines:
                st = ln.strip()
                if st == "# --- Added by Universal Bot Setup ---":
                    if prev_was_header:
                        continue
                    prev_was_header = True
                else:
                    prev_was_header = False
                cleaned_lines.append(ln)
            with open(ROOT_ENV_PATH, "w", encoding="utf-8") as f:
                f.writelines(cleaned_lines)
        except Exception:
            pass

    # 8. Clear all backend in-memory caches
    try:
        from services.application_service import _MEMORY_APPLICATIONS
        _MEMORY_APPLICATIONS.clear()
    except Exception:
        pass

    try:
        from services.connection_service import _MEMORY_CONNECTIONS
        _MEMORY_CONNECTIONS.clear()
    except Exception:
        pass

    try:
        from services.preference_service import _MEMORY_PREFERENCES
        _MEMORY_PREFERENCES.clear()
    except Exception:
        pass

    try:
        from services.task_service import _MEMORY_TASKS
        _MEMORY_TASKS.clear()
    except Exception:
        pass

    try:
        from services.profile_service import (
            _MEMORY_PROFILES,
            _STATUS_CACHE,
            _PROFILE_CACHE,
        )
        _MEMORY_PROFILES.clear()
        _STATUS_CACHE.clear()
        _PROFILE_CACHE.clear()
    except Exception:
        pass

    try:
        from services.resume_service import _MEMORY_RESUMES
        _MEMORY_RESUMES.clear()
    except Exception:
        pass

    return {
        "status": "success",
        "message": "All candidate data, resumes, applications, credentials, and settings have been permanently wiped from Supabase and local storage.",
        "supabase_cleaned": supabase_cleaned,
        "resumes_deleted": del_res.get("deleted_files", []),
    }

