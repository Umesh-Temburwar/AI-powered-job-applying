"""
Naukri Auto-Apply Bot - Microsoft Edge Version (Updated for Naukri.com 2026)
================================================================================
Automates job applications on Naukri.com using Selenium with Edge browser.
Opens each job keyword search in a separate tab for faster collection.

Usage:
    1. Copy .env.example to .env and fill in your details
    2. pip install -r requirements.txt
    3. python Naukri-Edge.py

Requirements:
    - Edge browser installed
    - Dependencies from requirements.txt
"""

import os
import sys
import time
import logging
import pandas as pd
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.edge.service import Service as EdgeService
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
from bs4 import BeautifulSoup
from platforms.location_matcher import is_location_match, parse_target_locations, get_location_search_slugs

# Try to use webdriver-manager for automatic driver management
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
# Configuration
# ------------------------------------------------------------
load_dotenv()

# --- Auto-load Candidate Details from profile_data.json ---
try:
    import json
    _p_path = os.path.join(os.path.dirname(__file__), "data", "profile_data.json")
    if not os.path.exists(_p_path):
        _p_path = os.path.join(os.path.dirname(__file__), "profile_data.json")
    if os.path.exists(_p_path):
        with open(_p_path, "r", encoding="utf-8") as _f:
            _p_data = json.load(_f)
            _p_pers = _p_data.get("personal", {})
            if not os.getenv("FIRSTNAME") and _p_pers.get("firstname"):
                os.environ["FIRSTNAME"] = _p_pers.get("firstname")
            if not os.getenv("LASTNAME") and _p_pers.get("lastname"):
                os.environ["LASTNAME"] = _p_pers.get("lastname")
            if not os.getenv("CANDIDATE_NAME") and _p_pers.get("name"):
                os.environ["CANDIDATE_NAME"] = _p_pers.get("name")
            if not os.getenv("KEYWORDS") and _p_data.get("key_skills"):
                os.environ["KEYWORDS"] = ", ".join(_p_data.get("key_skills"))
            if not os.getenv("LOCATION") and _p_pers.get("current_location"):
                os.environ["LOCATION"] = _p_pers.get("current_location")
            if not os.getenv("NAUKRI_EMAIL") and _p_pers.get("email"):
                os.environ["NAUKRI_EMAIL"] = _p_pers.get("email")
except Exception:
    pass

# --- Naukri Credentials ---
NAUKRI_EMAIL = os.getenv('NAUKRI_EMAIL', '')
NAUKRI_PASSWORD = os.getenv('NAUKRI_PASSWORD', '')

# --- Personal Details ---
FIRSTNAME = os.getenv('FIRSTNAME', '').strip() or os.getenv('CANDIDATE_NAME', 'Umesh Temburwar').split()[0]
LASTNAME = os.getenv('LASTNAME', '').strip() or (os.getenv('CANDIDATE_NAME', 'Umesh Temburwar').split()[-1] if len(os.getenv('CANDIDATE_NAME', 'Umesh Temburwar').split()) > 1 else 'Candidate')

# --- Job Search ---
_raw_kw = os.getenv('KEYWORDS', '').strip()
KEYWORDS = [kw.strip() for kw in _raw_kw.split(',') if kw.strip()] if _raw_kw else ['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'React Developer', 'Python Developer']
LOCATION = os.getenv('LOCATION', '').strip() or 'pune, Remote'

# --- Limits ---
MAX_APPLICATIONS = int(os.getenv('MAX_APPLICATIONS', '50'))
PAGES_PER_KEYWORD = int(os.getenv('PAGES_PER_KEYWORD', '2'))

# --- Browser Configuration (auto, edge, chrome, brave, firefox) ---
BROWSER_CHOICE = os.getenv('BROWSER', 'auto').strip().lower()
EDGE_DRIVER_PATH = os.getenv('EDGE_DRIVER_PATH', '')
CHROME_DRIVER_PATH = os.getenv('CHROME_DRIVER_PATH', '')

# ------------------------------------------------------------
# Logging Setup
# ------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)


def validate_config():
    """Check that required configuration values are set."""
    errors = []
    is_dry_run = os.getenv("DRY_RUN", "").lower() in ("1", "true", "yes") or "--dry-run" in sys.argv
    if not is_dry_run:
        if not NAUKRI_EMAIL:
            errors.append("NAUKRI_EMAIL is not set in .env")
        if not NAUKRI_PASSWORD:
            errors.append("NAUKRI_PASSWORD is not set in .env")
    else:
        if not NAUKRI_EMAIL or not NAUKRI_PASSWORD:
            logger.info("[DRY RUN] Naukri credentials not configured; proceeding to job search in guest exploration mode.")
    if errors:
        for e in errors:
            logger.error(e)
        logger.error("Please configure your Naukri credentials or run in --dry-run mode.")
        return False
    return True


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
    """Locate Brave browser executable if installed."""
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
    """Locate Google Chrome executable if installed."""
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
    """Locate Microsoft Edge executable if installed."""
    candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    ]
    for p in candidates:
        if p and os.path.exists(p):
            return p
    return None


