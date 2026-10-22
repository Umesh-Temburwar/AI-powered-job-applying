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


def sync_linkedin_config():
    """Generate or update config.yaml for LinkedIn bot using .env settings."""
    email = os.getenv("LINKEDIN_EMAIL", os.getenv("NAUKRI_EMAIL", ""))
    password = os.getenv("LINKEDIN_PASSWORD", os.getenv("NAUKRI_PASSWORD", ""))
    phone = os.getenv("PHONE", "+918856087984")
    keywords = [kw.strip() for kw in os.getenv("KEYWORDS", "Full Stack Developer, Software Engineer").split(",") if kw.strip()]
    location = os.getenv("LOCATION", "Pune")

    # Locate actual resume PDF
    resume_pdf = os.path.join(BASE_DIR, "Umesh-Temburwar-OCT.pdf")
    if not os.path.exists(resume_pdf):
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
        "rate": 25,
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


def run_linkedin():
    """Execute the LinkedIn Easy Apply Bot."""
    logger.info("=" * 50)
    logger.info("Launching LinkedIn Easy Apply Bot...")
    logger.info("=" * 50)

    if not sync_linkedin_config():
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
        return 1 if proc.returncode == 0 else 0, 0
    except Exception as e:
        logger.error(f"Error running LinkedIn bot: {e}")
        return 0, 1


if __name__ == "__main__":
    run_linkedin()
