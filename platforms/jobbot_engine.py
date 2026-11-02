"""
╔══════════════════════════════════════════════════════════════════╗
║         JobBot v2.0 — Auto Apply Bot for Jobs                   ║
║  Platforms: LinkedIn, Naukri, Indeed, Glassdoor,                ║
║             Internshala, Shine, Foundit, TimesJobs, Wellfound   ║
║  Browsers: Microsoft Edge / Brave / Chrome (auto-detect)        ║
║  Made for personal use only                                      ║
╚══════════════════════════════════════════════════════════════════╝

SETUP (ek baar karo):
  pip install selenium webdriver-manager

RESUME:  jobbot_v2.py ke same folder mein  resume.pdf  rakho
RUN:     python jobbot_v2.py
"""

import time
import csv
import os
import random
import logging
import json
import pickle
from datetime import datetime
from pathlib import Path

# ── Selenium imports ──────────────────────────────────────────
try:
    from selenium import webdriver
    from selenium.webdriver.edge.service    import Service as EdgeService
    from selenium.webdriver.edge.options   import Options as EdgeOptions
    from selenium.webdriver.chrome.service import Service as ChromeService
    from selenium.webdriver.chrome.options import Options as ChromeOptions
    from selenium.webdriver.common.by       import By
    from selenium.webdriver.support.ui      import WebDriverWait
    from selenium.webdriver.support         import expected_conditions as EC
    from selenium.webdriver.common.keys     import Keys
    from selenium.webdriver.common.action_chains import ActionChains
    from selenium.common.exceptions import (
        TimeoutException, NoSuchElementException,
        ElementClickInterceptedException, StaleElementReferenceException
    )
    from webdriver_manager.microsoft import EdgeChromiumDriverManager
    from webdriver_manager.chrome    import ChromeDriverManager
except ImportError:
    print("❌ Libraries nahi mili! Run karo:")
    print("   pip install selenium webdriver-manager")
    exit(1)

# ══════════════════════════════════════════════════════════════
#  ✏️  DYNAMIC PROFILE & CREDENTIALS LOADER (Umesh Temburwar)
# ══════════════════════════════════════════════════════════════
from dotenv import load_dotenv
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
PROFILE_PATH = (BASE_DIR / "data" / "profile_data.json") if (BASE_DIR / "data" / "profile_data.json").exists() else (BASE_DIR / "profile_data.json")

profile_data = {}
if PROFILE_PATH.exists():
    try:
        with open(PROFILE_PATH, "r", encoding="utf-8") as pf:
            profile_data = json.load(pf)
    except Exception as e:
        pass

personal = profile_data.get("personal", {})
raw_edu = profile_data.get("education", {})
if isinstance(raw_edu, list):
    education = raw_edu[0] if raw_edu else {}
elif isinstance(raw_edu, dict):
    education = raw_edu
else:
    education = {}
skills_list = profile_data.get("key_skills", [
    "React.js", "Node.js", "Express.js", "MongoDB", "PostgreSQL", "Supabase", "JavaScript", "REST APIs", "Git"
])
skills_str = ", ".join(skills_list) if isinstance(skills_list, list) else str(skills_list)

resume_pdf = None
candidate_resume_path = profile_data.get("resume_path") or os.getenv("RESUME_PATH")
if candidate_resume_path and os.path.exists(candidate_resume_path):
    resume_pdf = Path(candidate_resume_path)
else:
    resumes_dir = BASE_DIR / "data" / "resumes"
    if resumes_dir.exists():
        pdf_files = list(resumes_dir.glob("*.pdf"))
        if pdf_files:
            resume_pdf = pdf_files[0]

if not resume_pdf or not resume_pdf.exists():
    fallback_pdf = BASE_DIR / "data" / "resumes" / "Umesh-Temburwar-OCT.pdf"
    if fallback_pdf.exists():
        resume_pdf = fallback_pdf
    else:
        for f in BASE_DIR.glob("*.pdf"):
            resume_pdf = f
            break

CONFIG = {
    # --- Personal info ---
    "name":         personal.get("name", "Umesh Temburwar"),
    "email":        personal.get("email", os.getenv("NAUKRI_EMAIL", "umeshtemburwar2002@gmail.com")),
    "phone":        personal.get("phone", os.getenv("PHONE", "+918856087984")),
    "experience":   str(personal.get("total_experience_years", "0")),
    "current_ctc":  "0",
    "expected_ctc": "450000",
    "notice_period":"0",
    "college":      education.get("college") or education.get("institution") or os.getenv("EDUCATION_COLLEGE", "Engineering College"),
    "degree":       education.get("degree") or os.getenv("EDUCATION_DEGREE", "Bachelor of Technology (B.Tech)"),
    "grad_year":    str(education.get("passing_year") or education.get("year") or os.getenv("EDUCATION_PASSING_YEAR", "2025")),

    # --- Job search ---
    "job_titles": [
        "Full Stack Developer",
        "Software Development Engineer",
        "React Developer",
        "Node.js Developer",
        "Web Developer",
        "Backend Developer",
        "Frontend Developer",
        "Software Engineer"
    ],
    "locations": [
        "Pune",
        "Bangalore",
        "Hyderabad",
        "Mumbai",
        "Remote",
        "Work From Home"
    ],

    "skills":     skills_str,
    "salary":     "4.5",
    "cover_note": profile_data.get("profile_summary", (
        "Computer Science graduate with hands-on experience as a Full Stack Developer, "
        "skilled in React.js, JavaScript, Node.js, Express.js, PostgreSQL, MongoDB, Supabase, and Git. "
        "Experienced in building responsive web applications and REST APIs."
    )),

    # --- Platform credentials ---
    "linkedin_email":       os.getenv("LINKEDIN_EMAIL", os.getenv("NAUKRI_EMAIL", "")),
    "linkedin_password":    os.getenv("LINKEDIN_PASSWORD", os.getenv("NAUKRI_PASSWORD", "")),

    "indeed_email":         os.getenv("INDEED_EMAIL", os.getenv("NAUKRI_EMAIL", "")),
    "indeed_password":      os.getenv("INDEED_PASSWORD", os.getenv("NAUKRI_PASSWORD", "")),

    "naukri_email":         os.getenv("NAUKRI_EMAIL", ""),
    "naukri_password":      os.getenv("NAUKRI_PASSWORD", ""),

    "glassdoor_email":      os.getenv("GLASSDOOR_EMAIL", os.getenv("NAUKRI_EMAIL", "")),
    "glassdoor_password":   os.getenv("GLASSDOOR_PASSWORD", os.getenv("NAUKRI_PASSWORD", "")),

    "internshala_email":    os.getenv("INTERNSHALA_EMAIL", os.getenv("NAUKRI_EMAIL", "")),
    "internshala_password": os.getenv("INTERNSHALA_PASSWORD", os.getenv("NAUKRI_PASSWORD", "")),

    "shine_email":          os.getenv("SHINE_EMAIL", os.getenv("NAUKRI_EMAIL", "")),
    "shine_password":       os.getenv("SHINE_PASSWORD", os.getenv("NAUKRI_PASSWORD", "")),

    "foundit_email":        os.getenv("FOUNDIT_EMAIL", os.getenv("NAUKRI_EMAIL", "")),
    "foundit_password":     os.getenv("FOUNDIT_PASSWORD", os.getenv("NAUKRI_PASSWORD", "")),

    "timesjobs_email":      os.getenv("TIMESJOBS_EMAIL", os.getenv("NAUKRI_EMAIL", "")),
    "timesjobs_password":   os.getenv("TIMESJOBS_PASSWORD", os.getenv("NAUKRI_PASSWORD", "")),

    "wellfound_email":      os.getenv("WELLFOUND_EMAIL", os.getenv("NAUKRI_EMAIL", "")),
    "wellfound_password":   os.getenv("WELLFOUND_PASSWORD", os.getenv("NAUKRI_PASSWORD", "")),

    # --- Bot settings ---
    "max_per_platform":     30,
    "delay_min":            8,
    "delay_max":            18,
    "page_load_wait":       6,
    "platform_rest_min":    300,
    "platform_rest_max":    600,
    "headless":             False,
    "manual_login_wait":    45,

    # --- Browser preference (auto = try all) ---
    "browser":              os.getenv("BROWSER", "auto").lower(),

    # --- Which platforms to use ---
    "use_linkedin":         True,
    "use_naukri":           True,
    "use_indeed":           True,
    "use_glassdoor":        True,
    "use_internshala":      True,
    "use_shine":            True,
    "use_foundit":          True,
    "use_timesjobs":        True,
    "use_wellfound":        True,

    # --- Resume path ---
    "resume_path": str(resume_pdf),

    # --- Cookie save folder (for session reuse) ---
    "cookie_dir": str(BASE_DIR / "cookies"),
}
# ══════════════════════════════════════════════════════════════

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s — %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("jobbot.log", encoding="utf-8"),
    ]
)
log = logging.getLogger("JobBot")

