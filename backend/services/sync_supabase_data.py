import os
import json
import csv
import re
from pathlib import Path
from datetime import datetime, timezone
from dotenv import load_dotenv

# Dynamic Base Directory
BASE_DIR = Path(__file__).resolve().parents[2]

# Load root .env and backend/.env
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR / "backend" / ".env")

from supabase import create_client

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

if not url or not key:
    print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY!")
    exit(1)

print(f"Connecting to Supabase at: {url}")
client = create_client(url, key)

# 1. Target candidate identification
# Priority: CANDIDATE_USER_ID -> umeshtemburwar2002@gmail.com -> first profile
target_user_id = os.getenv("CANDIDATE_USER_ID")

if not target_user_id:
    # Look for Umesh's profile specifically
    umesh_res = (
        client.table("profiles")
        .select("id, full_name, email")
        .ilike("email", "%umesh%")
        .limit(1)
        .execute()
    )
    if umesh_res.data:
        target_user_id = str(umesh_res.data[0]["id"])
    else:
        # Fallback to first profile
        first_res = client.table("profiles").select("id, full_name, email").limit(1).execute()
        if first_res.data:
            target_user_id = str(first_res.data[0]["id"])

if not target_user_id:
    print("Error: No candidate profile found in Supabase!")
    exit(1)

# Fetch user metadata
prof_info = (
    client.table("profiles")
    .select("id, full_name, email")
    .eq("id", target_user_id)
    .limit(1)
    .execute()
)
user_email = prof_info.data[0].get("email") if prof_info.data else "unknown"
user_name = prof_info.data[0].get("full_name") if prof_info.data else "Candidate"
print(f"Target Candidate: {user_name} ({target_user_id}) - {user_email}")

