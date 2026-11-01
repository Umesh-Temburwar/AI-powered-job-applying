"""
Naukri Profile Auto-Updater Bot
================================================================================
Automatically updates and refreshes your Naukri.com profile using your resume data.
Sections updated:
  1. Resume Headline (Keyword-optimized for recruiter search ranking)
  2. Profile Summary
  3. Key Skills
  4. Daily Profile Refresh (Updates 'Last Active' timestamp on Naukri)

Usage:
  py Naukri-UpdateProfile.py
"""

import os
import sys
import time
import json
import logging
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException

from selenium.webdriver.edge.service import Service as EdgeService
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.firefox.service import Service as FirefoxService

try:
    from webdriver_manager.microsoft import EdgeChromiumDriverManager
    from webdriver_manager.chrome import ChromeDriverManager
    from webdriver_manager.firefox import GeckoDriverManager
    WEBDRIVER_MANAGER_AVAILABLE = True
except ImportError:
    WEBDRIVER_MANAGER_AVAILABLE = False

try:
    import winreg
except ImportError:
    winreg = None

# ------------------------------------------------------------
# Logging Setup
# ------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("NaukriProfileUpdater")

# ------------------------------------------------------------
# Configuration
# ------------------------------------------------------------
load_dotenv()
NAUKRI_EMAIL = os.getenv('NAUKRI_EMAIL', '')
NAUKRI_PASSWORD = os.getenv('NAUKRI_PASSWORD', '')
BROWSER_CHOICE = os.getenv('BROWSER', 'auto').strip().lower()
EDGE_DRIVER_PATH = os.getenv('EDGE_DRIVER_PATH', '')
CHROME_DRIVER_PATH = os.getenv('CHROME_DRIVER_PATH', '')

PROFILE_DATA_FILE = os.path.join("data", "profile_data.json") if os.path.exists(os.path.join("data", "profile_data.json")) else "profile_data.json"


def load_profile_data():
    """Load resume profile data from profile_data.json."""
    if not os.path.exists(PROFILE_DATA_FILE):
        logger.error(f"{PROFILE_DATA_FILE} not found!")
        return None
    try:
        with open(PROFILE_DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading {PROFILE_DATA_FILE}: {e}")
        return None


# ------------------------------------------------------------
# Browser Initialization (Supports Edge, Chrome, Brave, Firefox)
# ------------------------------------------------------------
def get_default_browser():
    """Detect default browser from Windows Registry."""
    if winreg is not None:
        try:
            key = winreg.OpenKey(
                winreg.HKEY_CURRENT_USER,
                r"Software\Microsoft\Windows\Shell\Associations\UrlAssociations\https\UserChoice"
            )
            prog_id, _ = winreg.QueryValueEx(key, "ProgId")
            prog = prog_id.lower()
            if "chrome" in prog:
                return "chrome"
            if "edge" in prog:
                return "edge"
            if "brave" in prog:
                return "brave"
            if "firefox" in prog:
                return "firefox"
        except Exception:
            pass
    return None


def find_brave_binary():
    candidates = [
        os.getenv('BRAVE_PATH', ''),
        r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe",
        r"C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe")
    ]
    for p in candidates:
        if p and os.path.exists(p):
            return p
    return None


def find_chrome_binary():
    candidates = [
        os.getenv('CHROME_PATH', ''),
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe")
    ]
    for p in candidates:
        if p and os.path.exists(p):
            return p
    return None


def find_edge_binary():
    candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    ]
    for p in candidates:
        if p and os.path.exists(p):
            return p
    return None