APPLIED_FILE = "applied_jobs.csv"
applied_jobs = set()


# ══════════════════════════════════════════════════════════════
#  UTILS
# ══════════════════════════════════════════════════════════════

def load_applied():
    if os.path.exists(APPLIED_FILE):
        with open(APPLIED_FILE, "r", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                applied_jobs.add(row.get("job_id", ""))
    log.info(f"Previously applied: {len(applied_jobs)} jobs loaded")


def save_applied(platform, job_title, company, job_id, url=""):
    applied_jobs.add(job_id)
    file_exists = os.path.exists(APPLIED_FILE) and os.stat(APPLIED_FILE).st_size > 0
    with open(APPLIED_FILE, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["date", "platform", "job_title", "company", "job_id", "url"])
        writer.writerow([
            datetime.now().strftime("%Y-%m-%d %H:%M"),
            platform, job_title, company, job_id, url
        ])
    log.info(f"💾 Saved: {platform} | {job_title} @ {company}")


def human_delay(mn=None, mx=None):
    t = random.uniform(mn or CONFIG["delay_min"], mx or CONFIG["delay_max"])
    time.sleep(t)


def platform_rest():
    """10-15 minute rest between platforms to avoid detection"""
    wait = random.uniform(CONFIG["platform_rest_min"], CONFIG["platform_rest_max"])
    log.info(f"⏳ Platform rest: {int(wait//60)} min {int(wait%60)} sec...")
    time.sleep(wait)


def safe_click(driver, el):
    try:
        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
        time.sleep(0.5)
        el.click()
    except ElementClickInterceptedException:
        driver.execute_script("arguments[0].click();", el)
    except StaleElementReferenceException:
        pass


def wait_for(driver, by, selector, timeout=15):
    return WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((by, selector))
    )


def type_human(element, text, delay=0.08):
    """Type like a human with random keystroke delays"""
    element.clear()
    for char in text:
        element.send_keys(char)
        time.sleep(random.uniform(0.04, delay))


def save_cookies(driver, platform):
    os.makedirs(CONFIG["cookie_dir"], exist_ok=True)
    path = os.path.join(CONFIG["cookie_dir"], f"{platform}.pkl")
    with open(path, "wb") as f:
        pickle.dump(driver.get_cookies(), f)
    log.info(f"🍪 Cookies saved for {platform}")


def load_cookies(driver, platform, domain):
    path = os.path.join(CONFIG["cookie_dir"], f"{platform}.pkl")
    if not os.path.exists(path):
        return False
    driver.get(domain)
    time.sleep(2)
    with open(path, "rb") as f:
        cookies = pickle.load(f)
    for cookie in cookies:
        try:
            driver.add_cookie(cookie)
        except Exception:
            pass
    driver.refresh()
    time.sleep(3)
    log.info(f"🍪 Cookies loaded for {platform}")
    return True


# ══════════════════════════════════════════════════════════════
#  BROWSER FACTORY — Edge / Brave / Chrome auto-detect
# ══════════════════════════════════════════════════════════════

def find_profile_path(browser_name):
    """
    Windows pe safe automation browser profile provide karta hai.
    Agar user ka regular browser (Chrome/Edge/Brave) background me running hai
    ya locked hai, toh persistent dedicated bot profile use hoti hai taaki
    automation freeze ya crash na ho aur cookies/sessions persist rahein.
    """
    bot_profile_dir = os.path.join(os.path.expanduser("~"), ".universal_job_bot", f"{browser_name.lower()}_profile")
    os.makedirs(bot_profile_dir, exist_ok=True)
    log.info(f"✅ Bot profile ready: {bot_profile_dir}")
    return bot_profile_dir


def make_driver(platform_name=""):
    """
    Existing logged-in browser profile use karta hai.
    LinkedIn/Naukri/Indeed — sab pehle se logged in rahenge.

    CONFIG["browser"]:
      "edge"   → Edge ka existing profile
      "chrome" → Chrome ka existing profile
      "brave"  → Brave ka existing profile
      "auto"   → Edge try karega, phir Chrome, phir Brave
    """
    browser = CONFIG["browser"].lower()

    # ── Anti-detection args ───────────────────────────────────
    common_args = [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--disable-popup-blocking",
        "--disable-notifications",
        "--disable-infobars",
        "--start-maximized",
        "--lang=en-US,en",
        "--remote-allow-origins=*",
        "--remote-debugging-port=0",
        "--disable-gpu",
        "--disable-software-rasterizer",
        "--no-first-run",
        "--no-default-browser-check",
        "--ignore-certificate-errors",
        # Disable password manager popups
        "--disable-save-password-bubble",
    ]

    def _patch(driver):
        """Webdriver detection hatao"""
        driver.execute_script(
            "Object.defineProperty(navigator,'webdriver',{get:()=>undefined});"
            "window.chrome={runtime:{}};"
        )
        driver.implicitly_wait(12)
        return driver

    def try_edge():
        opts = EdgeOptions()
        for a in common_args:
            opts.add_argument(a)
        if CONFIG["headless"]:
            opts.add_argument("--headless=new")
        opts.add_experimental_option("excludeSwitches", ["enable-automation", "enable-logging"])
        opts.add_experimental_option("useAutomationExtension", False)

        # ✅ KEY FIX: Apna existing Edge profile load karo
        profile_path = find_profile_path("edge")
        if profile_path:
            opts.add_argument(f"--user-data-dir={profile_path}")
            opts.add_argument("--profile-directory=Default")
            log.info("🟦 Edge: Existing profile load ho raha hai (LinkedIn pehle se logged in hoga)")
        else:
            log.warning("🟦 Edge: Profile nahi mila — fresh window khulegi")

        try:
            service = EdgeService(EdgeChromiumDriverManager().install())
            d = webdriver.Edge(service=service, options=opts)
            log.info("🟦 Edge launched ✅")
            return _patch(d)
        except Exception as e:
            # Agar profile lock hai (Edge already open) to remote debugging try karo
            if "user data directory is already in use" in str(e).lower():
                log.warning("🟦 Edge already open hai — remote debugging mode try kar raha hoon...")
                return try_edge_remote_debug()
            raise

    def try_edge_remote_debug():
        """Agar Edge already open hai to remote debugging se connect karo"""
        import subprocess
        opts = EdgeOptions()
        opts.add_experimental_option("debuggerAddress", "127.0.0.1:9222")
        try:
            # Pehle existing Edge ko debug mode mein restart karo
            subprocess.Popen([
                r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                "--remote-debugging-port=9222",
                "--user-data-dir=C:\\EdgeDebugProfile",
            ])
            time.sleep(3)
            service = EdgeService(EdgeChromiumDriverManager().install())
            d = webdriver.Edge(service=service, options=opts)
            log.info("🟦 Edge remote debug connected ✅")
            return _patch(d)
        except Exception as e2:
            raise RuntimeError(f"Edge remote debug bhi fail: {e2}")

    def try_chrome(brave=False):
        opts = ChromeOptions()
        for a in common_args:
            opts.add_argument(a)
        if CONFIG["headless"]:
            opts.add_argument("--headless=new")
        opts.add_experimental_option("excludeSwitches", ["enable-automation", "enable-logging"])
        opts.add_experimental_option("useAutomationExtension", False)

        bname = "brave" if brave else "chrome"

        # ✅ KEY FIX: Existing profile load karo
        profile_path = find_profile_path(bname)
        if profile_path:
            opts.add_argument(f"--user-data-dir={profile_path}")
            opts.add_argument("--profile-directory=Default")
            log.info(f"{'🦁 Brave' if brave else '🌐 Chrome'}: Existing profile load ho raha hai")
        else:
            log.warning(f"{'🦁 Brave' if brave else '🌐 Chrome'}: Profile nahi mila")

        if brave:
            brave_paths = [
                r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe",
                r"C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe",
            ]
            for p in brave_paths:
                if os.path.exists(p):
                    opts.binary_location = p
                    break

        if not brave:
            try:
                from platforms.browser_manager import find_chrome_binary
                cbin = find_chrome_binary()
                if cbin and os.path.exists(cbin):
                    opts.binary_location = cbin
            except Exception:
                pass

        def _launch_chrome_opts(o):
            # Strategy 1: Selenium 4 built-in manager (fast, no rate limits)
            try:
                return webdriver.Chrome(options=o)
            except Exception:
                pass
            # Strategy 2: ChromeDriverManager
            try:
                service = ChromeService(ChromeDriverManager().install())
                return webdriver.Chrome(service=service, options=o)
            except Exception:
                pass
            # Strategy 3: Standard ChromeService
            return webdriver.Chrome(service=ChromeService(), options=o)

        try:
            d = _launch_chrome_opts(opts)
            name = "🦁 Brave" if brave else "🌐 Chrome"
            log.info(f"{name} launched ✅")
            return _patch(d)
        except Exception as e:
            err_msg = str(e).lower()
            if any(k in err_msg for k in ["user data directory is already in use", "cannot create default profile directory", "session not created"]):
                log.warning(f"{'Brave' if brave else 'Chrome'} profile locked / already open — fresh isolated session try kar raha hoon...")
                import tempfile
                isolated_dir = tempfile.mkdtemp(prefix="jobbot_chrome_iso_")
                opts2 = ChromeOptions()
                for a in common_args:
                    opts2.add_argument(a)
                opts2.add_argument(f"--user-data-dir={isolated_dir}")
                opts2.add_experimental_option("excludeSwitches", ["enable-automation", "enable-logging"])
                opts2.add_experimental_option("useAutomationExtension", False)
                if opts.binary_location:
                    opts2.binary_location = opts.binary_location
                d2 = _launch_chrome_opts(opts2)
                return _patch(d2)
            raise

    try:
        from platforms.browser_manager import get_default_browser
        detected_default = get_default_browser()
    except Exception:
        detected_default = "chrome"

    browser_map = {
        "chrome": lambda: try_chrome(False),
        "edge": try_edge,
        "brave": lambda: try_chrome(True),
    }

    if browser == "auto":
        primary = detected_default if detected_default in browser_map else "chrome"
        order = [browser_map[primary]] + [browser_map[k] for k in ["chrome", "edge", "brave"] if k != primary]
    else:
        order = {
            "edge":   [try_edge],
            "chrome": [lambda: try_chrome(False)],
            "brave":  [lambda: try_chrome(True)],
        }.get(browser, [browser_map.get(detected_default, try_edge)])

    for fn in order:
        try:
            return fn()
        except Exception as e:
            log.warning(f"Browser launch failed ({browser}): {e} — next try...")

    raise RuntimeError("❌ Koi bhi browser launch nahi hua! Edge/Chrome/Brave install karo.")


