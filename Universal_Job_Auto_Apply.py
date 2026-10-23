"""
================================================================================
 UNIVERSAL JOB AUTO APPLY BOT (2026 ALL-IN-ONE PRO EDITION)
================================================================================
Unified Multi-Platform Automation for:
  1. Naukri.com       - Keyword Multi-Tab Auto-Apply & Recommended Jobs
  2. Naukri.com       - Profile Freshness & Key Skills Auto-Updater
  3. Internshala.com  - Jobs & Internships Auto-Apply
  4. Internshala.com  - Resume & Profile Auto-Updater (Projects, Skills, Objective)
  5. Indeed.com       - Easily Apply Automated Job Application
  6. LinkedIn.com     - Easy Apply Automation Engine

Author / Candidate Profile: Umesh Temburwar (Full Stack Developer)
================================================================================
"""

import os
import sys
import time
import argparse
import logging
import csv
from datetime import datetime
from dotenv import load_dotenv

# Safe UTF-8 console output on Windows
if sys.platform == "win32":
    try:
        if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
            sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# Optional rich formatting for premium terminal aesthetic
try:
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    console = Console(force_terminal=True, legacy_windows=False)
    HAS_RICH = True
except Exception:
    console = None
    HAS_RICH = False

from platforms.naukri_platform import (
    run_naukri_search,
    run_naukri_recommended,
    run_naukri_profile_updater
)
from platforms.internshala_platform import run_internshala, run_internshala_profile_updater
from platforms.indeed_platform import run_indeed
from platforms.linkedin_platform import run_linkedin

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("UniversalJobAutoApply")

UNIVERSAL_CSV = "universal_applied_jobs.csv"


def print_banner():
    banner = """
================================================================================
           UNIVERSAL JOB AUTO APPLY BOT - 2026 ALL-IN-ONE EDITION
================================================================================
Supported Platforms:
  [1] Naukri.com      [2] Internshala.com    [3] Indeed.com    [4] LinkedIn.com
================================================================================
"""
    if HAS_RICH:
        console.print(Panel.fit(
            "[bold cyan]🚀 UNIVERSAL JOB AUTO APPLY BOT - 2026 ALL-IN-ONE EDITION[/bold cyan]\n"
            "[green]Naukri.com[/green]  |  [blue]Internshala.com[/blue]  |  [magenta]Indeed.com[/magenta]  |  [yellow]LinkedIn.com[/yellow]\n"
            "[italic white]Profile: Umesh Temburwar | Full Stack Developer[/italic white]",
            border_style="bold blue"
        ))
    else:
        print(banner)


