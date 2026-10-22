import os
import json
import csv
import re
from datetime import datetime, timezone
from dotenv import load_dotenv

# Load root .env and backend/.env
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "..", "..", "..", "d:", "Projects", "Naukri-autoapply-bot-main"))
if not os.path.exists(BASE_DIR):
    BASE_DIR = r"D:\Projects\Naukri-autoapply-bot-main"

load_dotenv(os.path.join(BASE_DIR, ".env"))
load_dotenv(os.path.join(BASE_DIR, "backend", ".env"))

from supabase import create_client

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
print(f"Connecting to Supabase at: {url}")
client = create_client(url, key)

# 1. Get primary user ID
profiles_res = client.table("profiles").select("id, full_name, email").limit(1).execute()
if not profiles_res.data:
    print("Error: No profile found in Supabase!")
    exit(1)

user_id = profiles_res.data[0]["id"]
print(f"Target User ID: {user_id} ({profiles_res.data[0].get('email')})")

# 2. Sync Profile from profile_data.json
profile_json_path = os.path.join(BASE_DIR, "profile_data.json")
if os.path.exists(profile_json_path):
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
        "city": personal.get("current_location", "Pune"),
        "headline": pdata.get("naukri_headline", ""),
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
    client.table("profiles").update(profile_update).eq("id", user_id).execute()
    print("[OK] Synced Profile Data from profile_data.json")

    # Sync Job Preferences
    pref_update = {
        "job_titles": [
            "Full Stack Developer",
            "React Developer",
            "Node.js Developer",
            "Software Engineer",
            "Frontend Developer",
            "Backend Developer"
        ],
        "locations": personal.get("preferred_locations", ["Pune", "Bangalore", "Remote"]),
        "experience_level": "entry_level",
        "employment_types": ["full_time"],
        "min_salary": 450000,
        "max_salary": 800000,
        "selected_platforms": ["naukri", "internshala", "indeed", "linkedin"],
        "daily_application_limit": 50,
        "require_manual_review": False,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    client.table("job_preferences").upsert({"user_id": user_id, **pref_update}, on_conflict="user_id").execute()
    print("[OK] Synced Job Preferences")

# 3. Sync Screening Answers from application_answers.csv
answers_csv_path = os.path.join(BASE_DIR, "application_answers.csv")
if os.path.exists(answers_csv_path):
    answers_count = 0
    with open(answers_csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            q = (row.get("question_text") or "").strip()
            a = (row.get("answer") or "").strip()
            ft = (row.get("field_type") or "text").strip()
            if q and a:
                client.table("application_answers").upsert({
                    "user_id": user_id,
                    "question": q,
                    "answer": a,
                    "field_type": ft,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }, on_conflict="user_id,question").execute()
                answers_count += 1
    print(f"[OK] Synced {answers_count} Screening Answers into public.application_answers")

# 4. Sync Applications from universal_applied_jobs.csv
csv_path = os.path.join(BASE_DIR, "universal_applied_jobs.csv")
if os.path.exists(csv_path):
    app_count = 0
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            url = (row.get("url") or "").strip()
            platform = (row.get("platform") or "Naukri").strip()
            status_val = (row.get("status") or "applied").strip().lower()
            if status_val not in ('applied', 'review_needed', 'interview', 'rejected', 'saved', 'failed', 'under_review'):
                status_val = 'applied'

            ts_str = (row.get("timestamp") or "").strip()
            try:
                dt = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")
                applied_at = dt.replace(tzinfo=timezone.utc).isoformat()
            except Exception:
                applied_at = datetime.now(timezone.utc).isoformat()

            # Parse title & company from url or text
            job_title = "Software Engineer"
            company = "Naukri Listed Employer"
            location = "India"

            # Parse naukri URL format: /job-listings-<title>-<company>-<location>-...
            if "naukri.com/job-listings-" in url:
                slug = url.split("naukri.com/job-listings-")[-1].split("?")[0]
                parts = slug.split("-")
                # e.g. python-developer-techasoft-bengaluru-0-to-2-years-081026506556
                cleaned_parts = [p.capitalize() for p in parts if not p.isdigit() and p not in ("years", "to")]
                if len(cleaned_parts) >= 2:
                    job_title = " ".join(cleaned_parts[:2])
                if len(cleaned_parts) >= 3:
                    company = cleaned_parts[2]
                if "bengaluru" in slug.lower():
                    location = "Bengaluru"
                elif "pune" in slug.lower():
                    location = "Pune"
                elif "hyderabad" in slug.lower():
                    location = "Hyderabad"
                elif "mumbai" in slug.lower():
                    location = "Mumbai"

            if url:
                app_row = {
                    "user_id": user_id,
                    "job_title": job_title,
                    "company": company,
                    "job_url": url,
                    "platform": platform,
                    "status": status_val,
                    "location": location,
                    "applied_at": applied_at,
                    "updated_at": applied_at,
                }
                try:
                    client.table("applications").upsert(app_row, on_conflict="user_id,job_url").execute()
                    app_count += 1
                except Exception as ex:
                    print(f"Skipped {url[:40]}: {ex}")

    print(f"[OK] Synced {app_count} Job Applications into public.applications")

print("All Supabase data successfully setup and synchronized!")
