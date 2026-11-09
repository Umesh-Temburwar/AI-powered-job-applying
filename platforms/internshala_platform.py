"""
Internshala Auto-Apply Platform Module
================================================================================
Automates job and internship applications on Internshala.com using Selenium
and your resume profile knowledge base.
"""

import os
import re
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
from platforms.location_matcher import is_location_match, parse_target_locations, get_location_search_slugs
from platforms.universal_form_filler import UniversalFormFiller, human_type, safe_click_control

logger = logging.getLogger("InternshalaBot")
load_dotenv()

RESULTS_CSV = "internshala_applied.csv"


def is_unpaid_internship(stipend: str = "", title: str = "", company: str = "", extra: str = "") -> bool:
    """
    Detect whether an Internshala vacancy is unpaid, zero-stipend, or pure volunteer work.
    Returns True if unpaid (must be skipped), False if paid or legitimate compensation.
    """
    blob = f"{stipend} {title} {company} {extra}".lower().strip()
    if not blob:
        return False

    # 1. Explicit unpaid keywords & volunteering phrases
    unpaid_phrases = [
        "unpaid",
        "un-paid",
        "non-paid",
        "no stipend",
        "without stipend",
        "zero stipend",
        "nil stipend",
        "free internship",
        "volunteer",
        "volunteering",
        "pro bono",
        "certificate only",
        "expenses only",
        "expenses covered only",
    ]
    for phrase in unpaid_phrases:
        if phrase in blob:
            return True

    # 2. Check for zero amount / zero stipend representations
    stipend_lower = stipend.lower().strip()
    if stipend_lower:
        # Crucial: 0 must not be part of a larger number like 10,000 or 2,000
        if re.search(r"(?<![0-9])0\s*(?:/|\bper\b)\s*month", stipend_lower):
            return True
        if re.search(r"^(?:₹|rs\.?|inr)?\s*0\s*$", stipend_lower):
            return True
        if re.search(r"(?<![0-9])0\s*-\s*0(?![0-9])", stipend_lower):
            return True
        if re.search(r"(?:₹|rs\.?|inr)\s*0(?![0-9])", stipend_lower):
            return True

    return False


def load_profile():
    paths = [
        os.path.join(os.path.dirname(__file__), "..", "data", "profile_data.json"),
        os.path.join("data", "profile_data.json"),
        "profile_data.json",
    ]
    for p in paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
    return {}


def load_answers():
    answers = {}
    paths = [
        os.path.join(os.path.dirname(__file__), "..", "data", "application_answers.csv"),
        os.path.join("data", "application_answers.csv"),
        "application_answers.csv",
    ]
    for p in paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        q = (row.get('question_text') or '').strip().lower()
                        a = (row.get('answer') or '').strip()
                        if q and a:
                            answers[q] = a
                break
            except Exception:
                pass
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
    target_locations = parse_target_locations(location)
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

    loc_slugs = get_location_search_slugs(target_locations) or [""]
    used_slugs = set()
    for kw in keywords:
        kw_l = kw.lower()
        matched = False
        for k, slug in slug_map.items():
            if k in kw_l and slug not in used_slugs:
                used_slugs.add(slug)
                matched = True
                for l_slug in loc_slugs[:2]:
                    if l_slug == "work-from-home":
                        urls.append(f"https://internshala.com/jobs/work-from-home-{slug}-jobs/")
                        urls.append(f"https://internshala.com/internships/work-from-home-{slug}-internship/")
                    elif l_slug:
                        urls.append(f"https://internshala.com/jobs/{slug}-jobs-in-{l_slug}/")
                        urls.append(f"https://internshala.com/internships/{slug}-internship-in-{l_slug}/")
                    else:
                        urls.append(f"https://internshala.com/jobs/{slug}-jobs/")
                        urls.append(f"https://internshala.com/internships/{slug}-internship/")
        if not matched:
            clean_kw = kw.replace(" ", "-").lower()
            for l_slug in loc_slugs[:2]:
                if l_slug == "work-from-home":
                    urls.append(f"https://internshala.com/jobs/work-from-home-keywords-{clean_kw}/")
                elif l_slug:
                    urls.append(f"https://internshala.com/jobs/keywords-{clean_kw}/?location={l_slug}")
                else:
                    urls.append(f"https://internshala.com/jobs/keywords-{clean_kw}/")

    return urls[:8]