# 2. Sync Profile from profile_data.json
profile_json_path = (BASE_DIR / "data" / "profile_data.json") if (BASE_DIR / "data" / "profile_data.json").exists() else (BASE_DIR / "profile_data.json")
if profile_json_path.exists():
    with open(profile_json_path, "r", encoding="utf-8") as f:
        pdata = json.load(f)

    personal = pdata.get("personal", {})
    edu = pdata.get("education", {})
    exp = pdata.get("experience", [])
    projects = pdata.get("projects", [])
    skills = pdata.get("key_skills", [])

    profile_update = {
        "full_name": personal.get("name", "Umesh Temburwar"),
        "phone": personal.get("phone", "+918856087984"),
        "city": personal.get("current_location", "Ambajogai"),
        "headline": pdata.get("naukri_headline", "Full Stack Developer | React.js, Node.js, Express.js, PostgreSQL"),
        "summary": pdata.get("profile_summary", ""),
        "skills": skills,
        "education": [edu] if isinstance(edu, dict) else edu,
        "experience": exp,
        "projects": projects,
        "is_onboarded": True,
        "onboarding_step": 4,
        "onboarded_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    client.table("profiles").update(profile_update).eq("id", target_user_id).execute()
    print("[OK] Synced Profile Data from profile_data.json")

    # Sync Job Preferences
    pref_update = {
        "job_titles": [
            "Full Stack Developer",
            "React Developer",
            "Node.js Developer",
            "Software Engineer",
            "Frontend Developer",
            "Backend Developer",
        ],
        "locations": personal.get("preferred_locations", ["Pune", "Bangalore", "Mumbai", "Hyderabad", "Remote"]),
        "experience_level": "entry_level",
        "employment_types": ["full_time"],
        "min_salary": 450000,
        "max_salary": 800000,
        "selected_platforms": ["naukri", "internshala", "indeed", "linkedin"],
        "daily_application_limit": 50,
        "require_manual_review": False,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    client.table("job_preferences").upsert(
        {"user_id": target_user_id, **pref_update}, on_conflict="user_id"
    ).execute()
    print("[OK] Synced Job Preferences")

# 3. Sync Screening Answers from application_answers.csv
answers_csv_path = (BASE_DIR / "data" / "application_answers.csv") if (BASE_DIR / "data" / "application_answers.csv").exists() else (BASE_DIR / "application_answers.csv")
if answers_csv_path.exists():
    answers_count = 0
    with open(answers_csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            q = (row.get("question_text") or "").strip()
            a = (row.get("answer") or "").strip()
            ft = (row.get("field_type") or "text").strip()
            if q and a:
                client.table("application_answers").upsert(
                    {
                        "user_id": target_user_id,
                        "question": q,
                        "answer": a,
                        "field_type": ft,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    },
                    on_conflict="user_id,question",
                ).execute()
                answers_count += 1
    print(f"[OK] Synced {answers_count} Screening Answers into public.application_answers")

# 4. Sync Applications from universal_applied_jobs.csv
csv_path = (BASE_DIR / "data" / "universal_applied_jobs.csv") if (BASE_DIR / "data" / "universal_applied_jobs.csv").exists() else (BASE_DIR / "universal_applied_jobs.csv")
if csv_path.exists():
    latest_by_url = {}
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            url = (row.get("url") or "").strip()
            if not url:
                continue

            platform = (row.get("platform") or "Naukri").strip().capitalize()
            if platform.lower() == "linkedin":
                platform = "LinkedIn"
            elif platform.lower() == "internshala":
                platform = "Internshala"

            status_val = (row.get("status") or "applied").strip().lower()
            if status_val not in (
                "applied",
                "review_needed",
                "interview",
                "rejected",
                "saved",
                "failed",
                "under_review",
            ):
                status_val = "applied"

            ts_str = (row.get("timestamp") or "").strip()
            try:
                dt = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")
                applied_at = dt.replace(tzinfo=timezone.utc).isoformat()
            except Exception:
                applied_at = datetime.now(timezone.utc).isoformat()

            # Job Title and Company from CSV
            job_title = (row.get("job_title") or "").strip()
            company = (row.get("company") or "").strip()
            location = "Pune, India"

            # Parse location from URL or text
            url_lower = url.lower()
            if "remote" in url_lower or "work-from-home" in url_lower:
                location = "Remote"
            elif "bengaluru" in url_lower or "bangalore" in url_lower:
                location = "Bengaluru"
            elif "pune" in url_lower:
                location = "Pune"
            elif "hyderabad" in url_lower:
                location = "Hyderabad"
            elif "mumbai" in url_lower or "navi-mumbai" in url_lower:
                location = "Mumbai"
            elif "noida" in url_lower or "delhi" in url_lower or "gurgaon" in url_lower:
                location = "Delhi NCR"
            elif "chennai" in url_lower:
                location = "Chennai"

            if not job_title or job_title.lower().startswith("http"):
                job_title = "Full Stack Developer"
            if not company or company.lower().startswith("http"):
                company = f"{platform} Listed Employer"

            row_item = {
                "job_title": job_title,
                "company": company,
                "job_url": url,
                "platform": platform,
                "status": status_val,
                "location": location,
                "applied_at": applied_at,
                "updated_at": applied_at,
            }
            if url not in latest_by_url or row_item["applied_at"] > latest_by_url[url]["applied_at"]:
                latest_by_url[url] = row_item

    unique_apps = list(latest_by_url.values())

    # Sync ONLY to target candidate account (isolated per user)
    batch = []
    for item in unique_apps:
        app_row = dict(item)
        app_row["user_id"] = target_user_id
        batch.append(app_row)
        if len(batch) >= 50:
            try:
                client.table("applications").upsert(batch, on_conflict="user_id,job_url").execute()
            except Exception as ex:
                print(f"Batch upsert error for user {target_user_id[:8]}: {ex}")
            batch = []
    if batch:
        try:
            client.table("applications").upsert(batch, on_conflict="user_id,job_url").execute()
        except Exception as ex:
            print(f"Final batch upsert error for user {target_user_id[:8]}: {ex}")

    print(f"[OK] Synced {len(unique_apps)} unique applications to candidate profile {target_user_id} in public.applications")

print(f"All Supabase data successfully synchronized for candidate: {user_name} ({target_user_id})")