# ══════════════════════════════════════════════════════════════
#  LINKEDIN BOT  (Fixed Login + Cookie Session)
# ══════════════════════════════════════════════════════════════

def linkedin_bot():
    log.info("═══ LinkedIn Bot Starting ═══")
    driver = make_driver()
    applied = 0

    try:
        # ── Login Check: Profile se already logged in hoga ───
        # Browser apna existing profile use karta hai (make_driver mein set hai)
        # Isliye LinkedIn pehle se logged in hona chahiye
        logged_in = False

        log.info("LinkedIn: Feed check kar raha hoon...")
        try:
            driver.get("https://www.linkedin.com/feed/")
            human_delay(5, 8)
        except Exception:
            pass

        cur = driver.current_url
        log.info(f"LinkedIn: Current URL = {cur}")

        if any(x in cur for x in ["feed", "mynetwork", "jobs/", "messaging"]):
            logged_in = True
            log.info("LinkedIn: ✅ Already logged in via browser profile!")

        elif any(x in cur for x in ["login", "authwall", "checkpoint", "uas/authenticate"]):
            # Profile mein login nahi tha — manually karna padega
            print("")
            print("="*65)
            print("  ⚠️  LINKEDIN: Automatically login nahi hua!")
            print("  → Browser window mein LinkedIn manually login karo")
            print(f"  → {CONFIG['manual_login_wait']} seconds diye ja rahe hain")
            print("="*65)
            print("")
            log.warning(f"LinkedIn: Manual login required — {CONFIG['manual_login_wait']}s wait...")
            time.sleep(CONFIG["manual_login_wait"])

            try:
                driver.get("https://www.linkedin.com/feed/")
                time.sleep(6)
            except Exception:
                pass

            if any(x in driver.current_url for x in ["feed", "mynetwork", "jobs/"]):
                logged_in = True
                log.info("LinkedIn: ✅ Manual login successful!")
            else:
                log.error(f"LinkedIn: Login nahi hua. URL: {driver.current_url}")
                try:
                    driver.quit()
                except Exception:
                    pass
                return 0
        else:
            # Unexpected page — ek aur try
            log.warning(f"LinkedIn: Unexpected URL: {cur} — dobara try kar raha hoon...")
            time.sleep(5)
            try:
                driver.get("https://www.linkedin.com/feed/")
                time.sleep(6)
            except Exception:
                pass
            if any(x in driver.current_url for x in ["feed", "mynetwork"]):
                logged_in = True
            else:
                log.error("LinkedIn: Login confirm nahi hua — skipping")
                try:
                    driver.quit()
                except Exception:
                    pass
                return 0

        if not logged_in:
            try:
                driver.quit()
            except Exception:
                pass
            return 0

        # ── Step 3: Apply to jobs ──────────────────────────────
        query = CONFIG["job_title"].replace(" ", "%20")
        loc   = CONFIG["location"].replace(" ", "%20")

        # Easy Apply filter + Last 24 hours + Most recent
        url = (
            f"https://www.linkedin.com/jobs/search/"
            f"?keywords={query}"
            f"&location={loc}"
            f"&f_AL=true"         # Easy Apply only
            f"&f_TPR=r86400"      # Last 24 hours
            f"&sortBy=DD"         # Most recent
        )
        driver.get(url)
        human_delay(4, 7)

        page = 0
        while applied < CONFIG["max_per_platform"]:
            page += 1
            log.info(f"LinkedIn: 📄 Page {page} | Applied so far: {applied}/{CONFIG['max_per_platform']}")

            try:
                # Scroll to load all cards
                driver.execute_script("window.scrollTo(0, 300);")
                time.sleep(2)
                job_cards = driver.find_elements(
                    By.CSS_SELECTOR,
                    ".jobs-search__results-list li, "
                    ".scaffold-layout__list-item, "
                    "[data-job-id]"
                )
            except Exception:
                job_cards = []

            if not job_cards:
                log.info("LinkedIn: No job cards found")
                break

            log.info(f"LinkedIn: Found {len(job_cards)} cards on page {page}")

            for idx, card in enumerate(job_cards):
                if applied >= CONFIG["max_per_platform"]:
                    break
                try:
                    safe_click(driver, card)
                    human_delay(2, 4)

                    # Get job details
                    job_title, company = "Unknown", "Unknown"
                    try:
                        job_title = driver.find_element(
                            By.CSS_SELECTOR,
                            ".job-details-jobs-unified-top-card__job-title h1, "
                            ".jobs-unified-top-card__job-title, "
                            "h1.t-24"
                        ).text.strip()
                    except Exception:
                        pass
                    try:
                        company = driver.find_element(
                            By.CSS_SELECTOR,
                            ".job-details-jobs-unified-top-card__company-name a, "
                            ".jobs-unified-top-card__company-name, "
                            ".topcard__org-name-link"
                        ).text.strip()
                    except Exception:
                        pass

                    # Job ID from URL
                    job_id = ""
                    if "currentJobId=" in driver.current_url:
                        job_id = driver.current_url.split("currentJobId=")[-1].split("&")[0]
                    elif "/jobs/view/" in driver.current_url:
                        job_id = driver.current_url.split("/jobs/view/")[-1].split("/")[0]
                    if not job_id:
                        job_id = f"li_{job_title}_{company}".replace(" ", "_")

                    if job_id in applied_jobs:
                        log.info(f"LinkedIn: SKIP (already applied) — {job_title} @ {company}")
                        continue

                    # Find Easy Apply button
                    apply_btn = None
                    for sel in [
                        "button.jobs-apply-button[aria-label*='Easy Apply']",
                        ".jobs-s-apply button",
                        "button[aria-label*='Easy Apply']",
                        ".jobs-apply-button",
                    ]:
                        try:
                            apply_btn = driver.find_element(By.CSS_SELECTOR, sel)
                            if "Easy Apply" in (apply_btn.text + apply_btn.get_attribute("aria-label") or ""):
                                break
                        except Exception:
                            pass

                    if not apply_btn:
                        log.info(f"LinkedIn: No Easy Apply — {job_title} @ {company}")
                        continue

                    safe_click(driver, apply_btn)
                    human_delay(2, 4)

                    # Multi-step form handler
                    submitted = False
                    steps_done = 0
                    max_steps = 15

                    while steps_done < max_steps and not submitted:
                        human_delay(1.5, 3)

                        # Fill phone
                        try:
                            for pi in driver.find_elements(By.CSS_SELECTOR, "input[id*='phoneNumber'], input[name*='phone']"):
                                val = pi.get_attribute("value") or ""
                                if not val.strip():
                                    type_human(pi, CONFIG["phone"])
                        except Exception:
                            pass

                        # Fill text inputs based on label
                        try:
                            for inp in driver.find_elements(
                                By.CSS_SELECTOR,
                                ".jobs-easy-apply-form-section__grouping input[type=text], "
                                ".jobs-easy-apply-form-element input[type=text]"
                            ):
                                val = inp.get_attribute("value") or ""
                                if val.strip():
                                    continue
                                label_text = ""
                                try:
                                    label_id = inp.get_attribute("id")
                                    if label_id:
                                        lbl = driver.find_element(By.CSS_SELECTOR, f"label[for='{label_id}']")
                                        label_text = lbl.text.lower()
                                except Exception:
                                    pass
                                try:
                                    label_text = inp.find_element(By.XPATH, "ancestor::div[1]/label").text.lower()
                                except Exception:
                                    pass

                                if any(k in label_text for k in ["year", "experience", "exp"]):
                                    type_human(inp, CONFIG["experience"])
                                elif any(k in label_text for k in ["city", "location"]):
                                    type_human(inp, CONFIG["location"])
                                elif any(k in label_text for k in ["salary", "ctc", "expected"]):
                                    type_human(inp, CONFIG["salary"])
                                elif any(k in label_text for k in ["notice", "joining"]):
                                    type_human(inp, CONFIG["notice_period"])
                        except Exception:
                            pass

                        # Upload resume
                        try:
                            fi = driver.find_element(By.CSS_SELECTOR, "input[type=file]")
                            if os.path.exists(CONFIG["resume_path"]):
                                fi.send_keys(CONFIG["resume_path"])
                                human_delay(2, 4)
                        except Exception:
                            pass

                        # Cover letter / additional info
                        try:
                            for ta in driver.find_elements(By.CSS_SELECTOR, "textarea"):
                                if not (ta.get_attribute("value") or "").strip():
                                    type_human(ta, CONFIG["cover_note"], delay=0.03)
                        except Exception:
                            pass

                        # Try Submit
                        try:
                            submit_btn = driver.find_element(
                                By.CSS_SELECTOR,
                                "button[aria-label='Submit application']"
                            )
                            safe_click(driver, submit_btn)
                            human_delay(2, 3)
                            applied += 1
                            submitted = True
                            log.info(f"LinkedIn: ✅ Applied ({applied}) — {job_title} @ {company}")
                            save_applied("LinkedIn", job_title, company, job_id, driver.current_url)
                            # Dismiss confirmation
                            try:
                                driver.find_element(
                                    By.CSS_SELECTOR,
                                    "button[aria-label='Dismiss'], button[aria-label='Done']"
                                ).click()
                            except Exception:
                                pass
                            break
                        except NoSuchElementException:
                            pass

                        # Try Next / Review
                        next_found = False
                        for sel in [
                            "button[aria-label='Continue to next step']",
                            "button[aria-label='Review']",
                            "button[aria-label='Review your application']",
                            "button[aria-label='Next']",
                        ]:
                            try:
                                nb = driver.find_element(By.CSS_SELECTOR, sel)
                                safe_click(driver, nb)
                                steps_done += 1
                                next_found = True
                                human_delay(1, 2)
                                break
                            except NoSuchElementException:
                                pass

                        if not next_found and not submitted:
                            log.warning(f"LinkedIn: Stuck at step {steps_done} — {job_title}")
                            try:
                                driver.find_element(By.CSS_SELECTOR, "button[aria-label='Dismiss']").click()
                            except Exception:
                                pass
                            break

                    human_delay(CONFIG["delay_min"], CONFIG["delay_max"])

                except Exception as e:
                    log.error(f"LinkedIn: Card {idx} error — {e}")
                    human_delay(3, 6)

            # Next page
            try:
                next_page_btn = driver.find_element(
                    By.CSS_SELECTOR, f"button[aria-label='Page {page+1}']"
                )
                safe_click(driver, next_page_btn)
                human_delay(4, 7)
            except Exception:
                log.info("LinkedIn: No more pages")
                break

    except Exception as e:
        log.error(f"LinkedIn: Fatal — {e}")
    finally:
        driver.quit()
        log.info(f"LinkedIn DONE ✅ — Total applied: {applied}")
    return applied