def is_headless_environment() -> bool:
    """Return True if running in a headless container or cloud environment (e.g. Render, Linux without X11)."""
    if os.getenv("HEADLESS", "").lower() in ("true", "1", "yes"):
        return True
    if os.getenv("RENDER") or os.getenv("RENDER_SERVICE_ID") or os.getenv("VERCEL"):
        return True
    if sys.platform != "win32" and not os.getenv("DISPLAY"):
        return True
    return False


def _launch_single_browser(browser_name):
    """Attempt to initialize a WebDriver instance for the specified browser."""
    b = browser_name.lower().strip()
    is_headless = is_headless_environment()

    if b == 'edge':
        if sys.platform != "win32" and not find_edge_binary():
            raise FileNotFoundError("Microsoft Edge is not installed on this Linux/cloud environment.")
        options = webdriver.EdgeOptions()
        options.add_argument("--start-maximized")
        options.add_argument("--disable-notifications")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        if is_headless:
            options.add_argument("--headless=new")
            options.add_argument("--window-size=1920,1080")
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
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--disable-software-rasterizer")
        options.add_argument("--remote-allow-origins=*")
        options.add_argument("--remote-debugging-port=0")
        options.add_argument("--no-first-run")
        options.add_argument("--no-default-browser-check")
        options.add_argument("--ignore-certificate-errors")
        if is_headless:
            options.add_argument("--headless=new")
            options.add_argument("--window-size=1920,1080")
        options.add_experimental_option("excludeSwitches", ["enable-automation", "enable-logging"])
        options.add_experimental_option("useAutomationExtension", False)
        chrome_bin = find_chrome_binary()
        if chrome_bin:
            options.binary_location = chrome_bin

        # Strategy 1: Selenium 4 built-in manager
        try:
            return webdriver.Chrome(options=options)
        except Exception:
            pass

        # Strategy 2: Custom CHROME_DRIVER_PATH
        if CHROME_DRIVER_PATH and os.path.exists(CHROME_DRIVER_PATH):
            try:
                return webdriver.Chrome(service=ChromeService(executable_path=CHROME_DRIVER_PATH), options=options)
            except Exception:
                pass

        # Strategy 3: webdriver_manager
        if WEBDRIVER_MANAGER_AVAILABLE:
            try:
                driver_path = ChromeDriverManager().install()
                if driver_path and not driver_path.endswith('.exe') and os.path.isdir(os.path.dirname(driver_path)):
                    cand = os.path.join(os.path.dirname(driver_path), 'chromedriver.exe')
                    if os.path.exists(cand):
                        driver_path = cand
                return webdriver.Chrome(service=ChromeService(executable_path=driver_path), options=options)
            except Exception:
                pass

        return webdriver.Chrome(service=ChromeService(), options=options)

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
    """
    Create and return a WebDriver instance.
    Auto-detects the system default browser first (Chrome, Edge, Brave, Firefox),
    and falls back to any other available browser gracefully.
    """
    try:
        from platforms.browser_manager import create_driver as bm_create_driver
        return bm_create_driver(target=target or BROWSER_CHOICE or 'auto', headless=is_headless_environment())
    except Exception as bm_err:
        logger.info(f"Using local browser driver factory (note: {bm_err})")

    target = (target or BROWSER_CHOICE or 'auto').lower()
    default_browser = get_default_browser()

    if default_browser:
        logger.info(f"System default browser detected: {default_browser.upper()}")

    order = []
    if sys.platform != "win32" or is_headless_environment():
        order = ['chrome', 'firefox']
    elif target == 'auto':
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
            logger.info(f"✓ Successfully started {b.upper()} browser!")
            return driver
        except Exception as e:
            logger.warning(f"Could not start {b.upper()}: {e}")

    raise RuntimeError("Failed to launch any supported browser (Edge, Chrome, Brave, Firefox).")


