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

ROLE_CATEGORIES_REGISTRY: dict[str, dict[str, Any]] = {
    "fullstack": {
        "name": "Full Stack Engineering",
        "triggers": ["fullstack", "full stack", "mern", "mean", "web app", "software engineer", "software development"],
        "roles": [
            "Full Stack Developer",
            "MERN Stack Developer",
            "MEAN Stack Developer",
            "Full Stack Python Developer",
            "Full Stack Java Developer",
            "Software Engineer",
        ],
    },
    "frontend": {
        "name": "Frontend & UI Engineering",
        "triggers": ["react", "vue", "angular", "frontend", "html", "css", "tailwind", "javascript", "typescript", "next.js", "nextjs", "ui/ux", "web design"],
        "roles": [
            "Frontend Developer",
            "React Developer",
            "Next.js Developer",
            "Angular Developer",
            "Vue.js Developer",
            "UI/UX Engineer",
            "JavaScript Developer",
            "TypeScript Developer",
        ],
    },
    "backend": {
        "name": "Backend & API Engineering",
        "triggers": ["node.js", "nodejs", "express", "fastapi", "django", "flask", "backend", "python", "java", "golang", "go", "c++", "c#", ".net", "spring boot", "springboot", "sql", "postgresql", "mongodb", "rest api", "microservices"],
        "roles": [
            "Backend Developer",
            "Node.js Developer",
            "Python Developer",
            "Java Developer",
            "FastAPI Developer",
            "Django Developer",
            "Go / Golang Developer",
            "C++ Developer",
            ".NET / C# Developer",
            "REST API Engineer",
        ],
    },
    "mobile": {
        "name": "Mobile App Development",
        "triggers": ["react native", "flutter", "android", "ios", "kotlin", "swift", "mobile", "dart"],
        "roles": [
            "Mobile App Developer",
            "React Native Developer",
            "Flutter Developer",
            "Android Developer",
            "iOS Developer",
            "Kotlin Developer",
            "Swift Developer",
        ],
    },
    "ai_data": {
        "name": "AI, ML & Data Science",
        "triggers": ["pandas", "numpy", "tensorflow", "pytorch", "machine learning", "data science", "data analysis", "data analyst", "deep learning", "nlp", "llm", "generative ai", "computer vision", "bi", "tableau", "power bi"],
        "roles": [
            "AI Engineer",
            "Machine Learning Engineer",
            "Data Scientist",
            "Data Analyst",
            "Data Engineer",
            "Generative AI / LLM Engineer",
            "NLP Engineer",
            "BI / Business Intelligence Developer",
        ],
    },
    "devops_cloud": {
        "name": "Cloud, DevOps & SRE",
        "triggers": ["docker", "kubernetes", "aws", "azure", "gcp", "devops", "ci/cd", "linux", "cloud", "terraform", "sre", "ansible"],
        "roles": [
            "DevOps Engineer",
            "Cloud Engineer (AWS / Azure / GCP)",
            "Site Reliability Engineer (SRE)",
            "Kubernetes Platform Engineer",
            "CI/CD Automation Engineer",
            "Linux System Administrator",
        ],
    },
    "qa_testing": {
        "name": "QA & Test Automation",
        "triggers": ["selenium", "playwright", "automation", "qa", "pytest", "jest", "testing", "cypress", "sdet", "manual testing"],
        "roles": [
            "QA Automation Engineer",
            "SDET (Software Development Engineer in Test)",
            "Software Test Engineer",
            "Manual QA Tester",
            "Selenium / Playwright Tester",
            "Performance Test Engineer",
        ],
    },
    "security": {
        "name": "Cybersecurity & InfoSec",
        "triggers": ["cybersecurity", "security", "infosec", "soc", "penetration testing", "ethical hacking", "appsec", "network security", "owasp", "cryptography"],
        "roles": [
            "Cybersecurity Analyst",
            "Information Security Engineer",
            "SOC Analyst",
            "Penetration Tester / Ethical Hacker",
            "Application Security (AppSec) Engineer",
            "Network Security Engineer",
        ],
    },
    "product_mgmt": {
        "name": "Product & Agile Management",
        "triggers": ["product management", "product manager", "scrum", "agile", "project coordinator", "project manager", "scrum master", "technical program manager", "business analyst"],
        "roles": [
            "Associate Product Manager (APM)",
            "Product Manager",
            "Project Coordinator",
            "Scrum Master",
            "Technical Program Manager (TPM)",
            "IT Business Analyst",
        ],
    },
    "systems_iot": {
        "name": "Systems, Embedded & IoT",
        "triggers": ["embedded", "firmware", "iot", "robotics", "microcontroller", "arduino", "raspberry pi", "rtos", "hardware"],
        "roles": [
            "Embedded Systems Engineer",
            "Firmware Engineer",
            "IoT Solutions Developer",
            "Robotics Software Engineer",
            "Network Engineer",
        ],
    },
    "fresher_intern": {
        "name": "Freshers & Internships",
        "triggers": ["fresher", "intern", "internship", "trainee", "entry level", "graduate engineer trainee", "get", "junior"],
        "roles": [
            "Software Engineer Intern",
            "Frontend Developer Intern",
            "Backend Developer Intern",
            "Full Stack Intern",
            "Graduate Engineer Trainee (GET)",
            "Junior Software Developer",
            "Associate Software Engineer",
            "Technical Support Engineer",
        ],
    },
}

ROLE_MAPPINGS = [
    (cat_data["triggers"], cat_data["roles"][0])
    for cat_data in ROLE_CATEGORIES_REGISTRY.values()
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
            else:
                # Seed default row in Supabase
                now_iso = datetime.now(timezone.utc).isoformat()
                new_row = {
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
                    "created_at": now_iso,
                    "updated_at": now_iso,
                }
                res_ins = client.table("job_preferences").insert(new_row).execute()
                if res_ins.data and len(res_ins.data) > 0:
                    r = res_ins.data[0]
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
            else:
                # No row existed yet -> Insert new record
                insert_dict = {"user_id": user_id, "created_at": now_iso, **update_dict}
                res_ins = client.table("job_preferences").insert(insert_dict).execute()
                if res_ins.data and len(res_ins.data) > 0:
                    r = res_ins.data[0]
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


def get_all_role_categories() -> dict[str, Any]:
    """Return complete structured catalog of all role categories and suggested titles."""
    catalog = []
    all_titles = []
    for cat_id, cat_info in ROLE_CATEGORIES_REGISTRY.items():
        catalog.append({
            "id": cat_id,
            "name": cat_info["name"],
            "roles": cat_info["roles"],
            "trigger_keywords_count": len(cat_info["triggers"]),
        })
        all_titles.extend(cat_info["roles"])

    return {
        "total_categories": len(catalog),
        "total_roles": len(set(all_titles)),
        "categories": catalog,
    }