def show_consolidated_report():
    """Aggregate applied jobs across all platforms and display a table."""
    logger.info("Generating consolidated application report...")

    records = []

    # 1. Naukri
    naukri_file = "naukriapplied.csv"
    if os.path.exists(naukri_file):
        try:
            with open(naukri_file, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    passed = row.get("passed", "").strip()
                    failed = row.get("failed", "").strip()
                    if passed:
                        records.append({"platform": "Naukri", "url": passed, "status": "Applied"})
                    if failed:
                        records.append({"platform": "Naukri", "url": failed, "status": "Failed"})
        except Exception:
            pass

    # 2. Internshala
    intern_file = "internshala_applied.csv"
    if os.path.exists(intern_file):
        try:
            with open(intern_file, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    records.append({
                        "platform": "Internshala",
                        "url": row.get("url", ""),
                        "status": row.get("status", "Applied")
                    })
        except Exception:
            pass

    # 3. Indeed
    indeed_file = "indeed_applied.csv"
    if os.path.exists(indeed_file):
        try:
            with open(indeed_file, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    records.append({
                        "platform": "Indeed",
                        "url": row.get("url", ""),
                        "status": row.get("status", "Applied")
                    })
        except Exception:
            pass

    # 4. LinkedIn
    linkedin_file = os.path.join("platforms", "linkedin", "out.csv")
    if not os.path.exists(linkedin_file):
        linkedin_file = os.path.join("LinkedIn-Easy-Apply-Bot-master", "out.csv")
    if os.path.exists(linkedin_file):
        try:
            with open(linkedin_file, "r", encoding="utf-8") as f:
                reader = csv.reader(f)
                for row in reader:
                    if row and len(row) >= 2:
                        job_id = row[1].strip() if len(row) > 1 else ""
                        title = row[2].strip() if len(row) > 2 else "Software Engineer"
                        company = row[3].strip() if len(row) > 3 else "LinkedIn Employer"
                        if job_id.isdigit():
                            url = f"https://www.linkedin.com/jobs/view/{job_id}"
                        elif row[0].startswith("http"):
                            url = row[0].strip()
                        else:
                            url = f"https://www.linkedin.com/jobs/view/{job_id}" if job_id else ""
                        if url:
                            records.append({
                                "platform": "LinkedIn",
                                "url": url,
                                "job_title": title,
                                "company": company,
                                "status": "Applied"
                            })
        except Exception:
            pass

    # Write universal CSV
    if records:
        with open(UNIVERSAL_CSV, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["platform", "url", "status", "timestamp"])
            writer.writeheader()
            for r in records:
                writer.writerow({
                    "platform": r.get("platform", ""),
                    "url": r.get("url", ""),
                    "status": r.get("status", ""),
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                })

    # Summary Counts
    summary = {
        "Naukri": {"applied": 0, "failed": 0},
        "Internshala": {"applied": 0, "failed": 0},
        "Indeed": {"applied": 0, "failed": 0},
        "LinkedIn": {"applied": 0, "failed": 0}
    }

    for r in records:
        plat = r.get("platform")
        st = r.get("status", "").lower()
        if plat in summary:
            if "fail" in st:
                summary[plat]["failed"] += 1
            else:
                summary[plat]["applied"] += 1

    total_applied = sum(v["applied"] for v in summary.values())
    total_failed = sum(v["failed"] for v in summary.values())

    if HAS_RICH:
        table = Table(title="📊 Universal Job Application Summary", border_style="cyan")
        table.add_column("Platform", style="bold white")
        table.add_column("Successfully Applied", style="green", justify="center")
        table.add_column("Failed / Skipped", style="red", justify="center")
        table.add_column("Total Processed", style="yellow", justify="center")

        for plat, stats in summary.items():
            tot = stats["applied"] + stats["failed"]
            table.add_row(plat, str(stats["applied"]), str(stats["failed"]), str(tot))

        table.add_section()
        table.add_row(
            "[bold]ALL PLATFORMS[/bold]",
            f"[bold green]{total_applied}[/bold green]",
            f"[bold red]{total_failed}[/bold red]",
            f"[bold yellow]{total_applied + total_failed}[/bold yellow]"
        )
        console.print(table)
    else:
        print("\n" + "=" * 50)
        print("UNIVERSAL JOB APPLICATION SUMMARY")
        print("=" * 50)
        for plat, stats in summary.items():
            tot = stats["applied"] + stats["failed"]
            print(f"  {plat:12}: Applied: {stats['applied']} | Failed: {stats['failed']} | Total: {tot}")
        print("-" * 50)
        print(f"  TOTAL APPLIED ACROSS ALL PLATFORMS: {total_applied}")
        print("=" * 50 + "\n")

    logger.info(f"Consolidated log saved to: {UNIVERSAL_CSV}")
    db_stats = sync_with_supabase(records)
    if db_stats.get("total_db_apps"):
        logger.info(f"Supabase Database Synchronized: {db_stats['total_db_apps']} verified applications live on cloud")


def run_all_platforms():
    """Sequentially run all 4 platforms."""
    logger.info("=" * 60)
    logger.info("STARTING UNIVERSAL ALL-PLATFORMS AUTO-APPLY SEQUENCE")
    logger.info("=" * 60)

    # 1. Naukri
    logger.info(">>> STEP 1/4: Running Naukri Auto-Apply...")
    try:
        run_naukri_search()
    except Exception as e:
        logger.error(f"Naukri run failed: {e}")

    # 2. Internshala
    logger.info(">>> STEP 2/4: Running Internshala Auto-Apply...")
    try:
        run_internshala(max_apps=25)
    except Exception as e:
        logger.error(f"Internshala run failed: {e}")

    # 3. Indeed
    logger.info(">>> STEP 3/4: Running Indeed Auto-Apply...")
    try:
        run_indeed(max_apps=25)
    except Exception as e:
        logger.error(f"Indeed run failed: {e}")

    # 4. LinkedIn
    logger.info(">>> STEP 4/4: Running LinkedIn Easy Apply...")
    try:
        run_linkedin()
    except Exception as e:
        logger.error(f"LinkedIn run failed: {e}")

    logger.info("=" * 60)
    logger.info("ALL PLATFORMS COMPLETED!")
    logger.info("=" * 60)
    show_consolidated_report()


def run_jobbot_engine():
    """Run the 9-portal engine (Glassdoor, Shine, Foundit, TimesJobs, Wellfound, etc.)."""
    logger.info("=" * 60)
    logger.info("Launching 9-Portal Auto Apply Engine...")
    logger.info("=" * 60)
    import subprocess
    script = os.path.join(os.path.dirname(__file__), "platforms", "jobbot_engine.py")
    subprocess.run([sys.executable, script], cwd=os.path.dirname(__file__))


def sync_with_supabase(records: list = None) -> dict:
    """Sync candidate applied jobs and query live platform connections from Supabase."""
    try:
        backend_dir = os.path.join(os.path.dirname(__file__), "backend")
        if backend_dir not in sys.path:
            sys.path.insert(0, backend_dir)
        from core.supabase import get_supabase_client
        client = get_supabase_client()
        if not client:
            return {}

        candidate_id = os.getenv("CANDIDATE_USER_ID", "0ff8ac23-96d8-419e-9cff-ffd3b3430f17")

        if records:
            for r in records:
                url = (r.get("url") or "").strip()
                if not url:
                    continue
                plat = r.get("platform", "Naukri")
                title = r.get("job_title") or f"{plat} Matched Opportunity"
                comp = r.get("company") or f"{plat} Employer Partner"
                st = "applied" if "fail" not in (r.get("status") or "").lower() else "failed"

                existing = client.table("applications").select("id").eq("user_id", candidate_id).eq("job_url", url).execute()
                if not existing.data:
                    client.table("applications").insert({
                        "user_id": candidate_id,
                        "platform": plat,
                        "job_title": title,
                        "company": comp,
                        "job_url": url,
                        "status": st,
                        "notes": f"Applied via Universal CLI Engine ({plat})",
                    }).execute()

        db_apps = client.table("applications").select("platform, status").eq("user_id", candidate_id).execute()
        return {"total_db_apps": len(db_apps.data) if db_apps.data else 0}
    except Exception as exc:
        logger.debug(f"Supabase sync note: {exc}")
        return {}


def launch_dashboard(port: int = 5173):
    """Launch the modern Web UI dashboard & FastAPI backend."""
    logger.info("=" * 60)
    logger.info("🚀 Launching Universal Bot Modern Full-Stack Web Dashboard...")
    logger.info("   Backend:  http://127.0.0.1:8001 (FastAPI + Automation Runner)")
    logger.info("   Frontend: http://localhost:5173 (React Vite Dashboard)")
    logger.info("   Database: Supabase Cloud (Live Tasks & Platform Connections)")
    logger.info("=" * 60)
    import subprocess
    script = os.path.join(os.path.dirname(__file__), "start_app.py")
    subprocess.run([sys.executable, script], cwd=os.path.dirname(__file__))


def interactive_menu():
    """Display interactive CLI menu."""
    while True:
        print_banner()
        print("Select an option:")
        print("  [1] 🚀 Run Core Platforms (Naukri + Internshala + Indeed + LinkedIn)")
        print("  [2] 🔵 Naukri Auto-Apply (Keyword Search & Multi-Tab)")
        print("  [3] 🟣 Naukri Recommended Jobs Auto-Apply")
        print("  [4] ⚡ Naukri Profile Auto-Updater (Headline, Summary, Skills, Freshness Refresh)")
        print("  [5] 🌟 Internshala Resume & Profile Auto-Updater (Projects, Skills, Objective)")
        print("  [6] 🔷 Internshala Auto-Apply (Jobs & Internships)")
        print("  [7] 🔶 Indeed Auto-Apply (Easily Apply Jobs)")
        print("  [8] 💼 LinkedIn Easy Apply")
        print("  [9] 🌐 9-Portal Multi-Apply (Glassdoor, Shine, Foundit, TimesJobs, Wellfound)")
        print("  [10] 📊 View Consolidated Applied Jobs Report")
        print("  [11] 🖥️ Launch Modern Full-Stack Web App (http://localhost:5173)")
        print("  [0] ❌ Exit")
        print("-" * 50)

        try:
            choice = input("Enter choice [0-11]: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nExiting.")
            break

        if choice == "1":
            run_all_platforms()
        elif choice == "2":
            run_naukri_search()
        elif choice == "3":
            run_naukri_recommended()
        elif choice == "4":
            run_naukri_profile_updater()
        elif choice == "5":
            run_internshala_profile_updater()
        elif choice == "6":
            run_internshala()
        elif choice == "7":
            run_indeed()
        elif choice == "8":
            run_linkedin()
        elif choice == "9":
            run_jobbot_engine()
        elif choice == "10":
            show_consolidated_report()
        elif choice == "11":
            launch_dashboard()
        elif choice == "0":
            print("Best of luck with your job hunt!")
            break
        else:
            print("Invalid selection. Please choose a number between 0 and 11.\n")
            time.sleep(1)

        input("\nPress Enter to return to main menu...")


def main():
    parser = argparse.ArgumentParser(description="Universal Job Auto Apply Bot - All-in-One Edition")
    parser.add_argument(
        "--platform",
        choices=["all", "naukri", "internshala", "indeed", "linkedin", "portals"],
        help="Select specific platform to execute"
    )
    parser.add_argument("--update-naukri-profile", action="store_true", help="Run Naukri Profile Auto-Updater")
    parser.add_argument("--update-internshala-profile", action="store_true", help="Run Internshala Resume Auto-Updater")
    parser.add_argument("--update-all-profiles", action="store_true", help="Run both Naukri & Internshala Profile Updaters")
    parser.add_argument("--report", action="store_true", help="Display consolidated application report")
    parser.add_argument("--gui", "--dashboard", "--web", action="store_true", dest="dashboard", help="Launch Modern Web UI Dashboard")

    args = parser.parse_args()

    if args.dashboard:
        launch_dashboard()
        return

    if args.report:
        show_consolidated_report()
        return

    if args.update_all_profiles:
        run_naukri_profile_updater()
        run_internshala_profile_updater()
        return

    if args.update_naukri_profile:
        run_naukri_profile_updater()
        return

    if args.update_internshala_profile:
        run_internshala_profile_updater()
        return

    if args.platform == "all":
        run_all_platforms()
    elif args.platform == "naukri":
        run_naukri_search()
    elif args.platform == "internshala":
        run_internshala()
    elif args.platform == "indeed":
        run_indeed()
    elif args.platform == "linkedin":
        run_linkedin()
    elif args.platform == "portals":
        run_jobbot_engine()
    else:
        # Default to interactive menu if no arguments provided
        interactive_menu()


if __name__ == "__main__":
    main()