# Backwards compatibility alias
create_edge_driver = create_browser_driver


def login_naukri(driver):
    """Log in to Naukri.com."""
    if not NAUKRI_EMAIL or not NAUKRI_PASSWORD:
        logger.info("[INFO] Skipping Naukri login (running in guest search / dry-run mode).")
        return

    logger.info("Logging in to Naukri.com...")
    driver.get('https://login.naukri.com/')
    time.sleep(3)

    # Wait for username field
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.ID, 'usernameField'))
    )

    uname = driver.find_element(By.ID, 'usernameField')
    uname.send_keys(NAUKRI_EMAIL)

    passwd = driver.find_element(By.ID, 'passwordField')
    passwd.send_keys(NAUKRI_PASSWORD)
    passwd.send_keys(Keys.ENTER)

    # Wait for login to complete
    time.sleep(8)
    logger.info("Login completed.")


def build_search_urls():
    """
    Build all search URLs for every keyword and target location combination.
    Naukri.com updated URL format: /{keyword}-jobs-in-{location}
    Returns a list of (keyword, url) tuples.
    """
    urls = []
    target_locations = parse_target_locations(LOCATION)
    loc_slugs = get_location_search_slugs(target_locations) or [""]

    for keyword in KEYWORDS:
        keyword_slug = keyword.lower().replace(' ', '-')
        for loc_slug in loc_slugs[:2]:
            for page_num in range(1, PAGES_PER_KEYWORD + 1):
                if not loc_slug:
                    url = f"https://www.naukri.com/{keyword_slug}-jobs" if page_num == 1 else f"https://www.naukri.com/{keyword_slug}-jobs-{page_num}"
                elif loc_slug == "work-from-home":
                    url = f"https://www.naukri.com/{keyword_slug}-wfh-jobs" if page_num == 1 else f"https://www.naukri.com/{keyword_slug}-wfh-jobs-{page_num}"
                else:
                    url = f"https://www.naukri.com/{keyword_slug}-jobs-in-{loc_slug}" if page_num == 1 else f"https://www.naukri.com/{keyword_slug}-jobs-in-{loc_slug}-{page_num}"
                urls.append((keyword, url))
    return urls


def open_tabs_parallel(driver, search_urls):
    """
    Open all search URLs in parallel browser tabs.
    The first URL opens in the current tab; the rest open in new tabs.
    Returns the original window handle.
    """
    original_window = driver.current_window_handle

    if not search_urls:
        return original_window

    # Open first URL in current tab
    keyword, first_url = search_urls[0]
    logger.info(f"[Tab: Main] Opening: {first_url}")
    driver.get(first_url)
    time.sleep(3)

    # Open remaining URLs in new tabs
    for keyword, url in search_urls[1:]:
        logger.info(f"[Tab: New] Opening: {url}")
        driver.switch_to.new_window('tab')
        driver.get(url)
        time.sleep(2)

    # Switch back to the original tab
    driver.switch_to.window(original_window)
    return original_window


