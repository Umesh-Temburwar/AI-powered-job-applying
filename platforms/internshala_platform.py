"""
Internshala Auto-Apply Platform Module
================================================================================
Automates job and internship applications on Internshala.com using Selenium
and your resume profile knowledge base.
"""

import os
import sys
import time
import json
import logging
import csv
from datetime import datetime
from dotenv import load_dotenv
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException

from platforms.browser_manager import create_driver, human_delay, safe_click
from platforms.tracker_db import has_applied, record_application
from platforms.notifier import notify_application_success
from platforms.ai_engine import qa_engine

logger = logging.getLogger("InternshalaBot")
load_dotenv()

RESULTS_CSV = "internshala_applied.csv"


def load_profile():
    if os.path.exists("profile_data.json"):
        with open("profile_data.json", "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def load_answers():
    answers = {}
    if os.path.exists("application_answers.csv"):
        with open("application_answers.csv", "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                q = (row.get('question_text') or '').strip().lower()
                a = (row.get('answer') or '').strip()
                if q and a:
                    answers[q] = a
    return answers


def generate_cover_letter(profile, role_title="Full Stack Developer"):
    name = profile.get("personal", {}).get("name", "Umesh Temburwar")
    skills = ", ".join(profile.get("key_skills", ["React.js", "Node.js", "Express.js", "MongoDB"])[:6])
    summary = profile.get("profile_summary", "")

    return (
        f"Hi Hiring Team,\n\n"
        f"I am writing to express my strong interest in the {role_title} position.\n\n"
        f"{summary}\n\n"
        f"My core technical stack includes: {skills}. In addition, I have hands-on experience building "
        f"scalable full-stack web applications with RESTful APIs, responsive frontends, and secure database integrations.\n\n"
        f"I am available to join immediately and am excited to bring my dedication and problem-solving skills to your team.\n\n"
        f"Thank you for considering my application.\n\n"
        f"Best regards,\n{name}\n"
        f"Phone: {profile.get('personal', {}).get('phone', '')}\n"
        f"Email: {profile.get('personal', {}).get('email', '')}"
    )


def login_internshala(driver, email, password):
    logger.info("Opening Internshala login page...")
    driver.get("https://internshala.com/login/user")
    time.sleep(3)

    try:
        # Check if already logged in
        if "student/dashboard" in driver.current_url:
            logger.info("✓ Already logged in to Internshala.")
            return True

        email_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "email"))
        )
        email_input.clear()
        email_input.send_keys(email)
        time.sleep(1)

        password_input = driver.find_element(By.ID, "password")
        password_input.clear()
        password_input.send_keys(password)
        time.sleep(1)

        submit_btn = driver.find_element(By.ID, "login_submit")
        driver.execute_script("arguments[0].click();", submit_btn)

        logger.info("Submitted login credentials. Waiting for authentication...")
        time.sleep(6)

        # In case of captcha or verification
        if "login" in driver.current_url.lower():
            logger.info("ℹ️ If you see a CAPTCHA or OTP on Internshala, please complete it in the browser...")
            for _ in range(15):
                if "login" not in driver.current_url.lower():
                    break
                time.sleep(2)

        logger.info("✓ Logged into Internshala.")
        return True
    except Exception as e:
        logger.warning(f"Internshala login notice: {e}")
        return False


def build_search_urls(keywords, location=""):
    urls = []
    # Internshala supports categorized slugs
    slug_map = {
        "full stack": "full-stack-development",
        "react": "react-js-development",
        "node": "node-js-development",
        "web": "web-development",
        "python": "python-django",
        "frontend": "front-end-development",
        "backend": "backend-development"
    }

    used_slugs = set()
    for kw in keywords:
        kw_l = kw.lower()
        matched = False
        for k, slug in slug_map.items():
            if k in kw_l and slug not in used_slugs:
                used_slugs.add(slug)
                # Add both jobs and internships
                urls.append(f"https://internshala.com/jobs/{slug}-jobs/")
                urls.append(f"https://internshala.com/internships/{slug}-internship/")
                matched = True
        if not matched:
            clean_kw = kw.replace(" ", "-").lower()
            urls.append(f"https://internshala.com/jobs/keywords-{clean_kw}/")

    return urls[:6]


