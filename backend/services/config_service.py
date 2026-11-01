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
            if f.lower().endswith((".pdf", ".docx")):
                return f, os.path.join(RESUMES_DIR, f)
    return None, None


def get_full_configuration() -> dict[str, Any]:
    """Retrieve combined configuration from .env, profile_data.json, and data/resumes."""
    env = get_current_env_dict()
    prof = get_current_profile_data()
    personal = prof.get("personal", {})
    edu = prof.get("education", {})
    if isinstance(edu, list) and len(edu) > 0:
        edu = edu[0]
    elif not isinstance(edu, dict):
        edu = {}
    r_name, r_path = get_latest_resume_info()

    return {
        # Personal details
        "firstname": env.get("FIRSTNAME") or personal.get("firstname") or "",
        "lastname": env.get("LASTNAME") or personal.get("lastname") or "",
        "phone": env.get("PHONE") or personal.get("phone") or "",
        "email": env.get("NAUKRI_EMAIL") or personal.get("email") or "",
        "gender": env.get("GENDER") or personal.get("gender") or "Male",
        # Search & Job Application Preferences
        "keywords": env.get("KEYWORDS") or prof.get("naukri_headline") or "full stack developer, react developer, node.js developer, web developer, software engineer",
        "location": env.get("LOCATION") or personal.get("current_location") or "pune",
        "pages_per_keyword": int(env.get("PAGES_PER_KEYWORD", 2)),
        "max_applications": int(env.get("MAX_APPLICATIONS", 50)),
        "browser": env.get("BROWSER") or "auto",
        # Career & Screening Details for all portals
        "total_experience_years": env.get("TOTAL_EXPERIENCE_YEARS") or str(personal.get("total_experience_years", "0")),
        "relevant_experience_years": env.get("RELEVANT_EXPERIENCE_YEARS") or str(personal.get("relevant_experience_years", "1")),
        "current_ctc": env.get("CURRENT_CTC") or personal.get("current_ctc", "0 (Fresher)"),
        "expected_ctc": env.get("EXPECTED_CTC") or personal.get("expected_ctc", "4.5 Lakhs"),
        "notice_period": env.get("NOTICE_PERIOD") or personal.get("notice_period", "Immediate (0 Days)"),
        "work_mode": env.get("WORK_MODE") or personal.get("work_mode", "Remote / Hybrid"),
        "willing_to_relocate": env.get("WILLING_TO_RELOCATE") or personal.get("willing_to_relocate", "Yes"),
        # Highest Education Details
        "education_degree": env.get("EDUCATION_DEGREE") or edu.get("degree", "Bachelor of Technology (B.Tech)"),
        "education_college": env.get("EDUCATION_COLLEGE") or edu.get("institution") or edu.get("college", ""),
        "education_passing_year": env.get("EDUCATION_PASSING_YEAR") or str(edu.get("year") or edu.get("passing_year", "2025")),
        "education_score": env.get("EDUCATION_SCORE") or str(edu.get("score") or edu.get("cgpa", "")),
        # Social & Portfolio Links
        "linkedin_url": env.get("LINKEDIN_URL") or personal.get("linkedin_url", ""),
        "github_url": env.get("GITHUB_URL") or personal.get("github_url", ""),
        "portfolio_url": env.get("PORTFOLIO_URL") or personal.get("portfolio_url", ""),
        "cover_letter": env.get("COVER_LETTER") or prof.get("cover_letter", ""),
        # Platform credentials
        "naukri_email": env.get("NAUKRI_EMAIL", ""),
        "naukri_password": env.get("NAUKRI_PASSWORD", ""),
        "internshala_email": env.get("INTERNSHALA_EMAIL", ""),
        "internshala_password": env.get("INTERNSHALA_PASSWORD", ""),
        "indeed_email": env.get("INDEED_EMAIL", ""),
        "indeed_password": env.get("INDEED_PASSWORD", ""),
        "linkedin_email": env.get("LINKEDIN_EMAIL", ""),
        "linkedin_password": env.get("LINKEDIN_PASSWORD", ""),
        "foundit_email": env.get("FOUNDIT_EMAIL", ""),
        "foundit_password": env.get("FOUNDIT_PASSWORD", ""),
        "wellfound_email": env.get("WELLFOUND_EMAIL", ""),
        "wellfound_password": env.get("WELLFOUND_PASSWORD", ""),
        "glassdoor_email": env.get("GLASSDOOR_EMAIL", ""),
        "glassdoor_password": env.get("GLASSDOOR_PASSWORD", ""),
        "cutshort_email": env.get("CUTSHORT_EMAIL", ""),
        "cutshort_password": env.get("CUTSHORT_PASSWORD", ""),
        # AI & Notifications
        "telegram_bot_token": env.get("TELEGRAM_BOT_TOKEN", ""),
        "telegram_chat_id": env.get("TELEGRAM_CHAT_ID", ""),
        "discord_webhook_url": env.get("DISCORD_WEBHOOK_URL", ""),
        "gemini_api_key": env.get("GEMINI_API_KEY", ""),
        "dashboard_port": int(env.get("DASHBOARD_PORT", 5000)),
        # Resume state
        "resume_name": r_name,
        "resume_path": r_path,
        "key_skills": prof.get("key_skills", []),
        "profile_summary": prof.get("profile_summary", ""),
        "naukri_headline": prof.get("naukri_headline", ""),
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
        ("Notice Period", notice, "text"),
        ("What is your official notice period?", notice, "text"),
        ("Notice period in days", "0" if "immed" in notice.lower() or "0" in notice else "30", "text"),
        ("Are you an immediate joiner?", is_immediate, "radio"),
        ("Can you join immediately?", is_immediate, "radio"),
        ("How soon can you join?", notice, "text"),
        ("Total years of experience", tot_exp, "text"),
        ("Total Experience", tot_exp, "text"),
        ("Total Experience in years", tot_exp, "text"),
        ("How many years of experience do you have?", tot_exp, "text"),
        ("Relevant Experience", rel_exp, "text"),
        ("Years of experience in Full Stack Development", rel_exp, "text"),
        ("Years of experience in Web Development", rel_exp, "text"),
        ("Current CTC", cur_ctc, "text"),
        ("Current CTC (in LPA)", cur_ctc, "text"),
        ("Current Annual Salary", cur_ctc, "text"),
        ("Expected CTC", exp_ctc, "text"),
        ("Expected CTC (in LPA)", exp_ctc, "text"),
        ("Expected Annual Salary", f"{exp_ctc} Lakhs", "text"),
        ("Are you willing to relocate?", relocate, "radio"),
        ("Willing to relocate?", relocate, "radio"),
        ("Are you open to relocate?", relocate, "radio"),
        ("Work mode preference", work_mode, "radio"),
        ("Preferred work mode", work_mode, "radio"),
        ("Are you comfortable working remotely?", "Yes" if "remote" in work_mode.lower() or "any" in work_mode.lower() else "No", "radio"),
        ("Highest qualification", degree, "text"),
        ("Highest Degree", degree, "text"),
        ("Degree", degree, "text"),
        ("College Name", college, "text"),
        ("University / College", college, "text"),
        ("Graduation Year", pass_yr, "text"),
        ("Passing Year", pass_yr, "text"),
        ("Year of Graduation", pass_yr, "text"),
        ("CGPA / Percentage", score, "text"),
        ("Percentage / CGPA", score, "text"),
        ("LinkedIn Profile URL", linkedin, "text"),
        ("LinkedIn", linkedin, "text"),
        ("GitHub Profile URL", github, "text"),
        ("GitHub", github, "text"),
        ("Portfolio URL", portfolio, "text"),
        ("Personal Website", portfolio, "text"),
        ("Gender", gender, "radio"),
        ("Phone Number", phone, "text"),
        ("Email Address", email, "text"),
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
    """Persist user configuration to root .env, data/profile_data.json, and data/resume.ini."""
    existing_env = get_current_env_dict()

    def _get_val(cfg_key: str, env_key: str, default: str = "") -> str:
        if cfg_key in config and config[cfg_key] is not None and str(config[cfg_key]).strip() != "":
            return str(config[cfg_key]).strip()
        return existing_env.get(env_key, default).strip()

    # 1. Base profile fields
    fname = _get_val("firstname", "FIRSTNAME")
    lname = _get_val("lastname", "LASTNAME")
    phone = _get_val("phone", "PHONE")
    keywords = _get_val("keywords", "KEYWORDS")
    location = _get_val("location", "LOCATION", "pune")
    pages_per_kw = _get_val("pages_per_keyword", "PAGES_PER_KEYWORD", "2")
    max_apps = _get_val("max_applications", "MAX_APPLICATIONS", "50")
    browser = _get_val("browser", "BROWSER", "auto").lower()

    # Job & Career Details
    tot_exp = _get_val("total_experience_years", "TOTAL_EXPERIENCE_YEARS")
    rel_exp = _get_val("relevant_experience_years", "RELEVANT_EXPERIENCE_YEARS")
    cur_ctc = _get_val("current_ctc", "CURRENT_CTC")
    exp_ctc = _get_val("expected_ctc", "EXPECTED_CTC")
    notice = _get_val("notice_period", "NOTICE_PERIOD")
    work_mode = _get_val("work_mode", "WORK_MODE")
    relocate = _get_val("willing_to_relocate", "WILLING_TO_RELOCATE")
    gender = _get_val("gender", "GENDER", "Male")

    degree = _get_val("education_degree", "EDUCATION_DEGREE")
    college = _get_val("education_college", "EDUCATION_COLLEGE")
    pass_yr = _get_val("education_passing_year", "EDUCATION_PASSING_YEAR")
    score = _get_val("education_score", "EDUCATION_SCORE")

    linkedin = _get_val("linkedin_url", "LINKEDIN_URL")
    github = _get_val("github_url", "GITHUB_URL")
    portfolio = _get_val("portfolio_url", "PORTFOLIO_URL")
    cover_letter = str(config.get("cover_letter") or "").strip()

    env_map: dict[str, str] = {
        "FIRSTNAME": fname,
        "LASTNAME": lname,
        "PHONE": phone,
        "KEYWORDS": keywords,
        "LOCATION": location,
        "PAGES_PER_KEYWORD": pages_per_kw,
        "MAX_APPLICATIONS": max_apps,
        "BROWSER": browser,
        "TOTAL_EXPERIENCE_YEARS": tot_exp,
        "RELEVANT_EXPERIENCE_YEARS": rel_exp,
        "CURRENT_CTC": cur_ctc,
        "EXPECTED_CTC": exp_ctc,
        "NOTICE_PERIOD": notice,
        "WORK_MODE": work_mode,
        "WILLING_TO_RELOCATE": relocate,
        "GENDER": gender,
        "EDUCATION_DEGREE": degree,
        "EDUCATION_COLLEGE": college,
        "EDUCATION_PASSING_YEAR": pass_yr,
        "EDUCATION_SCORE": score,
        "LINKEDIN_URL": linkedin,
        "GITHUB_URL": github,
        "PORTFOLIO_URL": portfolio,
    }

    # Portal Credentials: ONLY update if explicitly provided and non-empty in config, OR keep existing!
    portal_keys = [
        ("naukri_email", "NAUKRI_EMAIL"),
        ("naukri_password", "NAUKRI_PASSWORD"),
        ("internshala_email", "INTERNSHALA_EMAIL"),
        ("internshala_password", "INTERNSHALA_PASSWORD"),
        ("indeed_email", "INDEED_EMAIL"),
        ("indeed_password", "INDEED_PASSWORD"),
        ("linkedin_email", "LINKEDIN_EMAIL"),
        ("linkedin_password", "LINKEDIN_PASSWORD"),
        ("foundit_email", "FOUNDIT_EMAIL"),
        ("foundit_password", "FOUNDIT_PASSWORD"),
        ("wellfound_email", "WELLFOUND_EMAIL"),
        ("wellfound_password", "WELLFOUND_PASSWORD"),
        ("glassdoor_email", "GLASSDOOR_EMAIL"),
        ("glassdoor_password", "GLASSDOOR_PASSWORD"),
        ("cutshort_email", "CUTSHORT_EMAIL"),
        ("cutshort_password", "CUTSHORT_PASSWORD"),
        ("telegram_bot_token", "TELEGRAM_BOT_TOKEN"),
        ("telegram_chat_id", "TELEGRAM_CHAT_ID"),
        ("discord_webhook_url", "DISCORD_WEBHOOK_URL"),
        ("gemini_api_key", "GEMINI_API_KEY"),
        ("dashboard_port", "DASHBOARD_PORT"),
    ]
    for cfg_k, env_k in portal_keys:
        if cfg_k in config and config[cfg_k] is not None and str(config[cfg_k]).strip() != "":
            env_map[env_k] = str(config[cfg_k]).strip()
        elif env_k in existing_env and existing_env[env_k].strip() != "":
            env_map[env_k] = existing_env[env_k].strip()

    # Candidate profile email fallback for NAUKRI_EMAIL if not set
    cand_email = str(config.get("email") or "").strip()
    if cand_email and not env_map.get("NAUKRI_EMAIL"):
        env_map["NAUKRI_EMAIL"] = cand_email

    # Update .env
    update_root_env_file(env_map)

    # 2. Update data/profile_data.json
    full_name = f"{fname} {lname}".strip()
    effective_email = cand_email or env_map.get("NAUKRI_EMAIL") or None
    prof_updates = {
        "full_name": full_name or None,
        "email": effective_email,
        "phone": phone or None,
        "city": location,
        "headline": keywords,
        "linkedin_url": linkedin or None,
        "github_url": github or None,
        "portfolio_url": portfolio or None,
    }
    if config.get("key_skills"):
        prof_updates["skills"] = config["key_skills"]
    elif keywords:
        prof_updates["skills"] = [k.strip() for k in keywords.split(",") if k.strip()]

    sync_local_profile_data(prof_updates)

    # Update profile_data.json personal and education objects directly
    prof_json = get_current_profile_data()
    prof_json["personal"] = prof_json.get("personal", {})
    prof_json["personal"].update({
        "name": full_name or prof_json["personal"].get("name", ""),
        "firstname": fname or prof_json["personal"].get("firstname", ""),
        "lastname": lname or prof_json["personal"].get("lastname", ""),
        "email": effective_email or prof_json["personal"].get("email", ""),
        "phone": phone or prof_json["personal"].get("phone", ""),
        "current_location": location or prof_json["personal"].get("current_location", "Pune"),
        "total_experience_years": tot_exp or prof_json["personal"].get("total_experience_years", "0"),
        "relevant_experience_years": rel_exp or prof_json["personal"].get("relevant_experience_years", "1"),
        "current_ctc": cur_ctc or prof_json["personal"].get("current_ctc", "0 (Fresher)"),
        "expected_ctc": exp_ctc or prof_json["personal"].get("expected_ctc", "4.5 Lakhs"),
        "notice_period": notice or prof_json["personal"].get("notice_period", "Immediate (0 Days)"),
        "work_mode": work_mode or prof_json["personal"].get("work_mode", "Remote / Hybrid"),
        "willing_to_relocate": relocate or prof_json["personal"].get("willing_to_relocate", "Yes"),
        "gender": gender or prof_json["personal"].get("gender", "Male"),
        "linkedin_url": linkedin or prof_json["personal"].get("linkedin_url", ""),
        "github_url": github or prof_json["personal"].get("github_url", ""),
        "portfolio_url": portfolio or prof_json["personal"].get("portfolio_url", ""),
    })

    edu_obj = prof_json.get("education") or {}
    if isinstance(edu_obj, list):
        edu_obj = edu_obj[0] if edu_obj else {}
    elif not isinstance(edu_obj, dict):
        edu_obj = {}
    edu_obj.update({
        "degree": degree or edu_obj.get("degree", "Bachelor of Technology (B.Tech)"),
        "institution": college or edu_obj.get("institution") or edu_obj.get("college", ""),
        "college": college or edu_obj.get("college") or edu_obj.get("institution", ""),
        "year": pass_yr or edu_obj.get("year", "2025"),
        "passing_year": pass_yr or edu_obj.get("passing_year", "2025"),
        "score": score or edu_obj.get("score", ""),
    })
    prof_json["education"] = edu_obj
    if cover_letter:
        prof_json["cover_letter"] = cover_letter

    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(PROFILE_DATA_PATH, "w", encoding="utf-8") as f:
            json.dump(prof_json, f, indent=2)
    except Exception as e:
        logger.warning("Could not persist full profile_data.json: %s", e)

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
        "total_experience_years": tot_years if tot_years != "0" else prof["personal"].get("total_experience_years", "0"),
    })
    prof["resume_path"] = safe_path
    if headline:
        prof["naukri_headline"] = headline
    if skills:
        prof["key_skills"] = skills
    if education:
        prof["education"] = edu_first
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

    # Train bot immediately with extracted details
    try:
        train_bot_with_candidate_details({
            "firstname": fname,
            "lastname": lname,
            "phone": phone,
            "email": email,
            "location": city,
            "total_experience_years": tot_years,
            "education_degree": edu_degree,
            "education_college": edu_college,
            "education_passing_year": edu_year,
            "education_score": edu_score,
            "linkedin_url": linkedin_url,
            "github_url": github_url,
            "portfolio_url": portfolio_url,
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
        "total_experience_years": tot_years,
    }

def delete_user_resume_file() -> dict[str, Any]:
    """Physically remove all uploaded resume files from data/resumes/, clear resume_path in profile and env."""
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
    if "RESUME_PATH" in os.environ:
        del os.environ["RESUME_PATH"]

    # Clear from profile_data.json
    try:
        prof = get_current_profile_data()
        prof["resume_path"] = None
        prof["resume_name"] = None
        with open(PROFILE_DATA_PATH, "w", encoding="utf-8") as pf:
            json.dump(prof, pf, indent=2)
    except Exception as e:
        logger.warning("Could not update profile_data.json after resume delete: %s", e)

    return {
        "status": "success",
        "message": f"Successfully deleted {len(deleted_files)} resume file(s) from project storage.",
        "deleted_files": deleted_files,
    }

def reset_all_candidate_data(user_id: Optional[str] = None) -> dict[str, Any]:
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
                try:
                    supabase.table(tbl).delete().eq("user_id", uid).execute()
                    if tbl not in supabase_cleaned:
                        supabase_cleaned.append(tbl)
                except Exception as e:
                    logger.warning("Could not wipe Supabase table %s for user %s: %s", tbl, uid, e)

        # Reset profile row to clean fresh defaults
        for uid in target_user_ids:
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

