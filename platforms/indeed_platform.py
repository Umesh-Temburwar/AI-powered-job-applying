"""
Indeed Auto-Apply Platform Module
================================================================================
Automates job applications on Indeed (Indeed India / Global) for jobs with
the "Easily Apply" badge using Selenium.
"""

import os
import sys
import time
import json
import logging
import csv
import urllib.parse
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
from platforms.location_matcher import is_location_match, parse_target_locations

logger = logging.getLogger("IndeedBot")
load_dotenv()

RESULTS_CSV = "indeed_applied.csv"


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


def login_indeed(driver, email, password):
    logger.info("Opening Indeed sign-in page...")
    driver.get("https://secure.indeed.com/account/login")
    time.sleep(3)

    try:
        email_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email'], input[name='__email']"))
        )
        email_input.clear()
        email_input.send_keys(email)
        email_input.send_keys(Keys.ENTER)
        time.sleep(3)

        pwd_input = driver.find_elements(By.CSS_SELECTOR, "input[type='password'], input[name='__password']")
        if pwd_input and pwd_input[0].is_displayed():
            pwd_input[0].send_keys(password)
            pwd_input[0].send_keys(Keys.ENTER)
            time.sleep(5)

        logger.info("✓ Indeed login sequence attempted.")
    except Exception as e:
        logger.info(f"Indeed login note (can continue in guest / session mode): {e}")


def build_search_url(keyword, location="pune"):
    # sc=0kf:attr(5QWDV); is the filter parameter for "Easily Apply" jobs on Indeed
    encoded_q = urllib.parse.quote_plus(keyword)
    encoded_l = urllib.parse.quote_plus(location)
    return f"https://in.indeed.com/jobs?q={encoded_q}&l={encoded_l}&sc=0kf%3Aattr%285QWDV%29%3B"


def handle_indeed_application_modal(driver, profile, answers):
    """Walk through Indeed application steps."""
    for step in range(6):
        time.sleep(2)

        # 1. Answer text inputs (Phone, Experience, City, etc.)
        inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='text'], input[type='tel'], input[type='number']")
        for inp in inputs:
            try:
                if not inp.is_displayed():
                    continue
                val = inp.get_attribute("value")
                if not val:
                    label = inp.get_attribute("aria-label") or inp.get_attribute("name") or ""
                    label_l = label.lower()
                    if "phone" in label_l:
                        inp.send_keys(profile.get("personal", {}).get("phone", "+918856087984"))
                    elif "city" in label_l or "location" in label_l:
                        curr_loc = profile.get("personal", {}).get("current_location") or os.getenv("LOCATION", "Pune")
                        inp.send_keys(curr_loc)
                    elif "experience" in label_l or "years" in label_l:
                        inp.send_keys(str(profile.get("personal", {}).get("total_experience_years", "1")))
                    elif label:
                        ans = answers.get(label_l) or qa_engine.answer_question(label)
                        inp.send_keys(ans if ans else "1")
                    else:
                        inp.send_keys("1")
            except Exception:
                pass

        # 2. Answer radio questions (Yes / No)
        radios = driver.find_elements(By.CSS_SELECTOR, "input[type='radio']")
        for r in radios:
            try:
                val = (r.get_attribute("value") or "").lower()
                if val in ["yes", "true"]:
                    driver.execute_script("arguments[0].click();", r)
            except Exception:
                pass

        # 3. Check for Submit or Continue buttons
        submit_btn = driver.find_elements(By.XPATH, "//button[contains(.,'Submit your application')]")
        if submit_btn and submit_btn[0].is_displayed():
            driver.execute_script("arguments[0].click();", submit_btn[0])
            logger.info("✓ Submitted application on Indeed!")
            time.sleep(3)
            return True

        continue_btn = driver.find_elements(By.XPATH, "//button[contains(.,'Continue') or contains(.,'Review your application') or contains(.,'Next')]")
        if continue_btn and continue_btn[0].is_displayed():
            driver.execute_script("arguments[0].click();", continue_btn[0])
            time.sleep(2)
        else:
            break

    return False