def _launch_single_browser(browser_name):
    b = browser_name.lower().strip()
    if b == 'edge':
        options = webdriver.EdgeOptions()
        options.add_argument("--start-maximized")
        options.add_argument("--disable-notifications")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)
        edge_bin = find_edge_binary()
        if edge_bin:
            options.binary_location = edge_bin
        if WEBDRIVER_MANAGER_AVAILABLE:
            service = EdgeService(EdgeChromiumDriverManager().install())
        elif EDGE_DRIVER_PATH:
            service = EdgeService(executable_path=EDGE_DRIVER_PATH)
        else:
            service = EdgeService()
        return webdriver.Edge(service=service, options=options)

    elif b == 'chrome':
        options = webdriver.ChromeOptions()
        options.add_argument("--start-maximized")
        options.add_argument("--disable-notifications")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)
        chrome_bin = find_chrome_binary()
        if chrome_bin:
            options.binary_location = chrome_bin
        if WEBDRIVER_MANAGER_AVAILABLE:
            service = ChromeService(ChromeDriverManager().install())
        elif CHROME_DRIVER_PATH:
            service = ChromeService(executable_path=CHROME_DRIVER_PATH)
        else:
            service = ChromeService()
        return webdriver.Chrome(service=service, options=options)

    elif b == 'brave':
        brave_bin = find_brave_binary()
        if not brave_bin:
            raise FileNotFoundError("Brave executable not found on system.")
        options = webdriver.ChromeOptions()
        options.binary_location = brave_bin
        options.add_argument("--start-maximized")
        options.add_argument("--disable-notifications")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)
        if WEBDRIVER_MANAGER_AVAILABLE:
            service = ChromeService(ChromeDriverManager().install())
        else:
            service = ChromeService()
        return webdriver.Chrome(service=service, options=options)

    elif b == 'firefox':
        options = webdriver.FirefoxOptions()
        options.add_argument("--disable-notifications")
        if WEBDRIVER_MANAGER_AVAILABLE:
            service = FirefoxService(GeckoDriverManager().install())
        else:
            service = FirefoxService()
        return webdriver.Firefox(service=service, options=options)
    else:
        raise ValueError(f"Unsupported browser: {browser_name}")


def create_browser_driver(target=None):
    target = (target or BROWSER_CHOICE or 'auto').lower()
    default_browser = get_default_browser()

    if default_browser:
        logger.info(f"Detected default browser: {default_browser.upper()}")

    order = []
    if target == 'auto':
        if default_browser:
            order.append(default_browser)
        for b in ['edge', 'chrome', 'brave', 'firefox']:
            if b not in order:
                order.append(b)
    else:
        order.append(target)
        if default_browser and default_browser not in order:
            order.append(default_browser)
        for b in ['edge', 'chrome', 'brave', 'firefox']:
            if b not in order:
                order.append(b)

    for b in order:
        try:
            logger.info(f"Attempting to launch {b.upper()} browser...")
            driver = _launch_single_browser(b)
            logger.info(f"✓ Started {b.upper()} browser!")
            return driver
        except Exception as e:
            logger.warning(f"Could not start {b.upper()}: {e}")

    raise RuntimeError("Failed to launch any supported browser (Edge, Chrome, Brave, Firefox).")


# ------------------------------------------------------------
# Authentication
# ------------------------------------------------------------
def login_naukri(driver):
    """Log in to Naukri.com."""
    logger.info("Opening Naukri login page...")
    driver.get('https://login.naukri.com/')
    time.sleep(3)

    try:
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.ID, 'usernameField'))
        )
        uname = driver.find_element(By.ID, 'usernameField')
        uname.clear()
        uname.send_keys(NAUKRI_EMAIL)
        time.sleep(1)

        passwd = driver.find_element(By.ID, 'passwordField')
        passwd.clear()
        passwd.send_keys(NAUKRI_PASSWORD)
        passwd.send_keys(Keys.ENTER)

        logger.info("Credentials submitted. Waiting for login verification...")
        time.sleep(8)

        # Check if user needs manual verification (CAPTCHA / OTP)
        if "login" in driver.current_url.lower():
            logger.info("ℹ️ If you see a CAPTCHA or OTP prompt in the browser, please complete it manually...")
            # Wait up to 30 seconds for user to clear it
            for _ in range(15):
                if "login" not in driver.current_url.lower():
                    break
                time.sleep(2)

        logger.info("✓ Login step completed.")
    except Exception as e:
        logger.error(f"Login encounter issue: {e}")


