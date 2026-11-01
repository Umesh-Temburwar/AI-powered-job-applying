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


def run_naukri_search(max_apps: int = None):
    """Run Naukri keyword search & multi-tab auto apply."""
    script = os.path.join(BASE_DIR, "Naukri-Edge.py")
    logger.info("Executing Naukri Keyword Multi-Tab Apply Bot...")
    sub_env = os.environ.copy()
    if max_apps:
        sub_env["MAX_APPLICATIONS"] = str(max_apps)
    proc = subprocess.run([sys.executable, script], cwd=BASE_DIR, env=sub_env)
    return proc.returncode == 0


def run_naukri_recommended(max_apps: int = None):
    """Run Naukri recommended jobs bot."""
    script = os.path.join(BASE_DIR, "Naukri-Recommended.py")
    logger.info("Executing Naukri Recommended Jobs Bot...")
    sub_env = os.environ.copy()
    if max_apps:
        sub_env["MAX_APPLICATIONS"] = str(max_apps)
    proc = subprocess.run([sys.executable, script], cwd=BASE_DIR, env=sub_env)
    return proc.returncode == 0


def run_naukri_profile_updater():
    """Run Naukri profile auto-updater."""
    script = os.path.join(BASE_DIR, "Naukri-UpdateProfile.py")
    logger.info("Executing Naukri Profile Auto-Updater...")
    proc = subprocess.run([sys.executable, script], cwd=BASE_DIR)
    return proc.returncode == 0