# ══════════════════════════════════════════════════════════════
#  NAUKRI BOT
# ══════════════════════════════════════════════════════════════

def naukri_bot():
    log.info("═══ Naukri Bot Starting ═══")
    driver = make_driver()
    applied = 0

    try:
        # Profile se already logged in check karo
        logged_in = False
        log.info("Naukri: Login check kar raha hoon...")
        try:
            driver.get("https://www.naukri.com/mnjuser/homepage")
            human_delay(5, 7)
        except Exception:
            pass

        cur = driver.current_url
        log.info(f"Naukri: Current URL = {cur}")

        if "mnjuser" in cur or "homepage" in cur:
            logged_in = True
            log.info("Naukri: ✅ Already logged in via browser profile!")
        else:
            # Try normal login
            try:
                driver.get("https://www.naukri.com/nlogin/login")
                human_delay(4, 6)
                wait_for(driver, By.ID, "usernameField", timeout=15).send_keys(CONFIG["naukri_email"])
                driver.find_element(By.ID, "passwordField").send_keys(CONFIG["naukri_password"])
                driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()
                human_delay(5, 8)
                if "mnjuser" in driver.current_url or "naukri.com" in driver.current_url:
                    logged_in = True
                    log.info("Naukri: ✅ Logged in via credentials")
            except Exception as e:
                log.error(f"Naukri: Login failed — {e}")
                try:
                    driver.quit()
                except Exception:
                    pass
                return 0

        if not logged_in:
            log.error("Naukri: Login confirm nahi hua — skipping")
            try:
                driver.quit()
            except Exception:
                pass
            return 0

        query = CONFIG["job_title"].replace(" ", "-")
        loc   = CONFIG["location"].lower().replace(" ", "-")
        driver.get(
            f"https://www.naukri.com/{query}-jobs-in-{loc}"
            f"?experience={CONFIG['experience']}"
            f"&jobAge=1"
        )
        human_delay(4, 7)

        job_links = []
        try:
            cards = driver.find_elements(
                By.CSS_SELECTOR,
                "article.jobTuple, .job-container, .srp-jobtuple-wrapper, [data-job-id]"
            )
            for c in cards[:CONFIG["max_per_platform"] + 10]:
                try:
                    a = c.find_element(By.CSS_SELECTOR, "a.title, a.jobTitle, .row1 a, a[title]")
                    href = a.get_attribute("href")
                    if href:
                        job_links.append((href, a.text.strip()))
                except Exception:
                    pass
        except Exception:
            log.warning("Naukri: Could not find job cards")

        log.info(f"Naukri: Found {len(job_links)} jobs")

        for href, title in job_links:
            if applied >= CONFIG["max_per_platform"]:
                break
            if not href:
                continue
            job_id = href.split("?")[0].rstrip("/").split("/")[-1]
            if job_id in applied_jobs:
                log.info(f"Naukri: SKIP — {title}")
                continue
            try:
                driver.get(href)
                human_delay(4, 7)
                company = "Unknown"
                try:
                    company = driver.find_element(
                        By.CSS_SELECTOR,
                        ".jd-header-comp-name a, .company-name, [class*='companyName']"
                    ).text.strip()
                except Exception:
                    pass

                apply_btn = None
                for sel in [
                    "#apply-button", ".apply-button button",
                    "button[id*=apply]", ".styles_apply-button__N5EoV",
                    "button.styles_jhc__apply-btn__C2tUC"
                ]:
                    try:
                        apply_btn = driver.find_element(By.CSS_SELECTOR, sel)
                        break
                    except Exception:
                        pass

                if not apply_btn:
                    log.info(f"Naukri: No apply btn — {title}")
                    continue

                safe_click(driver, apply_btn)
                human_delay(3, 6)

                # Handle modal if present
                for sel in [
                    ".naukri-modal button.save",
                    ".apply-widget__btn-submit",
                    "button[class*='submit']"
                ]:
                    try:
                        driver.find_element(By.CSS_SELECTOR, sel).click()
                        time.sleep(2)
                        break
                    except Exception:
                        pass

                applied += 1
                log.info(f"Naukri: ✅ Applied ({applied}) — {title} @ {company}")
                save_applied("Naukri", title, company, job_id, href)
                human_delay(CONFIG["delay_min"], CONFIG["delay_max"])

            except Exception as e:
                log.error(f"Naukri: Error — {e}")
                human_delay(4, 7)

    except Exception as e:
        log.error(f"Naukri: Fatal — {e}")
    finally:
        driver.quit()
        log.info(f"Naukri DONE ✅ — Total applied: {applied}")
    return applied


