"""
Universal Job Application Tracker Database (SQLite + CSV Auto-Sync)
================================================================================
Provides enterprise-grade persistent tracking of all job applications across:
Naukri, Internshala, Indeed, LinkedIn, Glassdoor, Shine, Foundit, and more.
"""

import os
import sqlite3
import csv
import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple

logger = logging.getLogger("TrackerDB")
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DB_PATH = os.path.join(BASE_DIR, "jobs_tracker.db")
UNIVERSAL_CSV = os.path.join(BASE_DIR, "universal_applied_jobs.csv")

_supabase_client = None
_default_user_id = None


def get_supabase_client():
    """Get or initialize cached Supabase client from environment variables."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    # Check env vars
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

    # If missing, try loading from .env
    if not url or not key:
        env_path = os.path.join(BASE_DIR, ".env")
        if os.path.exists(env_path):
            try:
                from dotenv import load_dotenv
                load_dotenv(env_path)
                url = os.getenv("SUPABASE_URL")
                key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
            except Exception:
                pass

    if not url or not key:
        return None

    try:
        from supabase import create_client
        _supabase_client = create_client(url, key)
        return _supabase_client
    except Exception as e:
        logger.debug(f"Supabase init notice: {e}")
        return None


def get_default_user_id() -> Optional[str]:
    """Retrieve the primary user ID from Supabase auth.users or profiles."""
    global _default_user_id
    if _default_user_id:
        return _default_user_id

    candidate_env = os.getenv("CANDIDATE_USER_ID")
    if candidate_env:
        _default_user_id = candidate_env.strip()
        return _default_user_id

    client = get_supabase_client()
    if not client:
        return None

    try:
        res = client.table("profiles").select("id").limit(1).execute()
        if res.data and len(res.data) > 0:
            _default_user_id = str(res.data[0]["id"])
            return _default_user_id
    except Exception:
        pass
    return None


def get_connection() -> sqlite3.Connection:
    """Create or connect to SQLite database with WAL mode for concurrency."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


def init_db():
    """Initialize database tables and indexes."""
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                platform TEXT NOT NULL,
                job_id TEXT,
                job_title TEXT NOT NULL,
                company TEXT,
                location TEXT,
                url TEXT,
                status TEXT DEFAULT 'Applied',
                applied_date TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_platform ON applications(platform);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_url ON applications(url);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_job_id ON applications(job_id);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_company_title ON applications(company, job_title);")
        conn.commit()
    import_existing_csvs()


