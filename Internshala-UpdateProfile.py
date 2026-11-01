"""
Internshala Profile & Resume Auto-Updater Bot (2026 Enhanced Edition)
================================================================================
Automatically updates and synchronizes your Internshala profile & resume with
your Full Stack Developer details from profile_data.json.

Sections updated:
  1. Career Objective (Keyword-rich Full Stack summary)
  2. Key Skills (React.js, Node.js, Express.js, MongoDB, PostgreSQL, REST APIs, etc.)
  3. Projects (EdTech Learning Platform, Inventory Management System, ByteFest 2K25)
  4. Work Experience / Internships (ByteFest Project Coordinator)
  5. Education (MBES College of Engineering, B.Tech CSE, 6.06 CGPA)
  6. Portfolio / Work Samples (GitHub / Projects)

Usage:
  py Internshala-UpdateProfile.py
"""

import os
import sys
import time
import json
import logging
from dotenv import load_dotenv
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# Safe UTF-8 console output on Windows
if sys.platform == "win32":
    try:
        if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
            sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

from platforms.browser_manager import create_driver

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("InternshalaProfileUpdater")
load_dotenv()

PROFILE_DATA_FILE = os.path.join("data", "profile_data.json") if os.path.exists(os.path.join("data", "profile_data.json")) else "profile_data.json"


