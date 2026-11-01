"""
Data Path Resolver Utility
================================================================================
Centralizes access to all local data files (databases, CSV logs, profiles, resumes).
Keeps project root clean by placing all sensitive data files inside the data/ directory.
"""

import os
from pathlib import Path

# Project root directory
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"


def get_data_path(filename: str, subfolder: str = "") -> str:
    """
    Resolves data file path.
    1. Looks in data/<subfolder>/<filename> if specified.
    2. Looks in data/<filename>.
    3. Falls back to project root / <filename> if legacy file exists.
    4. Defaults to data/<filename> (ensures directory exists).
    """
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if subfolder:
        sub_dir = DATA_DIR / subfolder
        sub_dir.mkdir(parents=True, exist_ok=True)
        sub_path = sub_dir / filename
        if sub_path.exists():
            return str(sub_path)

    # Check direct in data/
    data_path = DATA_DIR / filename
    if data_path.exists():
        return str(data_path)

    # Check project root fallback
    root_path = PROJECT_ROOT / filename
    if root_path.exists():
        return str(root_path)

    # Default to data_path
    if subfolder:
        return str((DATA_DIR / subfolder) / filename)
    return str(data_path)


# Pre-resolved canonical data paths
DB_PATH = get_data_path("jobs_tracker.db")
UNIVERSAL_CSV_PATH = get_data_path("universal_applied_jobs.csv")
PROFILE_JSON_PATH = get_data_path("profile_data.json")
ANSWERS_CSV_PATH = get_data_path("application_answers.csv")
RESUME_INI_PATH = get_data_path("resume.ini")
INTERNSHALA_CSV_PATH = get_data_path("internshala_applied.csv")
NAUKRI_CSV_PATH = get_data_path("naukriapplied.csv")