def import_existing_csvs():
    """Migrate historical data from CSV files into SQLite database."""
    # 1. Check universal_applied_jobs.csv
    if os.path.exists(UNIVERSAL_CSV):
        try:
            with open(UNIVERSAL_CSV, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                with get_connection() as conn:
                    for row in reader:
                        url = (row.get("url") or "").strip()
                        platform = (row.get("platform") or "General").strip()
                        status = (row.get("status") or "Applied").strip()
                        ts = (row.get("timestamp") or datetime.now().strftime("%Y-%m-%d %H:%M:%S")).strip()
                        if url:
                            existing = conn.execute("SELECT id FROM applications WHERE url = ?", (url,)).fetchone()
                            if not existing:
                                conn.execute("""
                                    INSERT INTO applications (platform, job_title, url, status, applied_date)
                                    VALUES (?, ?, ?, ?, ?)
                                """, (platform, "Job Application", url, status, ts))
                    conn.commit()
        except Exception as e:
            logger.debug(f"CSV import notice: {e}")

    # 2. Check naukriapplied.csv
    naukri_csv = os.path.join(BASE_DIR, "naukriapplied.csv")
    if os.path.exists(naukri_csv):
        try:
            with open(naukri_csv, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                with get_connection() as conn:
                    for row in reader:
                        url = (row.get("passed") or "").strip()
                        if url:
                            existing = conn.execute("SELECT id FROM applications WHERE url = ?", (url,)).fetchone()
                            if not existing:
                                conn.execute("""
                                    INSERT INTO applications (platform, job_title, url, status, applied_date)
                                    VALUES ('Naukri', 'Naukri Applied Job', ?, 'Applied', ?)
                                """, (url, datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
                    conn.commit()
        except Exception:
            pass


def has_applied(url: str = "", job_id: str = "", company: str = "", title: str = "") -> bool:
    """Check if job has already been applied across SQLite, CSV, and Supabase."""
    if not (url or job_id or (company and title)):
        return False

    with get_connection() as conn:
        if url:
            row = conn.execute("SELECT id FROM applications WHERE url = ?", (url.strip(),)).fetchone()
            if row:
                return True
        if job_id:
            row = conn.execute("SELECT id FROM applications WHERE job_id = ?", (str(job_id).strip(),)).fetchone()
            if row:
                return True
        if company and title:
            row = conn.execute(
                "SELECT id FROM applications WHERE LOWER(company) = LOWER(?) AND LOWER(job_title) = LOWER(?)",
                (company.strip(), title.strip())
            ).fetchone()
            if row:
                return True

    # Check Supabase as fallback
    try:
        client = get_supabase_client()
        user_id = get_default_user_id()
        if client and user_id and url:
            res = (
                client.table("applications")
                .select("id")
                .eq("user_id", user_id)
                .eq("job_url", url.strip())
                .limit(1)
                .execute()
            )
            if res.data and len(res.data) > 0:
                return True
    except Exception:
        pass

    return False


def record_application(
    platform: str,
    job_title: str,
    company: str = "",
    location: str = "",
    url: str = "",
    job_id: str = "",
    status: str = "Applied",
    notes: str = ""
) -> int:
    """Record a newly applied job into SQLite, auto-sync to universal_applied_jobs.csv, and persist to Supabase."""
    applied_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # 1. Insert into SQLite
    with get_connection() as conn:
        cursor = conn.execute("""
            INSERT INTO applications (platform, job_id, job_title, company, location, url, status, applied_date, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (platform, job_id, job_title, company, location, url, status, applied_date, notes))
        conn.commit()
        record_id = cursor.lastrowid

    # 2. Append to universal_applied_jobs.csv
    try:
        file_exists = os.path.exists(UNIVERSAL_CSV) and os.stat(UNIVERSAL_CSV).st_size > 0
        with open(UNIVERSAL_CSV, "a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["platform", "url", "status", "timestamp"])
            if not file_exists:
                writer.writeheader()
            writer.writerow({
                "platform": platform,
                "url": url or f"{job_title} @ {company}",
                "status": status,
                "timestamp": applied_date
            })
    except Exception as e:
        logger.debug(f"Sync to universal CSV notice: {e}")

    # 3. Real-time persistent sync to Supabase public.applications
    try:
        client = get_supabase_client()
        user_id = get_default_user_id()
        if client and user_id:
            valid_url = url or f"https://{platform.lower()}.com/job/{record_id}"
            iso_applied_at = datetime.now(timezone.utc).isoformat()
            status_val = status.lower() if status else "applied"
            if status_val not in ('applied', 'review_needed', 'interview', 'rejected', 'saved', 'failed', 'under_review'):
                status_val = 'applied'

            supabase_row = {
                "user_id": user_id,
                "job_title": job_title,
                "company": company or "N/A",
                "job_url": valid_url,
                "platform": platform,
                "status": status_val,
                "location": location or None,
                "notes": notes or None,
                "applied_at": iso_applied_at,
            }
            client.table("applications").upsert(
                supabase_row,
                on_conflict="user_id,job_url"
            ).execute()
            logger.info(f"☁️ Synced Application to Supabase: [{platform}] {job_title}")
    except Exception as e:
        logger.debug(f"Sync to Supabase notice: {e}")

    logger.info(f"💾 Recorded Application: [{platform}] {job_title} @ {company or 'N/A'}")
    return record_id


def get_statistics() -> Dict:
    """Retrieve detailed platform and date-based analytics."""
    with get_connection() as conn:
        total = conn.execute("SELECT COUNT(*) FROM applications;").fetchone()[0]
        today_date = datetime.now().strftime("%Y-%m-%d")
        today_count = conn.execute("SELECT COUNT(*) FROM applications WHERE applied_date LIKE ?;", (f"{today_date}%",)).fetchone()[0]

        # Platform breakdown
        rows = conn.execute("""
            SELECT platform,
                   COUNT(*) as total_apps,
                   SUM(CASE WHEN status = 'Applied' THEN 1 ELSE 0 END) as successful,
                   SUM(CASE WHEN status != 'Applied' THEN 1 ELSE 0 END) as failed
            FROM applications
            GROUP BY platform
        """).fetchall()

        platforms_data = {}
        for r in rows:
            platforms_data[r["platform"]] = {
                "total": r["total_apps"],
                "applied": r["successful"],
                "failed": r["failed"]
            }

        # Recent 7 days trend
        trend_rows = conn.execute("""
            SELECT SUBSTR(applied_date, 1, 10) as day, COUNT(*) as count
            FROM applications
            GROUP BY day
            ORDER BY day DESC
            LIMIT 7
        """).fetchall()

        trend = [{"date": r["day"], "count": r["count"]} for r in reversed(trend_rows)]

        return {
            "total_applications": total,
            "today_applications": today_count,
            "platforms": platforms_data,
            "trend": trend
        }


def get_recent_applications(limit: int = 50) -> List[Dict]:
    """Return latest applications for UI display."""
    with get_connection() as conn:
        rows = conn.execute("""
            SELECT id, platform, job_title, company, location, url, status, applied_date
            FROM applications
            ORDER BY id DESC
            LIMIT ?
        """, (limit,)).fetchall()
        return [dict(r) for r in rows]


# Auto-init on module load
try:
    init_db()
except Exception:
    pass