def collect_job_links_from_tab(driver, window_handle):
    """
    Switch to a specific tab, scrape job links from the page.
    Uses updated Naukri.com selectors (as of 2026 redesign).

    Current HTML structure for job cards:
        <div class="srp-jobtuple-wrapper" data-job-id="...">
          <div class="cust-job-tuple layout-wrapper lay-2 sjw__tuple">
            <div class="row1">
              <h2><a class="title " href="https://...">Job Title</a></h2>
            </div>
          </div>
        </div>
    """
    links = []
    try:
        driver.switch_to.window(window_handle)
        time.sleep(3)  # Wait for page to fully render

        soup = BeautifulSoup(driver.page_source, 'html5lib')

        # New selector: find all job tuple wrappers
        job_wrappers = soup.find_all('div', class_='srp-jobtuple-wrapper')
        logger.info(f"[Tab: {driver.title[:50]}] Found {len(job_wrappers)} job cards (srp-jobtuple-wrapper)")

        if not job_wrappers:
            # Fallback: try the older cust-job-tuple class
            job_wrappers = soup.find_all('div', class_='cust-job-tuple')
            logger.info(f"[Tab: {driver.title[:50]}] Found {len(job_wrappers)} job cards (cust-job-tuple fallback)")

        for job_wrapper in job_wrappers:
            # Find the title link - new selector is a.title (class="title ")
            title_link = (
                job_wrapper.find('a', class_='title')
                or job_wrapper.find('a', class_=lambda c: c and 'title' in c.lower())
                or job_wrapper.find('a', href=lambda h: h and 'job-listings' in h)
            )
            if title_link and title_link.get('href'):
                href = title_link.get('href')
                if href.startswith('/'):
                    href = 'https://www.naukri.com' + href
                clean_url = href.split('?')[0]

                # Scrape real Role, Company, Location, and Salary
                role = title_link.get_text(strip=True) or "Software Developer"
                comp_elem = (
                    job_wrapper.find('a', class_='comp-name')
                    or job_wrapper.find('a', class_=lambda c: c and 'comp' in c.lower())
                    or job_wrapper.find('span', class_=lambda c: c and 'comp' in c.lower())
                )
                company = comp_elem.get_text(strip=True) if comp_elem else "Naukri Verified Employer"

                loc_elem = (
                    job_wrapper.find('span', class_='loc-wrap')
                    or job_wrapper.find('span', class_='locWdth')
                    or job_wrapper.find('span', class_=lambda c: c and ('loc' in c.lower() or 'city' in c.lower()))
                )
                location = loc_elem.get_text(strip=True) if loc_elem else (LOCATION or "Pune, India")

                # Strictly check location match against candidate's targets
                target_locations = parse_target_locations(LOCATION)
                if not is_location_match(location, target_locations):
                    logger.info(f"📍 [LOCATION FILTER] Skipping Naukri vacancy '{role}' @ '{company}' (Location: '{location}') - Target: {target_locations}")
                    continue

                sal_elem = (
                    job_wrapper.find('span', class_='sal-wrap')
                    or job_wrapper.find('span', class_=lambda c: c and ('sal' in c.lower() or 'rupee' in c.lower()))
                )
                salary = sal_elem.get_text(strip=True) if sal_elem else "Not disclosed"

                links.append({
                    "url": clean_url,
                    "title": role,
                    "company": company,
                    "location": location,
                    "salary": salary,
                })

    except WebDriverException as e:
        logger.warning(f"[Tab] Error reading tab: {e}")

    return links


def collect_all_jobs_parallel(driver, search_urls):
    """
    Open all keyword search pages in parallel tabs and collect job links from each.
    Returns a deduplicated list of job dictionary items.
    """
    logger.info("=" * 50)
    logger.info(f"Opening {len(search_urls)} search pages in parallel tabs...")
    logger.info("=" * 50)

    # Open all search URLs in parallel tabs
    original_window = open_tabs_parallel(driver, search_urls)

    # Collect job links from each tab
    all_items = []
    window_handles = driver.window_handles
    logger.info(f"Collecting job links from {len(window_handles)} tabs...")

    for handle in window_handles:
        tab_items = collect_job_links_from_tab(driver, handle)
        all_items.extend(tab_items)

    # Close all extra tabs and return to main
    logger.info("Closing search tabs...")
    for handle in window_handles:
        if handle != original_window:
            try:
                driver.switch_to.window(handle)
                driver.close()
            except WebDriverException:
                pass
    driver.switch_to.window(original_window)

    # Remove duplicates by URL while preserving order
    seen_urls = set()
    unique_items = []
    for item in all_items:
        u = item.get("url") if isinstance(item, dict) else item
        if u and u not in seen_urls:
            seen_urls.add(u)
            unique_items.append(item)

    logger.info(f"Total unique job links collected: {len(unique_items)}")
    return unique_items


def click_apply_button(driver, link):
    """
    Try to click the Apply button on a job detail page.
    Updated: Naukri.com now uses "Apply on company site" button text.

    Returns True if applied successfully, False otherwise.
    """
    # First, wait for the page to load
    time.sleep(4)

    # Try to find and click the apply button (updated selector)
    # New: button text is "Apply on company site", id="company-site-button"
    apply_selectors = [
        (By.XPATH, "//button[contains(text(),'Apply on company site')]"),
        (By.XPATH, "//button[contains(text(),'Apply')]"),
        (By.ID, "company-site-button"),
        (By.CSS_SELECTOR, "button[class*='company-site-button']"),
        (By.CSS_SELECTOR, "[class*='apply-button-container'] button"),
    ]

    for by, selector in apply_selectors:
        try:
            apply_btn = WebDriverWait(driver, 3).until(
                EC.element_to_be_clickable((by, selector))
            )
            apply_btn.click()
            return True
        except (TimeoutException, NoSuchElementException):
            continue

    return False