def apply_on_internshala(driver, max_apps=25):
    email = os.getenv("INTERNSHALA_EMAIL", os.getenv("NAUKRI_EMAIL", ""))
    password = os.getenv("INTERNSHALA_PASSWORD", os.getenv("NAUKRI_PASSWORD", ""))

    if not email or not password:
        logger.error("INTERNSHALA_EMAIL or INTERNSHALA_PASSWORD not set in .env")
        return 0, 0

    profile = load_profile()
    answers = load_answers()
    keywords = [kw.strip() for kw in os.getenv("KEYWORDS", "full stack developer, web developer").split(",") if kw.strip()]
    location = os.getenv("LOCATION", "pune")

    search_urls = build_search_urls(keywords, location)
    logger.info(f"Generated {len(search_urls)} search categories for Internshala.")

    login_internshala(driver, email, password)

    applied_count = 0
    failed_count = 0
    records = []

    for url in search_urls:
        if applied_count >= max_apps:
            break

        logger.info(f"Browsing category: {url}")
        try:
            driver.get(url)
            time.sleep(4)
        except Exception as e:
            logger.warning(f"Failed to open {url}: {e}")
            continue

        # Collect application detail links
        job_links = []
        try:
            elems = driver.find_elements(By.CSS_SELECTOR, "a.job-title-href, a.view_detail_button")
            for el in elems:
                href = el.get_attribute("href")
                if href and href not in job_links:
                    job_links.append(href)
        except Exception:
            pass

        logger.info(f"Found {len(job_links)} listings on page.")

        for link in job_links[:10]:
            if applied_count >= max_apps:
                break

            # Fast CRM Duplicate Prevention
            if has_applied(url=link):
                logger.info(f"Already applied to {link} according to Application CRM Tracker. Skipping.")
                continue

            logger.info(f"Visiting: {link}")
            try:
                driver.get(link)
                time.sleep(3)

                # Extract role & company for tracking
                role_elem = driver.find_elements(By.CSS_SELECTOR, "h1, .heading_4_5, .profile")
                role_text = role_elem[0].text.strip() if role_elem else "Internshala Job"
                comp_elem = driver.find_elements(By.CSS_SELECTOR, ".company_name, .link_display_like_text")
                comp_text = comp_elem[0].text.strip() if comp_elem else "Employer"

                # Find Apply Now button
                apply_selectors = [
                    "//button[contains(@id,'apply_now_button') or contains(text(),'Apply now')]",
                    "//a[contains(text(),'Apply now')]",
                    "//button[contains(text(),'Apply')]"
                ]

                apply_btn = None
                for sel in apply_selectors:
                    btns = driver.find_elements(By.XPATH, sel)
                    if btns and btns[0].is_displayed():
                        apply_btn = btns[0]
                        break

                if not apply_btn:
                    logger.info("Already applied or Apply button not available. Skipping.")
                    continue

                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", apply_btn)
                time.sleep(1)
                driver.execute_script("arguments[0].click();", apply_btn)
                time.sleep(3)

                # Fill Cover Letter or AI Question Answers
                textareas = driver.find_elements(By.CSS_SELECTOR, "textarea")
                for ta in textareas:
                    if ta.is_displayed():
                        try:
                            lbl = ta.find_element(By.XPATH, "./preceding::label[1]").text
                            if "cover letter" in lbl.lower() or not lbl:
                                ans = generate_cover_letter(profile, role_title=role_text)
                            else:
                                ans = qa_engine.answer_question(lbl, role_title=role_text)
                        except Exception:
                            ans = generate_cover_letter(profile, role_title=role_text)
                        ta.clear()
                        ta.send_keys(ans)
                        time.sleep(0.5)

                # Answer any assessment / radio questions
                radios = driver.find_elements(By.CSS_SELECTOR, "input[type='radio']")
                for r in radios:
                    try:
                        val = (r.get_attribute('value') or '').lower()
                        if val in ['yes', 'immediate', 'available']:
                            driver.execute_script("arguments[0].click();", r)
                    except Exception:
                        pass

                # Submit Application
                submit_selectors = [
                    "//input[@id='submit' or @type='submit']",
                    "//button[contains(text(),'Submit') or contains(text(),'Send application')]"
                ]
                submitted = False
                for s in submit_selectors:
                    sub_btn = driver.find_elements(By.XPATH, s)
                    if sub_btn and sub_btn[0].is_displayed():
                        driver.execute_script("arguments[0].click();", sub_btn[0])
                        submitted = True
                        applied_count += 1
                        logger.info(f"✓ Applied on Internshala: '{role_text}' @ {comp_text} ({applied_count}/{max_apps})")
                        
                        # Record in SQLite DB + CSV + Push Notification
                        record_application(platform="Internshala", job_title=role_text, company=comp_text, url=link, status="Applied")
                        notify_application_success(platform="Internshala", job_title=role_text, company=comp_text, url=link)
                        records.append({"platform": "Internshala", "url": link, "status": "Applied", "time": str(datetime.now())})
                        time.sleep(2)
                        break

                if not submitted:
                    failed_count += 1
                    records.append({"platform": "Internshala", "url": link, "status": "Failed", "time": str(datetime.now())})

            except Exception as e:
                logger.warning(f"Could not complete application for {link}: {e}")
                failed_count += 1

    # Save results to CSV
    if records:
        mode = 'a' if os.path.exists(RESULTS_CSV) else 'w'
        with open(RESULTS_CSV, mode, newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=["platform", "url", "status", "time"])
            if mode == 'w':
                writer.writeheader()
            writer.writerows(records)

    logger.info(f"Internshala Completed: {applied_count} Applied, {failed_count} Failed/Skipped.")
    return applied_count, failed_count


def run_internshala(driver=None, max_apps=25):
    should_close = False
    if driver is None:
        driver = create_driver()
        should_close = True

    try:
        return apply_on_internshala(driver, max_apps=max_apps)
    finally:
        if should_close and driver:
            try:
                driver.quit()
            except Exception:
                pass


def run_internshala_profile_updater():
    """Run Internshala Profile & Resume Auto-Updater."""
    import subprocess
    script = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Internshala-UpdateProfile.py"))
    logger.info("Executing Internshala Profile Auto-Updater...")
    proc = subprocess.run([sys.executable, script], cwd=os.path.dirname(script))
    return proc.returncode == 0


if __name__ == "__main__":
    run_internshala()