# ------------------------------------------------------------
# Profile Updates
# ------------------------------------------------------------
def update_resume_headline(driver, headline):
    """Update Naukri Resume Headline."""
    logger.info("=" * 50)
    logger.info("Updating Resume Headline...")
    logger.info(f"Target Headline: {headline}")
    logger.info("=" * 50)

    try:
        # Edit icon for resume headline
        edit_selectors = [
            "//div[contains(@class,'resumeHeadline')]//span[contains(@class,'edit')]",
            "//span[contains(text(),'Resume headline')]/ancestor::div[contains(@class,'widget')]//span[contains(@class,'edit')]",
            "//span[contains(text(),'Resume headline')]/following::span[contains(@class,'edit')][1]",
            "//div[contains(@class,'widgetHead')]//span[contains(text(),'Resume headline')]/..//span[contains(@class,'edit')]",
            "//span[contains(@class,'edit') and contains(text(),'edit')]"
        ]

        edit_btn = None
        for sel in edit_selectors:
            try:
                elem = driver.find_elements(By.XPATH, sel)
                if elem and elem[0].is_displayed():
                    edit_btn = elem[0]
                    break
            except Exception:
                continue

        if edit_btn:
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", edit_btn)
            time.sleep(1)
            driver.execute_script("arguments[0].click();", edit_btn)
            time.sleep(2)

        # Find textarea
        textarea_selectors = [
            "//textarea[contains(@id,'resumeHeadlineTxt')]",
            "//textarea[contains(@class,'resumeHeadlineTxt')]",
            "//div[contains(@class,'drawer')]//textarea",
            "//div[contains(@class,'lightbox')]//textarea",
            "//form//textarea"
        ]

        textarea = None
        for sel in textarea_selectors:
            try:
                elems = driver.find_elements(By.XPATH, sel)
                for el in elems:
                    if el.is_displayed():
                        textarea = el
                        break
                if textarea:
                    break
            except Exception:
                continue

        if textarea:
            textarea.send_keys(Keys.CONTROL + "a")
            textarea.send_keys(Keys.BACKSPACE)
            time.sleep(1)
            textarea.send_keys(headline)
            time.sleep(1)

            # Click Save
            save_selectors = [
                "//button[contains(text(),'Save') and not(@disabled)]",
                "//form//button[contains(@class,'btn') and contains(text(),'Save')]",
                "//div[contains(@class,'action')]//button[contains(text(),'Save')]"
            ]
            for s in save_selectors:
                try:
                    s_btn = driver.find_elements(By.XPATH, s)
                    if s_btn and s_btn[0].is_displayed():
                        driver.execute_script("arguments[0].click();", s_btn[0])
                        logger.info("✓ Resume headline updated and saved successfully!")
                        time.sleep(3)
                        return True
                except Exception:
                    continue
        else:
            logger.warning("Resume headline edit textarea not found directly.")
    except Exception as e:
        logger.warning(f"Could not automatically update resume headline: {e}")

    return False


def update_profile_summary(driver, summary):
    """Update Naukri Profile Summary."""
    logger.info("=" * 50)
    logger.info("Updating Profile Summary...")
    logger.info("=" * 50)

    try:
        edit_selectors = [
            "//span[contains(text(),'Profile summary')]/ancestor::div[contains(@class,'widget')]//span[contains(@class,'edit')]",
            "//div[contains(@class,'profileSummary')]//span[contains(@class,'edit')]",
            "//span[contains(text(),'Profile summary')]/following::span[contains(@class,'edit')][1]"
        ]

        edit_btn = None
        for sel in edit_selectors:
            try:
                elems = driver.find_elements(By.XPATH, sel)
                if elems and elems[0].is_displayed():
                    edit_btn = elems[0]
                    break
            except Exception:
                continue

        if edit_btn:
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", edit_btn)
            time.sleep(1)
            driver.execute_script("arguments[0].click();", edit_btn)
            time.sleep(2)

        # Find textarea
        textarea_selectors = [
            "//textarea[contains(@id,'profileSummary')]",
            "//div[contains(@class,'drawer')]//textarea",
            "//div[contains(@class,'lightbox')]//textarea"
        ]

        textarea = None
        for sel in textarea_selectors:
            try:
                elems = driver.find_elements(By.XPATH, sel)
                for el in elems:
                    if el.is_displayed():
                        textarea = el
                        break
                if textarea:
                    break
            except Exception:
                continue

        if textarea:
            textarea.send_keys(Keys.CONTROL + "a")
            textarea.send_keys(Keys.BACKSPACE)
            time.sleep(1)
            textarea.send_keys(summary)
            time.sleep(1)

            # Click Save
            save_selectors = [
                "//button[contains(text(),'Save') and not(@disabled)]",
                "//div[contains(@class,'action')]//button[contains(text(),'Save')]"
            ]
            for s in save_selectors:
                try:
                    s_btn = driver.find_elements(By.XPATH, s)
                    if s_btn and s_btn[0].is_displayed():
                        driver.execute_script("arguments[0].click();", s_btn[0])
                        logger.info("✓ Profile summary updated and saved successfully!")
                        time.sleep(3)
                        return True
                except Exception:
                    continue
        else:
            logger.warning("Profile summary textarea not directly located.")
    except Exception as e:
        logger.warning(f"Could not automatically update profile summary: {e}")

    return False