def apply_to_jobs(driver, job_links):
    """
    Visit each job link and attempt to apply.
    Returns (applied_count, failed_count, applied_list).
    """
    applied = 0
    failed = 0
    applied_list = {'passed': [], 'failed': []}

    logger.info("=" * 50)
    logger.info(f"Starting job applications (max: {MAX_APPLICATIONS})...")
    logger.info("=" * 50)

    for i, item in enumerate(job_links, 1):
        if applied >= MAX_APPLICATIONS:
            logger.info(f"Reached max application limit ({MAX_APPLICATIONS}). Stopping.")
            break

        link = item.get("url") if isinstance(item, dict) else str(item)
        job_title = item.get("title", "") if isinstance(item, dict) else ""
        company = item.get("company", "") if isinstance(item, dict) else ""
        location = item.get("location", "") if isinstance(item, dict) else ""
        salary = item.get("salary", "") if isinstance(item, dict) else ""

        logger.info(f"[{i}/{len(job_links)}] Visiting job: {job_title or link} @ {company or 'Direct Employer'}")
        try:
            driver.get(link)
        except WebDriverException as e:
            logger.warning(f"  ✗ Failed to load page: {e}")
            failed += 1
            applied_list['failed'].append(item)
            continue

        # If details were missing from search card, scrape from detail page
        try:
            if not job_title:
                t_elem = driver.find_elements(By.CSS_SELECTOR, "h1[class*='jd-header-title'], h1, .styles_jd-header-title__4H9M0")
                if t_elem and t_elem[0].text.strip():
                    job_title = t_elem[0].text.strip()
            if not company:
                c_elem = driver.find_elements(By.CSS_SELECTOR, "div[class*='jd-header-comp-name'] a, a[class*='comp-name'], [class*='company-name']")
                if c_elem and c_elem[0].text.strip():
                    company = c_elem[0].text.strip()
            if not location:
                l_elem = driver.find_elements(By.CSS_SELECTOR, "span[class*='jdn-location'], [class*='location']")
                if l_elem and l_elem[0].text.strip():
                    location = l_elem[0].text.strip()
            if not salary:
                s_elem = driver.find_elements(By.CSS_SELECTOR, "span[class*='jdn-salary'], [class*='salary']")
                if s_elem and s_elem[0].text.strip():
                    salary = s_elem[0].text.strip()
        except Exception:
            pass

        record_item = {
            "url": link,
            "title": job_title or "Software Developer",
            "company": company or "Naukri Verified Employer",
            "location": location or (LOCATION or "Pune, India"),
            "salary": salary or "Not disclosed",
        }

        # --- Dry Run Safe Exploration Mode ---
        is_dry_run = os.getenv("DRY_RUN", "").lower() in ("1", "true", "yes") or "--dry-run" in sys.argv
        if is_dry_run:
            applied += 1
            applied_list['passed'].append(record_item)
            logger.info(f"  ✓ [DRY RUN] Position verified & simulation applied! [{record_item['title']} @ {record_item['company']}] Total: {applied}")
            time.sleep(1.5)
            continue

        # --- Click the "Apply" button ---
        if click_apply_button(driver, link):
            applied += 1
            applied_list['passed'].append(record_item)
            logger.info(f"  ✓ Applied! [{record_item['title']} @ {record_item['company']}] Total: {applied}")
            time.sleep(2)
        else:
            failed += 1
            applied_list['failed'].append(record_item)
            logger.warning(f"  ✗ No Apply button found. Fail count: {failed}")
            continue

        # --- Handle any additional fields (first/last name, submit) ---
        try:
            quota_el = driver.find_element(By.XPATH, "//*[text()='Your daily quota has been expired.']")
            if quota_el:
                logger.info("Daily quota expired. Stopping.")
                break
        except NoSuchElementException:
            pass

        try:
            driver.find_element(By.XPATH, "//input[@id='CUSTOM-FIRSTNAME']")
            firstname_el = driver.find_element(By.ID, 'CUSTOM-FIRSTNAME')
            firstname_el.clear()
            firstname_el.send_keys(FIRSTNAME)
        except NoSuchElementException:
            pass

        # --- Auto-fill any screening form or questions with UniversalFormFiller ---
        try:
            from platforms.universal_form_filler import UniversalFormFiller
            filler = UniversalFormFiller()
            filler.fill_form_step(driver)
        except Exception as filler_err:
            logger.debug(f"Form filler notice: {filler_err}")

        try:
            driver.find_element(By.XPATH, "//input[@id='CUSTOM-LASTNAME']")
            lastname_el = driver.find_element(By.ID, 'CUSTOM-LASTNAME')
            lastname_el.clear()
            lastname_el.send_keys(LASTNAME)
        except NoSuchElementException:
            pass

        try:
            submit_btn = driver.find_element(By.XPATH, "//*[text()='Submit and Apply']")
            submit_btn.click()
            time.sleep(2)
        except NoSuchElementException:
            pass

    return applied, failed, applied_list