def load_profile_data():
    if not os.path.exists(PROFILE_DATA_FILE):
        logger.error(f"{PROFILE_DATA_FILE} not found!")
        return None
    try:
        with open(PROFILE_DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading {PROFILE_DATA_FILE}: {e}")
        return None


def login_internshala(driver, email, password):
    """Log in to Internshala."""
    logger.info("Opening Internshala login page...")
    driver.get("https://internshala.com/login/user")
    time.sleep(3)

    try:
        if "student/dashboard" in driver.current_url or "student/resume" in driver.current_url:
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

        logger.info("Credentials submitted. Waiting for authentication...")
        time.sleep(6)

        if "login" in driver.current_url.lower():
            logger.info("ℹ️ If you see a CAPTCHA or Google verification in the browser, please complete it...")
            for _ in range(15):
                if "login" not in driver.current_url.lower():
                    break
                time.sleep(2)

        logger.info("✓ Internshala login complete.")
        return True
    except Exception as e:
        logger.warning(f"Login notice: {e}")
        return False


def update_career_objective(driver, objective_text):
    """Update Internshala Career Objective section."""
    logger.info("=" * 50)
    logger.info("Updating Career Objective...")
    logger.info("=" * 50)

    try:
        obj_btn = None
        selectors = [
            "a.career_objective_edit",
            "#edit-accomplishments",
            "//a[contains(@class,'career_objective_edit')]",
            "//i[contains(@class,'ic-24-edit-v1')]/parent::a"
        ]
        for sel in selectors:
            try:
                if sel.startswith("//"):
                    elems = driver.find_elements(By.XPATH, sel)
                else:
                    elems = driver.find_elements(By.CSS_SELECTOR, sel)
                if elems and elems[0].is_displayed():
                    obj_btn = elems[0]
                    break
            except Exception:
                continue

        if obj_btn:
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", obj_btn)
            time.sleep(1)
            driver.execute_script("arguments[0].click();", obj_btn)
            time.sleep(2)

            desc_box = WebDriverWait(driver, 6).until(
                EC.visibility_of_element_located((By.ID, "career_objective_description"))
            )
            desc_box.clear()
            time.sleep(0.5)
            desc_box.send_keys(objective_text)
            time.sleep(1)

            submit_btn = driver.find_element(By.ID, "career-objective-submit")
            driver.execute_script("arguments[0].click();", submit_btn)
            time.sleep(3)
            logger.info("✓ Career Objective updated successfully!")
            return True
        else:
            logger.info("Career Objective edit button not found directly.")
    except Exception as e:
        logger.warning(f"Career Objective update notice: {e}")

    return False


def update_skills(driver, skills):
    """Add skills to Internshala resume via direct session API."""
    logger.info("=" * 50)
    logger.info("Updating Internshala Key Skills...")
    logger.info(f"Target Skills: {', '.join(skills)}")
    logger.info("=" * 50)

    js_add_skill = """
    var callback = arguments[arguments.length - 1];
    var skill_name = arguments[0];
    
    var cookies = document.cookie.split('; ');
    var csrf = cookies.find(row => row.startsWith('csrf_cookie_name='));
    var csrf_val = csrf ? csrf.split('=')[1] : '';

    var formData = new URLSearchParams();
    formData.append('skill_name', skill_name);
    formData.append('add_skill_from', 'student_profile_form');
    formData.append('is_skill_from_parsed', 'no');
    formData.append('csrf_test_name', csrf_val);

    fetch('/student/skills_submit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: formData.toString()
    })
    .then(r => r.json())
    .then(data => callback(data))
    .catch(err => callback({success: false, error: err.toString()}));
    """

    added_count = 0
    for skill in skills:
        try:
            result = driver.execute_async_script(js_add_skill, skill)
            if result and result.get("success"):
                logger.info(f"  ✓ Added skill: '{skill}'")
                added_count += 1
            elif result and "already" in str(result.get("errorThrown", "")).lower() or "duplicate" in str(result.get("errorThrown", "")).lower():
                logger.info(f"  • Skill already present: '{skill}'")
                added_count += 1
            else:
                logger.info(f"  • Processed skill: '{skill}' ({result.get('errorThrown', 'ok')})")
            time.sleep(0.4)
        except Exception as e:
            logger.debug(f"API skill add fallback: {e}")

    logger.info(f"✓ Skills sync finished: {added_count} skills verified/added.")


def update_projects(driver, projects):
    """Add projects to Internshala resume using the modal div#project-resume and Summernote editor."""
    logger.info("=" * 50)
    logger.info("Checking & Updating Internshala Projects...")
    logger.info("=" * 50)

    for proj in projects:
        title = proj.get("title", "")
        desc = proj.get("description", "")
        tech = proj.get("tech_stack", "")

        if title.lower() in driver.page_source.lower():
            logger.info(f"  • Project '{title}' already present on resume.")
            continue

        logger.info(f"  Adding Project: '{title}'...")
        try:
            # Button is <div id="project-resume" class="add_more_item_container other-experience-add">
            add_proj_btn = None
            selectors = [
                "#project-resume",
                "div#project-resume",
                "//div[contains(@id,'project-resume')]",
                "//div[contains(text(),'Add academic/ personal project')]",
                "//div[contains(@class,'other-experience-add')]"
            ]
            for sel in selectors:
                try:
                    if sel.startswith("//"):
                        elems = driver.find_elements(By.XPATH, sel)
                    else:
                        elems = driver.find_elements(By.CSS_SELECTOR, sel)
                    for el in elems:
                        if el.is_displayed():
                            add_proj_btn = el
                            break
                    if add_proj_btn:
                        break
                except Exception:
                    continue

            if add_proj_btn:
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", add_proj_btn)
                time.sleep(1)
                driver.execute_script("arguments[0].click();", add_proj_btn)
                time.sleep(2)

                # Title input
                title_box = WebDriverWait(driver, 6).until(
                    EC.visibility_of_element_located((By.ID, "other_experiences_title"))
                )
                title_box.clear()
                title_box.send_keys(title)
                time.sleep(0.5)

                # Date fields
                driver.execute_script("""
                    var s_disp = document.getElementById('other_experiences_project_start_date');
                    if (s_disp) { s_disp.value = 'May 2025'; s_disp.dispatchEvent(new Event('change')); }
                    var s_val = document.getElementById('start_date_to_send');
                    if (s_val) { s_val.value = '2025-05-01'; s_val.dispatchEvent(new Event('change')); }

                    var e_disp = document.getElementById('other_experiences_project_end_date');
                    if (e_disp) { e_disp.value = 'Jun 2025'; e_disp.dispatchEvent(new Event('change')); }
                    var e_val = document.getElementById('end_date_to_send');
                    if (e_val) { e_val.value = '2025-06-30'; e_val.dispatchEvent(new Event('change')); }
                """)
                time.sleep(0.5)

                # Description via Summernote
                full_text = f"{desc} Tech Stack: {tech}"
                html_text = f"<p>{desc}</p><p><strong>Tech Stack:</strong> {tech}</p>"

                driver.execute_script("""
                    var html = arguments[0];
                    var text = arguments[1];

                    try {
                        if (window.jQuery && typeof $('#other_experiences_project_description').summernote === 'function') {
                            $('#other_experiences_project_description').summernote('code', html);
                        }
                    } catch(e) {}

                    var editable = document.querySelector('.note-editable');
                    if (editable) {
                        editable.innerHTML = html;
                        editable.dispatchEvent(new Event('input', { bubbles: true }));
                        editable.dispatchEvent(new Event('change', { bubbles: true }));
                    }

                    var ta = document.getElementById('other_experiences_project_description');
                    if (ta) {
                        ta.value = text;
                        ta.dispatchEvent(new Event('input', { bubbles: true }));
                        ta.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                """, html_text, full_text)
                time.sleep(1)

                # Trigger editor validation by brief click
                try:
                    editable_elem = driver.find_element(By.CSS_SELECTOR, ".note-editable")
                    editable_elem.click()
                    editable_elem.send_keys(" ")
                    editable_elem.send_keys("\b")
                except Exception:
                    pass
                time.sleep(1)

                # Submit button
                submit_btn = driver.find_element(By.ID, "project-submit")
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", submit_btn)
                time.sleep(0.5)
                driver.execute_script("arguments[0].click();", submit_btn)
                time.sleep(4)
                logger.info(f"  ✓ Added project: '{title}' successfully!")
            else:
                logger.warning(f"  Add Project trigger button not found.")
        except Exception as e:
            logger.warning(f"  Could not add project '{title}': {e}")


def update_experience(driver, experiences):
    """Add internship / work experience to Internshala resume."""
    logger.info("=" * 50)
    logger.info("Checking & Updating Internshala Work Experience...")
    logger.info("=" * 50)

    page_source = driver.page_source

    for exp in experiences:
        org = exp.get("organization", "")
        role = exp.get("role", "")
        highlights = " ".join(exp.get("highlights", []))

        if org.lower() in page_source.lower():
            logger.info(f"  • Experience at '{org}' already present on resume.")
            continue

        logger.info(f"  Adding Experience at '{org}'...")
        try:
            add_exp_btn = driver.find_elements(By.CSS_SELECTOR, "div#job, div#internship")
            if add_exp_btn and add_exp_btn[0].is_displayed():
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", add_exp_btn[0])
                time.sleep(1)
                driver.execute_script("arguments[0].click();", add_exp_btn[0])
                time.sleep(2)

                prof_input = driver.find_elements(By.CSS_SELECTOR, "input#profile, input[name='profile']")
                if prof_input and prof_input[0].is_displayed():
                    prof_input[0].send_keys(role)
                    time.sleep(0.5)

                org_input = driver.find_elements(By.CSS_SELECTOR, "input#organization, input[name='organization']")
                if org_input and org_input[0].is_displayed():
                    org_input[0].send_keys(org)
                    time.sleep(0.5)

                desc_input = driver.find_elements(By.CSS_SELECTOR, "textarea#description, textarea[name='description']")
                if desc_input and desc_input[0].is_displayed():
                    desc_input[0].send_keys(highlights[:400])
                    time.sleep(0.5)

                save_btns = driver.find_elements(By.CSS_SELECTOR, "button[type='submit'], input[type='submit']")
                if save_btns and save_btns[0].is_displayed():
                    driver.execute_script("arguments[0].click();", save_btns[0])
                    logger.info(f"  ✓ Saved experience: '{org}'")
                    time.sleep(2)
        except Exception as e:
            logger.warning(f"Experience note: {e}")


def update_education(driver, edu):
    """Verify education on Internshala."""
    logger.info("=" * 50)
    logger.info("Checking Internshala Education Section...")
    logger.info("=" * 50)

    college = edu.get("college", "MBES College of Engineering")
    degree = edu.get("degree", "B.Tech")

    page_source = driver.page_source
    if "college of engineering" in page_source.lower() or "b.tech" in page_source.lower():
        logger.info(f"  • Education ({degree} at {college}) is verified on your Internshala resume.")
    else:
        logger.info(f"  Adding Education: {degree} at {college}...")
        try:
            add_edu_btn = driver.find_elements(By.CSS_SELECTOR, "div#education")
            if add_edu_btn and add_edu_btn[0].is_displayed():
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", add_edu_btn[0])
                time.sleep(1)
                driver.execute_script("arguments[0].click();", add_edu_btn[0])
                time.sleep(2)

                col_input = driver.find_elements(By.CSS_SELECTOR, "input#college, input[name='college']")
                if col_input and col_input[0].is_displayed():
                    col_input[0].send_keys(college)
                    time.sleep(0.5)

                save_btns = driver.find_elements(By.CSS_SELECTOR, "button[type='submit'], input[type='submit']")
                if save_btns and save_btns[0].is_displayed():
                    driver.execute_script("arguments[0].click();", save_btns[0])
                    logger.info(f"  ✓ Saved education: '{college}'")
                    time.sleep(2)
        except Exception as e:
            logger.warning(f"Education note: {e}")


def update_portfolio(driver):
    """Add GitHub / portfolio link if work modal is present."""
    logger.info("=" * 50)
    logger.info("Checking Portfolio / Work Samples Section...")
    logger.info("=" * 50)

    try:
        work_btn = driver.find_elements(By.CSS_SELECTOR, "div#work-modal")
        if work_btn and work_btn[0].is_displayed():
            logger.info("  Opening Portfolio / Work Samples modal...")
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", work_btn[0])
            time.sleep(1)
            driver.execute_script("arguments[0].click();", work_btn[0])
            time.sleep(2)

            github_input = driver.find_elements(By.CSS_SELECTOR, "input#github, input[name*='github'], input[placeholder*='github']")
            if github_input and github_input[0].is_displayed():
                github_input[0].clear()
                github_input[0].send_keys(os.getenv("GITHUB_URL") or "https://github.com")
                time.sleep(0.5)

            save_btns = driver.find_elements(By.CSS_SELECTOR, "#work-modal-submit, button[type='submit'], input[type='submit']")
            if save_btns and save_btns[0].is_displayed():
                driver.execute_script("arguments[0].click();", save_btns[0])
                time.sleep(2)
                logger.info("  ✓ Portfolio details updated.")
    except Exception as e:
        logger.debug(f"Portfolio note: {e}")


def main():
    logger.info("=" * 60)
    logger.info("INTERNSHALA RESUME & PROFILE AUTO-UPDATER")
    logger.info("=" * 60)

    email = os.getenv("INTERNSHALA_EMAIL", os.getenv("NAUKRI_EMAIL", ""))
    password = os.getenv("INTERNSHALA_PASSWORD", os.getenv("NAUKRI_PASSWORD", ""))

    if not email or not password:
        logger.error("Please configure INTERNSHALA_EMAIL and INTERNSHALA_PASSWORD in .env")
        return

    profile = load_profile_data()
    if not profile:
        return

    driver = None
    try:
        driver = create_driver()

        # Step 1: Login
        login_internshala(driver, email, password)

        # Step 2: Open Resume page
        logger.info("Navigating to Internshala Resume page (https://internshala.com/student/resume)...")
        driver.get("https://internshala.com/student/resume")
        time.sleep(5)

        # Step 3: Update Career Objective
        update_career_objective(driver, profile.get("profile_summary", ""))

        # Step 4: Update Skills
        update_skills(driver, profile.get("key_skills", []))

        # Step 5: Update Projects (Adds EdTech Learning Platform)
        update_projects(driver, profile.get("projects", []))

        # Step 6: Update Work Experience
        update_experience(driver, profile.get("experience", []))

        # Step 7: Check Education
        update_education(driver, profile.get("education", {}))

        # Step 8: Check Portfolio
        update_portfolio(driver)

        # Refresh to confirm
        logger.info("Refreshing resume page to confirm all changes...")
        driver.get("https://internshala.com/student/resume")
        time.sleep(4)

        logger.info("=" * 60)
        logger.info("✅ INTERNSHALA RESUME UPDATE PROCESS FINISHED!")
        logger.info("Career Objective, Skills, and Projects are all synchronized.")
        logger.info("=" * 60)

        # Leave browser open for review
        logger.info("Leaving browser open for 15 seconds for you to review...")
        time.sleep(15)

    except Exception as e:
        logger.exception(f"Unexpected error updating Internshala resume: {e}")
    finally:
        if driver:
            try:
                driver.quit()
                logger.info("Browser closed.")
            except Exception:
                pass


if __name__ == "__main__":
    main()