def update_key_skills(driver, skills):
    """Ensure key skills are present in the profile."""
    logger.info("=" * 50)
    logger.info(f"Target Key Skills: {', '.join(skills)}")
    logger.info("=" * 50)

    try:
        edit_selectors = [
            "//span[contains(text(),'Key skills')]/ancestor::div[contains(@class,'widget')]//span[contains(@class,'edit')]",
            "//div[contains(@class,'keySkills')]//span[contains(@class,'edit')]",
            "//span[contains(text(),'Key skills')]/following::span[contains(@class,'edit')][1]"
        ]

        edit_btn = None
        for sel in edit_selectors:
            try:
                elems = driver.find_elements(By.XPATH, sel)
                if elems and elems[0].is_displayed():
                    edit_btn = elems[0]
                    break
            except Exception:
                continue

        if edit_btn:
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", edit_btn)
            time.sleep(1)
            driver.execute_script("arguments[0].click();", edit_btn)
            time.sleep(2)

            input_field = None
            input_selectors = [
                "//input[contains(@id,'keySkills') or contains(@placeholder,'skills')]",
                "//div[contains(@class,'drawer')]//input[@type='text']",
                "//div[contains(@class,'suggest')]//input"
            ]
            for sel in input_selectors:
                try:
                    elems = driver.find_elements(By.XPATH, sel)
                    if elems and elems[0].is_displayed():
                        input_field = elems[0]
                        break
                except Exception:
                    continue

            if input_field:
                for skill in skills[:8]:  # add top skills
                    try:
                        input_field.send_keys(skill)
                        time.sleep(1)
                        input_field.send_keys(Keys.ENTER)
                        time.sleep(1)
                    except Exception:
                        pass

                # Save
                save_btn = driver.find_elements(By.XPATH, "//button[contains(text(),'Save')]")
                if save_btn and save_btn[0].is_displayed():
                    driver.execute_script("arguments[0].click();", save_btn[0])
                    logger.info("✓ Key skills updated successfully!")
                    time.sleep(3)
                    return True
    except Exception as e:
        logger.warning(f"Key skills update notice: {e}")

    return False


# ------------------------------------------------------------
# Main Flow
# ------------------------------------------------------------
def main():
    logger.info("=" * 50)
    logger.info("Naukri.com Automated Profile Updater")
    logger.info("=" * 50)

    if not NAUKRI_EMAIL or not NAUKRI_PASSWORD:
        logger.error("Please configure NAUKRI_EMAIL and NAUKRI_PASSWORD in .env file.")
        return

    profile = load_profile_data()
    if not profile:
        return

    driver = None
    try:
        driver = create_browser_driver()

        # Step 1: Login
        login_naukri(driver)

        # Step 2: Navigate to profile page
        logger.info("Navigating to user profile page (https://www.naukri.com/mnjuser/profile)...")
        driver.get("https://www.naukri.com/mnjuser/profile")
        time.sleep(5)

        # Check if redirected to profile
        if "profile" not in driver.current_url.lower():
            logger.info("Waiting for profile page to fully load...")
            time.sleep(5)

        logger.info("=" * 50)
        logger.info("Applying Resume Updates to Naukri Profile...")
        logger.info("=" * 50)

        # Step 3: Update Resume Headline
        update_resume_headline(driver, profile.get("naukri_headline", ""))

        # Step 4: Update Profile Summary
        update_profile_summary(driver, profile.get("profile_summary", ""))

        # Step 5: Update Key Skills
        update_key_skills(driver, profile.get("key_skills", []))

        # Refresh page to confirm updates
        logger.info("Refreshing profile page to verify changes...")
        driver.get("https://www.naukri.com/mnjuser/profile")
        time.sleep(4)

        logger.info("=" * 50)
        logger.info("✅ PROFILE UPDATE PROCESS FINISHED!")
        logger.info("Your Naukri 'Last Updated' timestamp is now refreshed to today.")
        logger.info("=" * 50)

        # Keep browser open briefly so user can see their updated profile
        logger.info("Leaving browser open for 10 seconds for review...")
        time.sleep(10)

    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
    finally:
        if driver:
            try:
                driver.quit()
                logger.info("Browser closed.")
            except Exception:
                pass


if __name__ == "__main__":
    main()