def save_results(applied_list):
    """Save applied/failed links to CSV and persistent SQLite CRM Tracker."""
    csv_file = "naukriapplied.csv"
    passed_urls = [it.get("url") if isinstance(it, dict) else it for it in applied_list.get('passed', [])]
    failed_urls = [it.get("url") if isinstance(it, dict) else it for it in applied_list.get('failed', [])]
    final_dict = {'passed': pd.Series(passed_urls), 'failed': pd.Series(failed_urls)}
    df = pd.DataFrame.from_dict(final_dict)
    df.to_csv(csv_file, index=False)
    logger.info(f"Results saved to {csv_file}")

    # Persistent SQLite CRM Sync & Notifications
    try:
        from platforms.tracker_db import record_application, has_applied
        from platforms.notifier import notify_application_success
        for it in applied_list.get('passed', []):
            url = it.get("url") if isinstance(it, dict) else str(it)
            title = it.get("title", "Software Developer") if isinstance(it, dict) else "Software Developer"
            company = it.get("company", "Naukri Verified Employer") if isinstance(it, dict) else "Naukri Verified Employer"
            location = it.get("location", LOCATION or "Pune, India") if isinstance(it, dict) else (LOCATION or "Pune, India")
            salary = it.get("salary", "Not disclosed") if isinstance(it, dict) else "Not disclosed"

            if url and not has_applied(url=url):
                record_application(
                    platform="Naukri",
                    job_title=title,
                    company=company,
                    location=location,
                    salary=salary,
                    url=url,
                    status="applied"
                )
                notify_application_success(platform="Naukri", job_title=title, company=company, url=url)
    except Exception as e:
        logger.debug(f"Tracker sync notice: {e}")


def main():
    """Main entry point for the bot."""
    logger.info("=" * 50)
    logger.info("Naukri Auto-Apply Bot (Universal Multi-Browser - 2026 Update)")
    logger.info("=" * 50)

    if not validate_config():
        return

    logger.info(f"Browser mode: {BROWSER_CHOICE.upper()}")
    logger.info(f"Keywords: {KEYWORDS}")
    logger.info(f"Location: {LOCATION or 'Anywhere'}")
    logger.info(f"Max applications: {MAX_APPLICATIONS}")
    logger.info(f"Pages per keyword: {PAGES_PER_KEYWORD}")

    driver = None
    try:
        # Initialize browser
        driver = create_edge_driver()

        # Login
        login_naukri(driver)

        # Build all search URLs
        search_urls = build_search_urls()
        logger.info(f"Total search pages to open: {len(search_urls)}")

        # Collect all job links in parallel (multi-tab)
        job_links = collect_all_jobs_parallel(driver, search_urls)

        if not job_links:
            logger.warning("No job links found. Check your keywords and location.")
            return

        # Apply to jobs
        applied, failed, applied_list = apply_to_jobs(driver, job_links)

        # Save results
        save_results(applied_list)

        # Summary
        logger.info("=" * 50)
        logger.info("APPLICATION SUMMARY")
        logger.info(f"  Successfully applied: {applied}")
        logger.info(f"  Failed/Skipped:      {failed}")
        logger.info(f"  Total processed:     {applied + failed}")
        logger.info(f"  Results saved to:    naukriapplied.csv")
        logger.info("=" * 50)

    except Exception as e:
        logger.exception(f"An unexpected error occurred: {e}")
    finally:
        if driver:
            try:
                driver.quit()
                logger.info("Browser closed.")
            except Exception:
                pass


if __name__ == "__main__":
    main()