# ══════════════════════════════════════════════════════════════
#  INDEED BOT
# ══════════════════════════════════════════════════════════════

def indeed_bot():
    log.info("═══ Indeed Bot Starting ═══")
    driver = make_driver()
    applied = 0

    try:
        logged_in = False
        log.info("Indeed: Login check kar raha hoon...")
        try:
            driver.get("https://in.indeed.com/")
            human_delay(4, 6)
        except Exception:
            pass

        # Check if logged in via profile
        try:
            driver.find_element(By.CSS_SELECTOR, ".gnav-LoggedInSection, [data-testid='header-user-menu'], .user-account-nav")
            logged_in = True
            log.info("Indeed: ✅ Already logged in via browser profile!")
        except Exception:
            pass

        if not logged_in:
            # Try credentials login
            try:
                driver.get("https://in.indeed.com/account/login")
                human_delay(4, 6)
                email_f = wait_for(driver, By.CSS_SELECTOR, "input[type=email], #ifl-InputFormField-3", timeout=15)
                type_human(email_f, CONFIG["indeed_email"])
                driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()
                human_delay(3, 5)
                try:
                    pwd = driver.find_element(By.CSS_SELECTOR, "input[type=password]")
                    type_human(pwd, CONFIG["indeed_password"])
                    driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()
                except Exception:
                    pass
                human_delay(5, 8)
                logged_in = True
                log.info("Indeed: ✅ Logged in via credentials")
            except Exception as e:
                log.warning(f"Indeed: Login issue — {e}")
                time.sleep(CONFIG["manual_login_wait"])
                logged_in = True  # Continue anyway, some pages work without login

        query = CONFIG["job_title"].replace(" ", "+")
        loc   = CONFIG["location"].replace(" ", "+")
        driver.get(
            f"https://in.indeed.com/jobs?q={query}&l={loc}"
            f"&fromage=1&sort=date"
            f"&iafilter=1"  # Indeed Apply filter
        )
        human_delay(4, 7)

        processed = 0
        while applied < CONFIG["max_per_platform"]:
            try:
                cards = driver.find_elements(By.CSS_SELECTOR, ".job_seen_beacon, .resultContent, [data-jk]")
            except Exception:
                cards = []
            if not cards:
                break

            for card in cards:
                if applied >= CONFIG["max_per_platform"]:
                    break
                try:
                    safe_click(driver, card)
                    human_delay(2, 4)

                    title, company = "Unknown", "Unknown"
                    try:
                        title   = driver.find_element(By.CSS_SELECTOR, ".jobsearch-JobInfoHeader-title span, h1.jobsearch-JobInfoHeader-title").text
                        company = driver.find_element(By.CSS_SELECTOR, "[data-company-name], .jobsearch-CompanyInfoContainer").text
                    except Exception:
                        pass

                    job_id = ""
                    if "vjk=" in driver.current_url:
                        job_id = driver.current_url.split("vjk=")[-1].split("&")[0]
                    if not job_id:
                        job_id = f"indeed_{title}_{company}".replace(" ", "_")

                    if job_id in applied_jobs:
                        continue

                    apply_btn = None
                    for sel in ["#indeedApplyButton", ".indeed-apply-button", "[data-indeed-apply-jobkey]"]:
                        try:
                            apply_btn = driver.find_element(By.CSS_SELECTOR, sel)
                            break
                        except Exception:
                            pass

                    if not apply_btn:
                        log.info(f"Indeed: No Indeed Apply — {title}")
                        continue

                    safe_click(driver, apply_btn)
                    human_delay(3, 5)

                    # Multi-step apply
                    for step in range(8):
                        human_delay(1.5, 3)
                        # Fill name
                        try:
                            nf = driver.find_element(By.CSS_SELECTOR, "input[name*='applicant.name'], input[name='name']")
                            if not nf.get_attribute("value"):
                                type_human(nf, CONFIG["name"])
                        except Exception:
                            pass
                        # Fill phone
                        try:
                            pf = driver.find_element(By.CSS_SELECTOR, "input[name*='phone'], input[type=tel]")
                            if not pf.get_attribute("value"):
                                type_human(pf, CONFIG["phone"])
                        except Exception:
                            pass
                        # Upload resume
                        try:
                            fi = driver.find_element(By.CSS_SELECTOR, "input[type=file]")
                            if os.path.exists(CONFIG["resume_path"]):
                                fi.send_keys(CONFIG["resume_path"])
                                human_delay(2, 4)
                        except Exception:
                            pass
                        # Submit
                        submitted = False
                        for sub_sel in [
                            "button[data-testid='IndeedApplyButton-SubmitBtn']",
                            "button[aria-label*='Submit']",
                            "button[type=submit]"
                        ]:
                            try:
                                sb = driver.find_element(By.CSS_SELECTOR, sub_sel)
                                safe_click(driver, sb)
                                applied += 1
                                log.info(f"Indeed: ✅ Applied ({applied}) — {title} @ {company}")
                                save_applied("Indeed", title, company, job_id, driver.current_url)
                                submitted = True
                                break
                            except Exception:
                                pass
                        if submitted:
                            break
                        # Continue
                        for cont_sel in [
                            "button[data-testid='IndeedApplyButton-ContinueBtn']",
                            "button[aria-label*='Continue']",
                            "button[aria-label*='Next']"
                        ]:
                            try:
                                driver.find_element(By.CSS_SELECTOR, cont_sel).click()
                                break
                            except Exception:
                                pass

                    processed += 1
                    human_delay(CONFIG["delay_min"], CONFIG["delay_max"])

                except Exception as e:
                    log.error(f"Indeed: Card error — {e}")

            try:
                next_btn = driver.find_element(By.CSS_SELECTOR, "a[data-testid='pagination-page-next']")
                safe_click(driver, next_btn)
                human_delay(4, 7)
            except Exception:
                break

    except Exception as e:
        log.error(f"Indeed: Fatal — {e}")
    finally:
        driver.quit()
        log.info(f"Indeed DONE ✅ — Total applied: {applied}")
    return applied


# ══════════════════════════════════════════════════════════════
#  GLASSDOOR BOT
# ══════════════════════════════════════════════════════════════