def apply_on_indeed(driver, max_apps=25):
    email = os.getenv("INDEED_EMAIL", "").strip()
    password = os.getenv("INDEED_PASSWORD", "").strip()
    keywords = [kw.strip() for kw in os.getenv("KEYWORDS", "full stack developer, react developer").split(",") if kw.strip()]
    location = os.getenv("LOCATION", "pune")
    target_locations = parse_target_locations(location)

    profile = load_profile()
    answers = load_answers()

    login_indeed(driver, email, password)

    applied_count = 0
    failed_count = 0
    records = []

    search_locs = target_locations if target_locations else [location]

    for search_loc in search_locs[:3]:
        for kw in keywords[:3]:
            if applied_count >= max_apps:
                break

            search_url = build_search_url(kw, search_loc)
            logger.info(f"Searching Indeed: {kw} in {search_loc} -> {search_url}")

            try:
                driver.get(search_url)
                time.sleep(4)
            except Exception as e:
                logger.warning(f"Failed to load Indeed search: {e}")
                continue

            # Find job title links with Indeed Apply
            job_links = []
            try:
                cards = driver.find_elements(By.CSS_SELECTOR, "div.job_seen_beacon, div[data-testid='slider_item']")
                for card in cards:
                    try:
                        # Check card location matches target
                        card_loc = ""
                        loc_elems = card.find_elements(By.CSS_SELECTOR, "div.companyLocation, div[data-testid='text-location'], span[data-testid='job-location']")
                        if loc_elems:
                            card_loc = loc_elems[0].text.strip()
                        if card_loc and not is_location_match(card_loc, target_locations):
                            logger.info(f"📍 [LOCATION FILTER] Skipping Indeed card at '{card_loc}' (Targets: {target_locations})")
                            continue

                        # check if easily apply exists in card text
                        if "easily apply" in card.text.lower() or "apply now" in card.text.lower():
                            link_elem = card.find_element(By.CSS_SELECTOR, "a.jcs-JobTitle, h2.jobTitle a")
                            href = link_elem.get_attribute("href")
                            if href and href not in job_links:
                                job_links.append(href)
                    except Exception:
                        continue
            except Exception:
                pass

            logger.info(f"Found {len(job_links)} 'Easily Apply' jobs on Indeed for '{kw}' in '{search_loc}'.")

            for link in job_links[:8]:
                if applied_count >= max_apps:
                    break

                # Fast CRM Duplicate Prevention
                if has_applied(url=link):
                    logger.info(f"Already applied to {link} according to CRM Tracker. Skipping.")
                    continue

                logger.info(f"Visiting Indeed Job: {link}")
                try:
                    driver.get(link)
                    time.sleep(3)

                    # Detail page location check
                    det_loc_elems = driver.find_elements(By.CSS_SELECTOR, "div[data-testid='inlineHeader-companyLocation'], div[data-testid='job-location'], div.jobsearch-JobInfoHeader-companyLocation, div#jobLocationText")
                    if det_loc_elems:
                        det_loc = det_loc_elems[0].text.strip()
                        if det_loc and not is_location_match(det_loc, target_locations):
                            logger.info(f"📍 [LOCATION FILTER] Skipping Indeed job detail at '{det_loc}' (Targets: {target_locations})")
                            continue

                    # Look for Indeed Apply button
                    apply_selectors = [
                        "button#indeedApplyButton",
                        "//button[contains(@class,'indeed-apply-button') or contains(.,'Easily apply') or contains(.,'Apply now')]",
                        "//div[contains(@id,'indeedApplyButton')]//button"
                    ]

                    apply_btn = None
                    for sel in apply_selectors:
                        if sel.startswith("//"):
                            elems = driver.find_elements(By.XPATH, sel)
                        else:
                            elems = driver.find_elements(By.CSS_SELECTOR, sel)
                        if elems and elems[0].is_displayed():
                            apply_btn = elems[0]
                            break

                    if not apply_btn:
                        logger.info("Direct Indeed Apply button not detected, skipping.")
                        continue

                    driver.execute_script("arguments[0].click();", apply_btn)
                    time.sleep(3)

                    # Modal interaction
                    if handle_indeed_application_modal(driver, profile, answers):
                        applied_count += 1
                        # Extract rich details from Indeed page
                        title_elem = driver.find_elements(By.CSS_SELECTOR, "h1.jobsearch-JobInfoHeader-title, h1[data-testid='jobsearch-JobInfoHeader-title'], h1")
                        actual_title = title_elem[0].text.strip() if title_elem and title_elem[0].text.strip() else kw

                        comp_elem = driver.find_elements(By.CSS_SELECTOR, "div[data-testid='inlineHeader-companyName'], [data-company-name='true'], div.jobsearch-CompanyInfoContainer a")
                        actual_comp = comp_elem[0].text.strip() if comp_elem and comp_elem[0].text.strip() else "Indeed Employer"

                        loc_elem = driver.find_elements(By.CSS_SELECTOR, "div[data-testid='inlineHeader-companyLocation'], div[data-testid='job-location'], div.jobsearch-JobInfoHeader-companyLocation")
                        actual_loc = loc_elem[0].text.strip() if loc_elem and loc_elem[0].text.strip() else (search_loc or "India")

                        sal_elem = driver.find_elements(By.CSS_SELECTOR, "div#salaryInfoAndJobType, [data-testid='attribute_snippets_section'], span.css-2iqe2o, [class*='salary']")
                        actual_sal = sal_elem[0].text.strip() if sal_elem and sal_elem[0].text.strip() else "Competitive / Not disclosed"
                        if "\n" in actual_sal:
                            actual_sal = actual_sal.split("\n")[0].strip()

                        logger.info(f"✓ Successfully applied on Indeed: '{actual_title}' @ {actual_comp} ({applied_count}/{max_apps})")
                        record_application(platform="Indeed", job_title=actual_title, company=actual_comp, location=actual_loc, salary=actual_sal, url=link, status="Applied")
                        notify_application_success(platform="Indeed", job_title=actual_title, company=actual_comp, url=link)
                        records.append({"platform": "Indeed", "url": link, "status": "Applied", "time": str(datetime.now())})
                    else:
                        failed_count += 1
                        records.append({"platform": "Indeed", "url": link, "status": "Failed", "time": str(datetime.now())})
                except Exception as apply_err:
                    logger.warning(f"Error applying on Indeed: {apply_err}")
                    failed_count += 1
                    records.append({"platform": "Indeed", "url": link, "status": "Error", "time": str(datetime.now())})

    if records:
        mode = 'a' if os.path.exists(RESULTS_CSV) else 'w'
        with open(RESULTS_CSV, mode, newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=["platform", "url", "status", "time"])
            if mode == 'w':
                writer.writeheader()
            writer.writerows(records)

    logger.info(f"Indeed Completed: {applied_count} Applied, {failed_count} Failed/Skipped.")
    return applied_count, failed_count


def run_indeed(driver=None, max_apps=25):
    should_close = False
    if driver is None:
        driver = create_driver()
        should_close = True

    try:
        return apply_on_indeed(driver, max_apps=max_apps)
    finally:
        if should_close and driver:
            try:
                driver.quit()
            except Exception:
                pass


if __name__ == "__main__":
    run_indeed()