def apply_on_internshala(driver, max_apps=25):
    email = os.getenv("INTERNSHALA_EMAIL", "").strip()
    password = os.getenv("INTERNSHALA_PASSWORD", "").strip()
    dry_run = os.getenv("DRY_RUN", "").lower() in ("1", "true", "yes")

    if not email or not password:
        if not dry_run:
            logger.error("INTERNSHALA_EMAIL or INTERNSHALA_PASSWORD not set in .env")
            return 0, 0
        else:
            logger.info("[DRY RUN] Internshala credentials not configured; running in safe exploration mode.")

    profile = load_profile()
    answers = load_answers()
    keywords = [kw.strip() for kw in os.getenv("KEYWORDS", "full stack developer, web developer").split(",") if kw.strip()]
    location = os.getenv("LOCATION", "pune")
    target_locations = parse_target_locations(location)
    logger.info(f"📍 Internshala Geolocation Targeting Active: {target_locations}")

    search_urls = build_search_urls(keywords, location)
    logger.info(f"Generated {len(search_urls)} search categories for Internshala.")

    if email and password:
        login_internshala(driver, email, password)
    else:
        logger.info("[INFO] Proceeding to Internshala job search without login.")

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

        # Collect application detail links (filtering unpaid roles early)
        job_links = []
        try:
            cards = driver.find_elements(By.CSS_SELECTOR, ".individual_internship, .container-fluid.individual_internship, .job-internship-card")
            if cards:
                for card in cards:
                    try:
                        link_elems = card.find_elements(By.CSS_SELECTOR, "a.job-title-href, a.view_detail_button")
                        if not link_elems:
                            continue
                        href = link_elems[0].get_attribute("href")
                        if not href:
                            continue

                        title_el = card.find_elements(By.CSS_SELECTOR, "a.job-title-href, .profile, .heading_4_5, .job-title")
                        title_text = title_el[0].text.strip() if title_el else ""
                        comp_el = card.find_elements(By.CSS_SELECTOR, ".company_name, .link_display_like_text, p.company-name")
                        comp_text = comp_el[0].text.strip() if comp_el else ""
                        stip_el = card.find_elements(By.CSS_SELECTOR, ".stipend, .salary, [class*='stipend'], [class*='salary']")
                        stip_text = stip_el[0].text.strip() if stip_el else ""

                        if is_unpaid_internship(stip_text, title_text, comp_text, card.text):
                            logger.info(f"🚫 [SEARCH FILTER] Skipping unpaid Internshala vacancy: '{title_text}' @ '{comp_text}' (Stipend: '{stip_text}')")
                            continue

                        card_loc_el = card.find_elements(By.CSS_SELECTOR, ".location_link, .location, [class*='location']")
                        card_loc = card_loc_el[0].text.strip() if card_loc_el else ""
                        if card_loc and not is_location_match(card_loc, target_locations):
                            logger.info(f"📍 [LOCATION FILTER] Skipping Internshala card '{title_text}' @ '{comp_text}' (Location: '{card_loc}') - Out of target scope: {target_locations}")
                            continue

                        if href not in job_links:
                            job_links.append(href)
                    except Exception:
                        pass

            if not job_links:
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

                # Extract role, company, location, salary for tracking
                role_elem = driver.find_elements(By.CSS_SELECTOR, "h1, .heading_4_5, .profile, .job-title-href")
                role_text = role_elem[0].text.strip() if role_elem else "Internshala Job"
                comp_elem = driver.find_elements(By.CSS_SELECTOR, ".company_name, .link_display_like_text, p.company-name")
                comp_text = comp_elem[0].text.strip() if comp_elem else "Employer"
                loc_elem = driver.find_elements(By.CSS_SELECTOR, ".location_link, #location_names, .location, [class*='location']")
                loc_text = loc_elem[0].text.strip() if loc_elem else "India / Remote"
                sal_elem = driver.find_elements(By.CSS_SELECTOR, ".stipend, .salary, [class*='salary'], [class*='stipend']")
                sal_text = sal_elem[0].text.strip() if sal_elem else "Competitive"

                # Double check unpaid status on detail page
                if is_unpaid_internship(sal_text, role_text, comp_text):
                    logger.info(f"🚫 [DETAIL FILTER] Position '{role_text}' @ {comp_text} is unpaid (Stipend: '{sal_text}'). Excluded by candidate policy.")
                    continue

                # Strictly check location match on detail page
                if not is_location_match(loc_text, target_locations):
                    logger.info(f"📍 [LOCATION FILTER] Position '{role_text}' @ {comp_text} location '{loc_text}' does not match target locations {target_locations}. Skipping.")
                    continue

                # Safe Dry-Run Simulation
                if dry_run:
                    logger.info(f"[DRY RUN] Position verified on Internshala: '{role_text}' @ {comp_text} ({applied_count + 1}/{max_apps})")
                    applied_count += 1
                    record_application(platform="Internshala", job_title=role_text, company=comp_text, location=loc_text, salary=sal_text, url=link, status="DRY_RUN_OK")
                    records.append({"platform": "Internshala", "url": link, "status": "Simulated", "time": str(datetime.now())})
                    time.sleep(1.5)
                    continue

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

                # Use UniversalFormFiller to intelligently complete assessment form
                try:
                    filler = UniversalFormFiller(profile)
                    filler.fill_form_step(driver)
                except Exception as exc:
                    logger.debug("UniversalFormFiller notice on Internshala: %s", exc)

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

                # Answer any assessment / radio questions (smart check rejecting unpaid confirmations)
                radios = driver.find_elements(By.CSS_SELECTOR, "input[type='radio']")
                for r in radios:
                    try:
                        val = (r.get_attribute('value') or '').lower()
                        context_text = ""
                        try:
                            parent_group = r.find_element(By.XPATH, "./ancestor::div[contains(@class,'form-group') or contains(@class,'question')][1]")
                            context_text = parent_group.text.lower()
                        except Exception:
                            pass

                        if any(term in context_text for term in ["unpaid", "without stipend", "no stipend", "zero stipend"]):
                            if val in ['no', 'false', '0']:
                                driver.execute_script("arguments[0].click();", r)
                        elif val in ['yes', 'immediate', 'available']:
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
                        record_application(platform="Internshala", job_title=role_text, company=comp_text, location=loc_text, salary=sal_text, url=link, status="Applied")
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