def glassdoor_bot():
    log.info("═══ Glassdoor Bot Starting ═══")
    driver = make_driver()
    applied = 0

    try:
        logged_in = False
        cookie_loaded = load_cookies(driver, "glassdoor", "https://www.glassdoor.co.in")
        if cookie_loaded:
            driver.get("https://www.glassdoor.co.in/member/home/index.htm")
            time.sleep(4)
            if "member" in driver.current_url:
                logged_in = True

        if not logged_in:
            driver.get("https://www.glassdoor.co.in/profile/login_input.htm")
            human_delay(3, 5)
            try:
                driver.find_element(By.ID, "userEmail").send_keys(CONFIG["glassdoor_email"])
                driver.find_element(By.ID, "userPassword").send_keys(CONFIG["glassdoor_password"])
                driver.find_element(By.CSS_SELECTOR, "button[type=submit], #loginBtn").click()
                human_delay(5, 8)
                save_cookies(driver, "glassdoor")
                logged_in = True
                log.info("Glassdoor: ✅ Logged in")
            except Exception as e:
                log.warning(f"Glassdoor: Login issue — {e}")
                time.sleep(CONFIG["manual_login_wait"])

        query = CONFIG["job_title"].replace(" ", "-")
        loc   = CONFIG["location"].replace(" ", "-")
        driver.get(
            f"https://www.glassdoor.co.in/Job/{loc}-{query}-jobs-SRCH_IL.0,"
            f"{len(loc)}_IC1142177_KO{len(loc)+1},{len(loc)+1+len(query)}.htm"
            f"?sortBy=date_desc"
        )
        human_delay(5, 8)

        cards = driver.find_elements(
            By.CSS_SELECTOR,
            ".react-job-listing, li.JobsList_jobListItem__JBBUV, [data-test='jobListing']"
        )
        log.info(f"Glassdoor: Found {len(cards)} jobs")

        for card in cards[:CONFIG["max_per_platform"] + 5]:
            if applied >= CONFIG["max_per_platform"]:
                break
            try:
                safe_click(driver, card)
                human_delay(3, 5)

                title, company = "Unknown", "Unknown"
                try:
                    title   = driver.find_element(By.CSS_SELECTOR, ".JobDetails_jobTitle__Rw_gn, [data-test='job-title']").text
                    company = driver.find_element(By.CSS_SELECTOR, ".EmployerProfile_employerName__OhSuk, [data-test='employer-name']").text
                except Exception:
                    pass

                job_id = driver.current_url.split("?")[0].rstrip("/").split("/")[-1]
                if job_id in applied_jobs:
                    continue

                try:
                    apply_btn = driver.find_element(
                        By.CSS_SELECTOR,
                        "button[data-test='applyButton'], .apply-btn, [data-test='apply-button']"
                    )
                    safe_click(driver, apply_btn)
                    human_delay(3, 5)

                    # If new tab opened, close it (external apply)
                    if len(driver.window_handles) > 1:
                        driver.switch_to.window(driver.window_handles[-1])
                        time.sleep(3)
                        driver.close()
                        driver.switch_to.window(driver.window_handles[0])

                    applied += 1
                    log.info(f"Glassdoor: ✅ Applied ({applied}) — {title} @ {company}")
                    save_applied("Glassdoor", title, company, job_id, driver.current_url)

                except NoSuchElementException:
                    log.info(f"Glassdoor: No apply btn — {title}")

                human_delay(CONFIG["delay_min"], CONFIG["delay_max"])

            except Exception as e:
                log.error(f"Glassdoor: Card error — {e}")

    except Exception as e:
        log.error(f"Glassdoor: Fatal — {e}")
    finally:
        driver.quit()
        log.info(f"Glassdoor DONE ✅ — Total applied: {applied}")
    return applied


# ══════════════════════════════════════════════════════════════
#  INTERNSHALA BOT  (New!)
# ══════════════════════════════════════════════════════════════

def internshala_bot():
    log.info("═══ Internshala Bot Starting ═══")
    driver = make_driver()
    applied = 0

    try:
        logged_in = False
        cookie_loaded = load_cookies(driver, "internshala", "https://internshala.com")
        if cookie_loaded:
            driver.get("https://internshala.com/student/dashboard")
            time.sleep(4)
            if "dashboard" in driver.current_url:
                logged_in = True

        if not logged_in:
            driver.get("https://internshala.com/login/student")
            human_delay(3, 5)
            try:
                email_f = wait_for(driver, By.ID, "email", timeout=15)
                type_human(email_f, CONFIG["internshala_email"])
                pwd_f = driver.find_element(By.ID, "password")
                type_human(pwd_f, CONFIG["internshala_password"])
                driver.find_element(By.ID, "login_submit").click()
                human_delay(5, 8)
                save_cookies(driver, "internshala")
                logged_in = True
                log.info("Internshala: ✅ Logged in")
            except Exception as e:
                log.error(f"Internshala: Login failed — {e}")
                driver.quit()
                return 0

        # Search fresher jobs
        query = CONFIG["job_title"].replace(" ", "%20")
        driver.get(
            f"https://internshala.com/jobs/{query}-jobs-for-freshers/"
        )
        human_delay(4, 7)

        job_links = []
        try:
            for card in driver.find_elements(By.CSS_SELECTOR, ".job-internship-card, .individual_internship"):
                try:
                    a = card.find_element(By.CSS_SELECTOR, "a.job-title-href, a[href*='/jobs/detail']")
                    href = a.get_attribute("href")
                    title_text = a.text.strip()
                    if href:
                        job_links.append((href, title_text))
                except Exception:
                    pass
        except Exception:
            pass

        log.info(f"Internshala: Found {len(job_links)} jobs")

        for href, title in job_links:
            if applied >= CONFIG["max_per_platform"]:
                break
            job_id = href.rstrip("/").split("/")[-1]
            if job_id in applied_jobs:
                continue
            try:
                driver.get(href)
                human_delay(3, 6)

                company = "Unknown"
                try:
                    company = driver.find_element(
                        By.CSS_SELECTOR, "#company_name, .company_name a, .company-name"
                    ).text.strip()
                except Exception:
                    pass

                apply_btn = None
                for sel in ["#apply_now_btn", ".btn-primary.apply_button", "button[id*=apply]", ".apply-btn"]:
                    try:
                        apply_btn = driver.find_element(By.CSS_SELECTOR, sel)
                        break
                    except Exception:
                        pass

                if not apply_btn:
                    log.info(f"Internshala: No apply btn — {title}")
                    continue

                safe_click(driver, apply_btn)
                human_delay(3, 5)

                # Fill cover letter if required
                try:
                    cl = driver.find_element(By.CSS_SELECTOR, "textarea#cover_letter, textarea[name*=cover]")
                    if not cl.get_attribute("value"):
                        type_human(cl, CONFIG["cover_note"], delay=0.03)
                except Exception:
                    pass

                # Submit
                for sub_sel in [
                    "#submit", "button[type=submit]", ".btn-submit",
                    "input[type=submit]", "button.submit_button"
                ]:
                    try:
                        driver.find_element(By.CSS_SELECTOR, sub_sel).click()
                        human_delay(2, 4)
                        applied += 1
                        log.info(f"Internshala: ✅ Applied ({applied}) — {title} @ {company}")
                        save_applied("Internshala", title, company, job_id, href)
                        break
                    except Exception:
                        pass

                human_delay(CONFIG["delay_min"], CONFIG["delay_max"])

            except Exception as e:
                log.error(f"Internshala: Error — {e}")
                human_delay(4, 7)

    except Exception as e:
        log.error(f"Internshala: Fatal — {e}")
    finally:
        driver.quit()
        log.info(f"Internshala DONE ✅ — Total applied: {applied}")
    return applied


# ══════════════════════════════════════════════════════════════
#  SHINE BOT  (New!)
# ══════════════════════════════════════════════════════════════

