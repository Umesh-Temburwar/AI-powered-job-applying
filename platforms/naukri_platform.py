"""
Naukri Platform Module
================================================================================
Bridges to the Naukri bots:
  - Keyword Search & Parallel Multi-Tab Apply
  - Recommended Jobs Auto-Apply
  - Profile Auto-Updater (Headline, Summary, Skills, Recruiter Refresh)
"""

import os
import sys
import logging
import subprocess

logger = logging.getLogger("NaukriPlatform")
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def run_naukri_search():
    """Run Naukri keyword search & multi-tab auto apply."""
    script = os.path.join(BASE_DIR, "Naukri-Edge.py")
    logger.info("Executing Naukri Keyword Multi-Tab Apply Bot...")
    proc = subprocess.run([sys.executable, script], cwd=BASE_DIR)
    return proc.returncode == 0


def run_naukri_recommended():
    """Run Naukri recommended jobs bot."""
    script = os.path.join(BASE_DIR, "Naukri-Recommended.py")
    logger.info("Executing Naukri Recommended Jobs Bot...")
    proc = subprocess.run([sys.executable, script], cwd=BASE_DIR)
    return proc.returncode == 0


def run_naukri_profile_updater():
    """Run Naukri profile auto-updater."""
    script = os.path.join(BASE_DIR, "Naukri-UpdateProfile.py")
    logger.info("Executing Naukri Profile Auto-Updater...")
    proc = subprocess.run([sys.executable, script], cwd=BASE_DIR)
    return proc.returncode == 0
