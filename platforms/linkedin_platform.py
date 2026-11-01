"""
LinkedIn Easy Apply Platform Module
================================================================================
Bridges to the LinkedIn Easy Apply bot, dynamically generates config.yaml
from your .env and profile_data.json, and executes the automation.
"""

import os
import sys
import yaml
import logging
import subprocess
from dotenv import load_dotenv

logger = logging.getLogger("LinkedInBot")
load_dotenv()

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
LINKEDIN_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "linkedin"))
CONFIG_PATH = os.path.join(LINKEDIN_DIR, "config.yaml")


def sync_linkedin_config(max_apps: int = 25):
    """Generate or update config.yaml for LinkedIn bot using .env settings."""
    email = os.getenv("LINKEDIN_EMAIL", "").strip() or os.getenv("EMAIL", "").strip()
    password = os.getenv("LINKEDIN_PASSWORD", "").strip()
    phone = os.getenv("PHONE", "+918856087984")
    keywords = [kw.strip() for kw in os.getenv("KEYWORDS", "Full Stack Developer, Software Engineer").split(",") if kw.strip()]
    location = os.getenv("LOCATION", "Pune")

    # Locate actual resume PDF
    resume_pdf = os.getenv("RESUME_PATH")
    if not resume_pdf or not os.path.exists(resume_pdf):
        resumes_dir = os.path.join(BASE_DIR, "data", "resumes")
        if os.path.exists(resumes_dir):
            for f in os.listdir(resumes_dir):
                if f.lower().endswith(".pdf"):
                    resume_pdf = os.path.join(resumes_dir, f)
                    break
    if not resume_pdf or not os.path.exists(resume_pdf):
        fallback_pdf = os.path.join(BASE_DIR, "data", "resumes", "Umesh-Temburwar-OCT.pdf")
        if os.path.exists(fallback_pdf):
            resume_pdf = fallback_pdf
        else:
            for f in os.listdir(BASE_DIR):
                if f.lower().endswith(".pdf"):
                    resume_pdf = os.path.join(BASE_DIR, f)
                    break

    config_data = {
        "username": email,
        "password": password,
        "phone_number": phone,
        "profile_path": "",
        "positions": keywords[:4],
        "locations": [location, "Remote"],
        "salary": 450000,
        "rate": max_apps,
        "uploads": {
            "Resume": resume_pdf
        },
        "output_filename": [
            os.path.join(LINKEDIN_DIR, "out.csv")
        ],
        "experience_level": [1, 2] # Entry level & Associate
    }

    try:
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            yaml.dump(config_data, f, default_flow_style=False)
        logger.info(f"✓ Synchronized LinkedIn config.yaml with {email} and roles {keywords[:4]}")
        return True
    except Exception as e:
        logger.error(f"Failed to write LinkedIn config.yaml: {e}")
        return False


def run_linkedin(max_apps: int = 25):
    """Execute the LinkedIn Easy Apply Bot."""
    logger.info("=" * 50)
    logger.info("Launching LinkedIn Easy Apply Bot...")
    logger.info("=" * 50)

    is_dry_run = os.getenv("DRY_RUN", "").lower() in ("1", "true", "yes")
    email = os.getenv("LINKEDIN_EMAIL", "").strip() or os.getenv("EMAIL", "").strip()
    password = os.getenv("LINKEDIN_PASSWORD", "").strip()

    if not email or not password:
        if is_dry_run:
            logger.info("[DRY RUN] LinkedIn credentials not configured; simulation completed.")
            return 0, 0
        else:
            logger.warning("LINKEDIN_EMAIL or LINKEDIN_PASSWORD not set in .env. Skipping LinkedIn live run.")
            return 0, 0

    if not sync_linkedin_config(max_apps=max_apps):
        return 0, 0

    script_path = os.path.join(LINKEDIN_DIR, "easyapplybot.py")
    if not os.path.exists(script_path):
        logger.error(f"Cannot find {script_path}")
        return 0, 0

    logger.info("Starting LinkedIn automation process...")
    try:
        cmd = [sys.executable, script_path]
        proc = subprocess.run(cmd, cwd=LINKEDIN_DIR)
        logger.info(f"LinkedIn process ended with return code {proc.returncode}")

        # Sync out.csv to tracker DB
        try:
            from platforms.tracker_db import record_application, has_applied
            import csv
            out_csv = os.path.join(LINKEDIN_DIR, "out.csv")
            if os.path.exists(out_csv):
                with open(out_csv, "r", encoding="utf-8") as f:
                    reader = csv.reader(f)
                    for row in reader:
                        # Row schema: [timestamp, jobID, job_title, company, attempted, result]
                        if len(row) >= 4 and row[1]:
                            job_id = row[1].strip()
                            if not job_id:
                                continue
                            url = f"https://www.linkedin.com/jobs/view/{job_id}"
                            title = row[2].strip() if len(row) > 2 and row[2].strip() else "LinkedIn Position"
                            comp = row[3].strip() if len(row) > 3 and row[3].strip() else "LinkedIn Employer"
                            result_val = str(row[5]).strip().lower() if len(row) > 5 else "true"
                            
                            # Only record if application was actually attempted/successful
                            if result_val in ["true", "applied", "success", "1"]:
                                if not has_applied(url=url):
                                    record_application(
                                        platform="LinkedIn",
                                        job_title=title,
                                        company=comp,
                                        location="India / Remote",
                                        salary="Not disclosed",
                                        url=url,
                                        status="Applied"
                                    )
        except Exception as e:
            logger.debug(f"LinkedIn DB sync notice: {e}")

        return 1 if proc.returncode == 0 else 0, 0
    except Exception as e:
        logger.error(f"Error running LinkedIn bot: {e}")
        return 0, 1


if __name__ == "__main__":
    run_linkedin()