def shine_bot():
    log.info("═══ Shine Bot Starting ═══")
    driver = make_driver()
    applied = 0

    try:
        logged_in = False
        cookie_loaded = load_cookies(driver, "shine", "https://www.shine.com")
        if cookie_loaded:
            driver.get("https://www.shine.com/job-search/")
            time.sleep(4)
            try:
                driver.find_element(By.CSS_SELECTOR, ".user-name, .header-profile")
                logged_in = True
            except Exception:
                pass

        if not logged_in:
            driver.get("https://www.shine.com/login/")
            human_delay(3, 5)
            try:
                driver.find_element(By.ID, "id_username").send_keys(CONFIG["shine_email"])
                driver.find_element(By.ID, "id_password").send_keys(CONFIG["shine_password"])
                driver.find_element(By.CSS_SELECTOR, "button[type=submit], .login-btn").click()
                human_delay(5, 8)
                save_cookies(driver, "shine")
                logged_in = True
                log.info("Shine: ✅ Logged in")
            except Exception as e:
                log.error(f"Shine: Login failed — {e}")
                driver.quit()
                return 0

        query = CONFIG["job_title"].replace(" ", "-").lower()
        loc   = CONFIG["location"].lower()
        driver.get(f"https://www.shine.com/job-search/{query}-jobs-in-{loc}/")
        human_delay(4, 7)

        job_links = []
        try:
            for card in driver.find_elements(By.CSS_SELECTOR, ".jobCard, .job-list-item, article.job-card"):
                try:
                    a = card.find_element(By.CSS_SELECTOR, "a.job-title, h2 a, .title a")
                    href = a.get_attribute("href")
                    if href:
                        job_links.append((href, a.text.strip()))
                except Exception:
                    pass
        except Exception:
            pass

        log.info(f"Shine: Found {len(job_links)} jobs")

        for href, title in job_links:
            if applied >= CONFIG["max_per_platform"]:
                break
            job_id = href.rstrip("/").split("/")[-1]
            if job_id in applied_jobs:
                continue
            try:
                driver.get(href)
                human_delay(3, 6)
                company = "Unknown"
                try:
                    company = driver.find_element(By.CSS_SELECTOR, ".company-name, h2.company a").text.strip()
                except Exception:
                    pass

                for sel in [".apply-btn", "a.apply", "button.apply-btn", "#applyBtn"]:
                    try:
                        btn = driver.find_element(By.CSS_SELECTOR, sel)
                        safe_click(driver, btn)
                        human_delay(3, 5)
                        applied += 1
                        log.info(f"Shine: ✅ Applied ({applied}) — {title} @ {company}")
                        save_applied("Shine", title, company, job_id, href)
                        break
                    except Exception:
                        pass

                human_delay(CONFIG["delay_min"], CONFIG["delay_max"])
            except Exception as e:
                log.error(f"Shine: Error — {e}")

    except Exception as e:
        log.error(f"Shine: Fatal — {e}")
    finally:
        driver.quit()
        log.info(f"Shine DONE ✅ — Total applied: {applied}")
    return applied


# ══════════════════════════════════════════════════════════════
#  FOUNDIT (Monster India) BOT  (New!)
# ══════════════════════════════════════════════════════════════

def foundit_bot():
    log.info("═══ Foundit (Monster) Bot Starting ═══")
    driver = make_driver()
    applied = 0

    try:
        logged_in = False
        cookie_loaded = load_cookies(driver, "foundit", "https://www.foundit.in")
        if cookie_loaded:
            driver.get("https://www.foundit.in/")
            time.sleep(4)
            try:
                driver.find_element(By.CSS_SELECTOR, ".userLoggedIn, .profile-icon")
                logged_in = True
            except Exception:
                pass

        if not logged_in:
            driver.get("https://www.foundit.in/login")
            human_delay(3, 5)
            try:
                driver.find_element(By.CSS_SELECTOR, "input[type=email], #email").send_keys(CONFIG["foundit_email"])
                driver.find_element(By.CSS_SELECTOR, "input[type=password]").send_keys(CONFIG["foundit_password"])
                driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()
                human_delay(5, 8)
                save_cookies(driver, "foundit")
                logged_in = True
                log.info("Foundit: ✅ Logged in")
            except Exception as e:
                log.error(f"Foundit: Login failed — {e}")
                driver.quit()
                return 0

        query = CONFIG["job_title"].replace(" ", "+")
        loc   = CONFIG["location"].replace(" ", "+")
        driver.get(
            f"https://www.foundit.in/srp/results"
            f"?query={query}&location={loc}"
            f"&experienceRanges=0~1|1~2"
            f"&sort=1"
        )
        human_delay(4, 7)

        job_links = []
        try:
            for card in driver.find_elements(By.CSS_SELECTOR, ".cardContainer, .jobCard, .job-card-wrapper"):
                try:
                    a = card.find_element(By.CSS_SELECTOR, "a.jobTitle, h3 a, .title a")
                    href = a.get_attribute("href")
                    if href:
                        job_links.append((href, a.text.strip()))
                except Exception:
                    pass
        except Exception:
            pass

        log.info(f"Foundit: Found {len(job_links)} jobs")

        for href, title in job_links:
            if applied >= CONFIG["max_per_platform"]:
                break
            job_id = href.rstrip("/").split("/")[-1].split("?")[0]
            if job_id in applied_jobs:
                continue
            try:
                driver.get(href)
                human_delay(3, 6)
                company = "Unknown"
                try:
                    company = driver.find_element(By.CSS_SELECTOR, ".companyName, h2.company, .company-name").text.strip()
                except Exception:
                    pass

                for sel in [".applyButton", "button.apply", "#applyBtn", "a.apply-button"]:
                    try:
                        btn = driver.find_element(By.CSS_SELECTOR, sel)
                        safe_click(driver, btn)
                        human_delay(3, 5)
                        applied += 1
                        log.info(f"Foundit: ✅ Applied ({applied}) — {title} @ {company}")
                        save_applied("Foundit", title, company, job_id, href)
                        break
                    except Exception:
                        pass

                human_delay(CONFIG["delay_min"], CONFIG["delay_max"])
            except Exception as e:
                log.error(f"Foundit: Error — {e}")

    except Exception as e:
        log.error(f"Foundit: Fatal — {e}")
    finally:
        driver.quit()
        log.info(f"Foundit DONE ✅ — Total applied: {applied}")
    return applied


# ══════════════════════════════════════════════════════════════
#  TIMESJOBS BOT  (New!)
# ══════════════════════════════════════════════════════════════

def timesjobs_bot():
    log.info("═══ TimesJobs Bot Starting ═══")
    driver = make_driver()
    applied = 0

    try:
        logged_in = False
        cookie_loaded = load_cookies(driver, "timesjobs", "https://www.timesjobs.com")
        if cookie_loaded:
            driver.get("https://www.timesjobs.com/")
            time.sleep(4)
            try:
                driver.find_element(By.CSS_SELECTOR, ".user-name, .loggedInUser")
                logged_in = True
            except Exception:
                pass

        if not logged_in:
            driver.get("https://www.timesjobs.com/candidate/login.html")
            human_delay(3, 5)
            try:
                driver.find_element(By.ID, "loginId").send_keys(CONFIG["timesjobs_email"])
                driver.find_element(By.ID, "loginPwd").send_keys(CONFIG["timesjobs_password"])
                driver.find_element(By.CSS_SELECTOR, "button[type=submit], .login-btn").click()
                human_delay(5, 8)
                save_cookies(driver, "timesjobs")
                logged_in = True
                log.info("TimesJobs: ✅ Logged in")
            except Exception as e:
                log.error(f"TimesJobs: Login failed — {e}")
                driver.quit()
                return 0

        query = CONFIG["job_title"].replace(" ", "%20")
        loc   = CONFIG["location"]
        driver.get(
            f"https://www.timesjobs.com/candidate/job-search.html"
            f"?searchType=personalizedSearch"
            f"&from=submit"
            f"&txtKeywords={query}"
            f"&txtLocation={loc}"
            f"&cboWorkExp1=0"
            f"&cboWorkExp2=1"
        )
        human_delay(4, 7)

        job_links = []
        try:
            for li in driver.find_elements(By.CSS_SELECTOR, "li.clearfix.job-bx, .job-container"):
                try:
                    a = li.find_element(By.CSS_SELECTOR, "h2 a, .posName a")
                    href = a.get_attribute("href")
                    if href:
                        job_links.append((href, a.text.strip()))
                except Exception:
                    pass
        except Exception:
            pass

        log.info(f"TimesJobs: Found {len(job_links)} jobs")

        for href, title in job_links:
            if applied >= CONFIG["max_per_platform"]:
                break
            job_id = href.rstrip("/").split("-")[-1].split(".")[0]
            if job_id in applied_jobs:
                continue
            try:
                driver.get(href)
                human_delay(3, 6)
                company = "Unknown"
                try:
                    company = driver.find_element(By.CSS_SELECTOR, ".jobHiringComp, h2.o-hidden").text.strip()
                except Exception:
                    pass

                for sel in ["#applyLink", ".apply-btn", "a[title*='Apply']", "button.btn-apply"]:
                    try:
                        btn = driver.find_element(By.CSS_SELECTOR, sel)
                        safe_click(driver, btn)
                        human_delay(3, 5)
                        applied += 1
                        log.info(f"TimesJobs: ✅ Applied ({applied}) — {title} @ {company}")
                        save_applied("TimesJobs", title, company, job_id, href)
                        break
                    except Exception:
                        pass

                human_delay(CONFIG["delay_min"], CONFIG["delay_max"])
            except Exception as e:
                log.error(f"TimesJobs: Error — {e}")

    except Exception as e:
        log.error(f"TimesJobs: Fatal — {e}")
    finally:
        driver.quit()
        log.info(f"TimesJobs DONE ✅ — Total applied: {applied}")
    return applied


# ══════════════════════════════════════════════════════════════
#  WELLFOUND (AngelList) BOT  (New!)
# ══════════════════════════════════════════════════════════════

def wellfound_bot():
    log.info("═══ Wellfound (AngelList) Bot Starting ═══")
    driver = make_driver()
    applied = 0

    try:
        logged_in = False
        cookie_loaded = load_cookies(driver, "wellfound", "https://wellfound.com")
        if cookie_loaded:
            driver.get("https://wellfound.com/jobs")
            time.sleep(5)
            if "login" not in driver.current_url:
                logged_in = True

        if not logged_in:
            driver.get("https://wellfound.com/login")
            human_delay(3, 5)
            try:
                driver.find_element(By.CSS_SELECTOR, "input[name=email], input[type=email]").send_keys(CONFIG["wellfound_email"])
                driver.find_element(By.CSS_SELECTOR, "input[name=password], input[type=password]").send_keys(CONFIG["wellfound_password"])
                driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()
                human_delay(5, 8)
                save_cookies(driver, "wellfound")
                logged_in = True
                log.info("Wellfound: ✅ Logged in")
            except Exception as e:
                log.error(f"Wellfound: Login failed — {e}")
                driver.quit()
                return 0

        query = CONFIG["job_title"].replace(" ", "%20")
        loc   = CONFIG["location"].replace(" ", "%20")
        driver.get(
            f"https://wellfound.com/jobs?role={query}&location={loc}"
            f"&experience=0_2"
        )
        human_delay(5, 8)

        job_links = []
        try:
            for card in driver.find_elements(By.CSS_SELECTOR, "[data-test='job-row'], .styles_jobRow__Zy9WP, .job-listing"):
                try:
                    a = card.find_element(By.CSS_SELECTOR, "a[href*='/jobs/']")
                    href = a.get_attribute("href")
                    title_text = ""
                    try:
                        title_text = card.find_element(By.CSS_SELECTOR, "h2, .title, .job-title").text
                    except Exception:
                        title_text = a.text
                    if href:
                        job_links.append((href, title_text.strip()))
                except Exception:
                    pass
        except Exception:
            pass

        log.info(f"Wellfound: Found {len(job_links)} jobs")

        for href, title in job_links:
            if applied >= CONFIG["max_per_platform"]:
                break
            job_id = href.rstrip("/").split("/")[-1]
            if job_id in applied_jobs:
                continue
            try:
                driver.get(href)
                human_delay(4, 7)
                company = "Unknown"
                try:
                    company = driver.find_element(By.CSS_SELECTOR, ".company-name, h1 a, [class*='companyName']").text.strip()
                except Exception:
                    pass

                for sel in ["button[data-test='apply-button'], .apply-button, button.btn-apply"]:
                    try:
                        btn = driver.find_element(By.CSS_SELECTOR, sel)
                        safe_click(driver, btn)
                        human_delay(3, 6)

                        # Fill application form if present
                        try:
                            for inp in driver.find_elements(By.CSS_SELECTOR, "textarea, input[type=text]"):
                                placeholder = inp.get_attribute("placeholder") or ""
                                if not inp.get_attribute("value"):
                                    if "cover" in placeholder.lower() or "why" in placeholder.lower():
                                        type_human(inp, CONFIG["cover_note"], delay=0.03)

                            # Submit
                            sub = driver.find_element(By.CSS_SELECTOR, "button[type=submit], .submit-application")
                            safe_click(driver, sub)
                            human_delay(2, 4)
                        except Exception:
                            pass

                        applied += 1
                        log.info(f"Wellfound: ✅ Applied ({applied}) — {title} @ {company}")
                        save_applied("Wellfound", title, company, job_id, href)
                        break
                    except Exception:
                        pass

                human_delay(CONFIG["delay_min"], CONFIG["delay_max"])
            except Exception as e:
                log.error(f"Wellfound: Error — {e}")

    except Exception as e:
        log.error(f"Wellfound: Fatal — {e}")
    finally:
        driver.quit()
        log.info(f"Wellfound DONE ✅ — Total applied: {applied}")
    return applied


# ══════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════

PLATFORM_MAP = {
    "LinkedIn":    (linkedin_bot,    "use_linkedin"),
    "Naukri":      (naukri_bot,      "use_naukri"),
    "Indeed":      (indeed_bot,      "use_indeed"),
    "Glassdoor":   (glassdoor_bot,   "use_glassdoor"),
    "Internshala": (internshala_bot, "use_internshala"),
    "Shine":       (shine_bot,       "use_shine"),
    "Foundit":     (foundit_bot,     "use_foundit"),
    "TimesJobs":   (timesjobs_bot,   "use_timesjobs"),
    "Wellfound":   (wellfound_bot,   "use_wellfound"),
}


def main():
    print("""
╔══════════════════════════════════════════════════════════╗
║         JobBot v2.0 — Auto Apply Engine                  ║
║  Platforms: LinkedIn · Naukri · Indeed · Glassdoor       ║
║             Internshala · Shine · Foundit                 ║
║             TimesJobs · Wellfound                        ║
║  Browsers:  Edge 🟦 · Brave 🦁 · Chrome 🌐 (auto)        ║
╚══════════════════════════════════════════════════════════╝
""")
    log.info(f"Browser mode: {CONFIG['browser'].upper()}")
    log.info(f"Max per platform: {CONFIG['max_per_platform']}")
    log.info(f"Platform rest: {CONFIG['platform_rest_min']//60}-{CONFIG['platform_rest_max']//60} minutes")

    if not os.path.exists(CONFIG["resume_path"]):
        log.warning(f"⚠️  Resume nahi mila: {CONFIG['resume_path']}")
        log.warning("   resume.pdf is folder mein rakho jobbot_v2.py ke saath")

    os.makedirs(CONFIG["cookie_dir"], exist_ok=True)
    load_applied()

    results = {}
    total_combinations = len(CONFIG["job_titles"]) * len(CONFIG["locations"])
    combo_num = 0

    for job_title in CONFIG["job_titles"]:
        for location in CONFIG["locations"]:
            combo_num += 1
            CONFIG["job_title"] = job_title
            CONFIG["location"]  = location

            log.info(f"\n{'═'*60}")
            log.info(f"🔍 Combo {combo_num}/{total_combinations}: [{job_title}] in [{location}]")
            log.info(f"{'═'*60}")

            active_platforms = [(name, fn) for name, (fn, flag) in PLATFORM_MAP.items() if CONFIG.get(flag)]

            for i, (platform_name, bot_fn) in enumerate(active_platforms):
                log.info(f"\n▶  Starting {platform_name}...")
                count = bot_fn()
                results[platform_name] = results.get(platform_name, 0) + count

                # Platform rest (except after last platform in last combo)
                is_last = (i == len(active_platforms) - 1) and (combo_num == total_combinations)
                if not is_last:
                    platform_rest()

    # ── Final Summary ──────────────────────────────────────────
    print("\n" + "═"*55)
    print("  📊 FINAL RESULTS")
    print("═"*55)
    total = 0
    for platform, count in results.items():
        bar = "█" * min(count, 30)
        print(f"  {platform:15} → {count:3} apps  {bar}")
        total += count
    print("─"*55)
    print(f"  {'TOTAL':15} → {total:3} applications")
    print("═"*55)
    print(f"\n  📄 Log file:      jobbot.log")
    print(f"  📋 Applied list:  applied_jobs.csv")
    print(f"  🍪 Cookie folder: {CONFIG['cookie_dir']}")
    print("\n  ✅ Bot finished! Check applied_jobs.csv for details.\n")


if __name__ == "__main__":
    main()
