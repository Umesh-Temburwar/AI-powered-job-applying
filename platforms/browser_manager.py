"""
Universal Browser Manager
================================================================================
Centralized browser automation driver creator supporting:
  - Google Chrome (Full auto-detection & Selenium Manager integration)
  - Microsoft Edge
  - Brave Browser
  - Mozilla Firefox

Automatically detects the user's OS default browser, seamlessly handles Chrome
or Edge or Brave or Firefox, configures anti-detection flags, resolves profile
locking conflicts, and provides zero-config automatic driver matching.
"""

import os
import sys
import shutil
import logging
import time
import random
from typing import Optional, List, Dict, Any

from selenium import webdriver
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

logger = logging.getLogger("BrowserManager")


# ── Binary Finders ────────────────────────────────────────────────────────────

def find_chrome_binary() -> Optional[str]:
    """Locate Google Chrome executable across all standard Windows, Linux, and custom locations."""
    # 1. Custom ENV override
    env_path = os.getenv("CHROME_PATH", "").strip()
    if env_path and os.path.exists(env_path):
        return env_path

    # 2. PATH resolution
    which_chrome = shutil.which("google-chrome") or shutil.which("chrome") or shutil.which("google-chrome-stable")
    if which_chrome and os.path.exists(which_chrome):
        return which_chrome

    # 3. Standard Windows candidate directories
    candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%PROGRAMFILES%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%PROGRAMFILES(X86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%PROGRAMDATA%\Google\Chrome\Application\chrome.exe"),
    ]

    # 4. Windows Registry App Paths
    if winreg is not None:
        for root_key in (winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER):
            try:
                with winreg.OpenKey(root_key, r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe") as k:
                    val, _ = winreg.QueryValueEx(k, "")
                    if val and os.path.exists(val):
                        candidates.append(val)
            except Exception:
                pass

    for p in candidates:
        if p and os.path.exists(p):
            return p
    return None


def find_edge_binary() -> Optional[str]:
    """Locate Microsoft Edge executable across all standard locations."""
    env_path = os.getenv("EDGE_PATH", "").strip()
    if env_path and os.path.exists(env_path):
        return env_path

    which_edge = shutil.which("msedge") or shutil.which("microsoft-edge")
    if which_edge and os.path.exists(which_edge):
        return which_edge

    candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%PROGRAMFILES(X86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%PROGRAMFILES%\Microsoft\Edge\Application\msedge.exe"),
    ]

    if winreg is not None:
        for root_key in (winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER):
            try:
                with winreg.OpenKey(root_key, r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe") as k:
                    val, _ = winreg.QueryValueEx(k, "")
                    if val and os.path.exists(val):
                        candidates.append(val)
            except Exception:
                pass

    for p in candidates:
        if p and os.path.exists(p):
            return p
    return None


def find_brave_binary() -> Optional[str]:
    """Locate Brave Browser executable if installed."""
    env_path = os.getenv("BRAVE_PATH", "").strip()
    if env_path and os.path.exists(env_path):
        return env_path

    which_brave = shutil.which("brave") or shutil.which("brave-browser")
    if which_brave and os.path.exists(which_brave):
        return which_brave

    candidates = [
        r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe",
        r"C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe"),
        os.path.expandvars(r"%PROGRAMFILES%\BraveSoftware\Brave-Browser\Application\brave.exe"),
        os.path.expandvars(r"%PROGRAMFILES(X86)%\BraveSoftware\Brave-Browser\Application\brave.exe"),
    ]

    for p in candidates:
        if p and os.path.exists(p):
            return p
    return None


def find_firefox_binary() -> Optional[str]:
    """Locate Mozilla Firefox executable if installed."""
    env_path = os.getenv("FIREFOX_PATH", "").strip()
    if env_path and os.path.exists(env_path):
        return env_path

    which_firefox = shutil.which("firefox")
    if which_firefox and os.path.exists(which_firefox):
        return which_firefox

    candidates = [
        r"C:\Program Files\Mozilla Firefox\firefox.exe",
        r"C:\Program Files (x86)\Mozilla Firefox\firefox.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Mozilla Firefox\firefox.exe"),
        os.path.expandvars(r"%PROGRAMFILES%\Mozilla Firefox\firefox.exe"),
        os.path.expandvars(r"%PROGRAMFILES(X86)%\Mozilla Firefox\firefox.exe"),
    ]

    for p in candidates:
        if p and os.path.exists(p):
            return p
    return None


# ── OS Default Browser Detection ──────────────────────────────────────────────

def get_default_browser() -> Optional[str]:
    """
    Intelligently detect the user's OS default browser from Windows Registry,
    Linux Desktop environment, or installed application prioritization.
    Returns: 'chrome', 'edge', 'brave', 'firefox', or None.
    """
    # 1. User environment preference override
    env_choice = os.getenv("BROWSER", "").strip().lower()
    if env_choice in ("chrome", "google-chrome"):
        return "chrome"
    if env_choice in ("edge", "msedge"):
        return "edge"
    if env_choice == "brave":
        return "brave"
    if env_choice in ("firefox", "mozilla"):
        return "firefox"

    # 2. Windows Registry Detection
    if sys.platform == "win32" and winreg is not None:
        # Check URL Associations UserChoice (https, http, and .html)
        user_choice_paths = [
            (winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\Shell\Associations\UrlAssociations\https\UserChoice"),
            (winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\Shell\Associations\UrlAssociations\http\UserChoice"),
            (winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.html\UserChoice"),
        ]

        for root_key, sub_path in user_choice_paths:
            try:
                with winreg.OpenKey(root_key, sub_path) as k:
                    prog_id, _ = winreg.QueryValueEx(k, "ProgId")
                    prog = str(prog_id).lower()
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

        # Check Shell Open Command
        shell_open_paths = [
            (winreg.HKEY_CLASSES_ROOT, r"https\shell\open\command"),
            (winreg.HKEY_CLASSES_ROOT, r"http\shell\open\command"),
        ]
        for root_key, sub_path in shell_open_paths:
            try:
                with winreg.OpenKey(root_key, sub_path) as k:
                    cmd_val, _ = winreg.QueryValueEx(k, "")
                    cmd_lower = str(cmd_val).lower()
                    if "chrome" in cmd_lower:
                        return "chrome"
                    if "msedge" in cmd_lower or "edge" in cmd_lower:
                        return "edge"
                    if "brave" in cmd_lower:
                        return "brave"
                    if "firefox" in cmd_lower:
                        return "firefox"
            except Exception:
                pass

    # 3. Linux xdg-settings detection
    if sys.platform.startswith("linux"):
        try:
            import subprocess
            out = subprocess.check_output(
                ["xdg-settings", "get", "default-web-browser"],
                stderr=subprocess.DEVNULL
            ).decode().lower()
            if "chrome" in out:
                return "chrome"
            if "edge" in out:
                return "edge"
            if "brave" in out:
                return "brave"
            if "firefox" in out:
                return "firefox"
        except Exception:
            pass

    # 4. Binary presence fallback: If only Chrome is installed and Edge isn't
    has_chrome = bool(find_chrome_binary())
    has_edge = bool(find_edge_binary())
    if has_chrome and not has_edge:
        return "chrome"
    if has_edge and not has_chrome:
        return "edge"

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


# ── Single Browser Launcher ───────────────────────────────────────────────────

def _build_chrome_options(binary_path=None, headless=False, user_data_dir=None) -> webdriver.ChromeOptions:
    """Constructs hardened, anti-detection ChromeOptions with all cross-origin & stability flags."""
    options = webdriver.ChromeOptions()
    if binary_path:
        options.binary_location = binary_path

    # Core stability and cross-origin flags for modern Chrome
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

    options.add_experimental_option("excludeSwitches", ["enable-automation", "enable-logging"])
    options.add_experimental_option("useAutomationExtension", False)

    if user_data_dir:
        options.add_argument(f"--user-data-dir={user_data_dir}")

    if headless:
        options.add_argument("--headless=new")
        options.add_argument("--window-size=1920,1080")

    return options


def _build_edge_options(binary_path=None, headless=False, user_data_dir=None) -> webdriver.EdgeOptions:
    """Constructs EdgeOptions with cross-origin & stability flags."""
    options = webdriver.EdgeOptions()
    if binary_path:
        options.binary_location = binary_path

    options.add_argument("--start-maximized")
    options.add_argument("--disable-notifications")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--remote-allow-origins=*")
    options.add_argument("--remote-debugging-port=0")
    options.add_argument("--no-first-run")
    options.add_argument("--no-default-browser-check")
    options.add_argument("--ignore-certificate-errors")

    options.add_experimental_option("excludeSwitches", ["enable-automation", "enable-logging"])
    options.add_experimental_option("useAutomationExtension", False)

    if user_data_dir:
        options.add_argument(f"--user-data-dir={user_data_dir}")

    if headless:
        options.add_argument("--headless=new")
        options.add_argument("--window-size=1920,1080")

    return options


def launch_single_browser(browser_name: str, headless: bool = False, user_data_dir: Optional[str] = None):
    """
    Initialize a WebDriver instance for the specified browser with automatic
    Selenium Manager integration and graceful fallback if profiles are locked.
    """
    b = browser_name.lower().strip()
    if is_headless_environment():
        headless = True

    # ── 1. GOOGLE CHROME ──────────────────────────────────────────────────────
    if b in ('chrome', 'google-chrome'):
        chrome_bin = find_chrome_binary()
        options = _build_chrome_options(binary_path=chrome_bin, headless=headless, user_data_dir=user_data_dir)

        # Helper to try starting Chrome with given options
        def _try_chrome_init(opts):
            # Tier 1: Selenium 4 Built-In Manager (Automatic version matching, no 403 downloads)
            try:
                return webdriver.Chrome(options=opts)
            except Exception as e1:
                logger.debug(f"Selenium Manager Chrome init note: {e1}")

            # Tier 2: Custom CHROME_DRIVER_PATH if set
            custom_driver = os.getenv('CHROME_DRIVER_PATH', '').strip()
            if custom_driver and os.path.exists(custom_driver):
                try:
                    return webdriver.Chrome(service=ChromeService(executable_path=custom_driver), options=opts)
                except Exception as e2:
                    logger.debug(f"Custom driver Chrome init note: {e2}")

            # Tier 3: Webdriver Manager with path resolution
            if WEBDRIVER_MANAGER_AVAILABLE:
                try:
                    driver_path = ChromeDriverManager().install()
                    if driver_path and not driver_path.endswith('.exe') and os.path.isdir(os.path.dirname(driver_path)):
                        cand = os.path.join(os.path.dirname(driver_path), 'chromedriver.exe')
                        if os.path.exists(cand):
                            driver_path = cand
                    return webdriver.Chrome(service=ChromeService(executable_path=driver_path), options=opts)
                except Exception as e3:
                    logger.debug(f"webdriver_manager Chrome init note: {e3}")

            # Tier 4: Default Service
            return webdriver.Chrome(service=ChromeService(), options=opts)

        try:
            return _try_chrome_init(options)
        except Exception as chrome_err:
            # If user already has Chrome running and user-data-dir is locked, retry with clean profile
            err_str = str(chrome_err).lower()
            if user_data_dir and ("already in use" in err_str or "exited normally" in err_str or "devtoolsactiveport" in err_str):
                logger.info("Chrome profile in use by existing window. Re-launching Chrome with an isolated session...")
                clean_opts = _build_chrome_options(binary_path=chrome_bin, headless=headless, user_data_dir=None)
                return _try_chrome_init(clean_opts)
            raise chrome_err

    # ── 2. MICROSOFT EDGE ─────────────────────────────────────────────────────
    elif b in ('edge', 'msedge'):
        edge_bin = find_edge_binary()
        if sys.platform != "win32" and not edge_bin:
            raise FileNotFoundError("Microsoft Edge is not installed on this Linux/cloud environment.")

        options = _build_edge_options(binary_path=edge_bin, headless=headless, user_data_dir=user_data_dir)

        def _try_edge_init(opts):
            # Tier 1: Selenium 4 Built-In Manager
            try:
                return webdriver.Edge(options=opts)
            except Exception as e1:
                logger.debug(f"Selenium Manager Edge init note: {e1}")

            # Tier 2: Custom EDGE_DRIVER_PATH
            custom_driver = os.getenv('EDGE_DRIVER_PATH', '').strip()
            if custom_driver and os.path.exists(custom_driver):
                try:
                    return webdriver.Edge(service=EdgeService(executable_path=custom_driver), options=opts)
                except Exception as e2:
                    logger.debug(f"Custom driver Edge init note: {e2}")

            # Tier 3: Webdriver Manager
            if WEBDRIVER_MANAGER_AVAILABLE:
                try:
                    driver_path = EdgeChromiumDriverManager().install()
                    return webdriver.Edge(service=EdgeService(executable_path=driver_path), options=opts)
                except Exception as e3:
                    logger.debug(f"webdriver_manager Edge init note: {e3}")

            # Tier 4: Default Service
            return webdriver.Edge(service=EdgeService(), options=opts)

        try:
            return _try_edge_init(options)
        except Exception as edge_err:
            err_str = str(edge_err).lower()
            if user_data_dir and ("already in use" in err_str or "exited normally" in err_str or "devtoolsactiveport" in err_str):
                logger.info("Edge profile in use. Re-launching Edge with an isolated session...")
                clean_opts = _build_edge_options(binary_path=edge_bin, headless=headless, user_data_dir=None)
                return _try_edge_init(clean_opts)
            raise edge_err

    # ── 3. BRAVE BROWSER ──────────────────────────────────────────────────────
    elif b == 'brave':
        brave_bin = find_brave_binary()
        if not brave_bin:
            raise FileNotFoundError("Brave executable not found on system.")

        options = _build_chrome_options(binary_path=brave_bin, headless=headless, user_data_dir=user_data_dir)

        try:
            return webdriver.Chrome(options=options)
        except Exception:
            if WEBDRIVER_MANAGER_AVAILABLE:
                try:
                    driver_path = ChromeDriverManager().install()
                    return webdriver.Chrome(service=ChromeService(executable_path=driver_path), options=options)
                except Exception:
                    pass
            return webdriver.Chrome(service=ChromeService(), options=options)

    # ── 4. MOZILLA FIREFOX ────────────────────────────────────────────────────
    elif b == 'firefox':
        firefox_bin = find_firefox_binary()
        options = webdriver.FirefoxOptions()
        if firefox_bin:
            options.binary_location = firefox_bin
        options.add_argument("--disable-notifications")
        if headless:
            options.add_argument("-headless")

        try:
            return webdriver.Firefox(options=options)
        except Exception:
            if WEBDRIVER_MANAGER_AVAILABLE:
                try:
                    service = FirefoxService(GeckoDriverManager().install())
                    return webdriver.Firefox(service=service, options=options)
                except Exception:
                    pass
            return webdriver.Firefox(service=FirefoxService(), options=options)

    else:
        raise ValueError(f"Unsupported browser: {browser_name}")


# ── Master Driver Factory ─────────────────────────────────────────────────────

def create_driver(target: Optional[str] = None, headless: bool = False, user_data_dir: Optional[str] = None):
    """
    Intelligent Master Browser Factory:
    1. Detects the user's OS default browser (Chrome, Edge, Brave, Firefox).
    2. Runs on the default browser FIRST.
    3. If default fails or is not installed, gracefully cascades through all other installed browsers.
    4. Automatically resolves profile locks if user's daily browser is already open.
    """
    if is_headless_environment():
        headless = True

    target = (target or os.getenv('BROWSER', 'auto') or 'auto').lower().strip()
    default_browser = get_default_browser()

    logger.info(f"🌐 Universal Browser Launcher: Detected Default = {default_browser or 'Unknown'}, Target = {target}")

    order: List[str] = []

    # 1. Explicit target if not auto
    if target != 'auto':
        order.append(target)

    # 2. Put detected default browser at highest priority
    if default_browser and default_browser not in order:
        order.append(default_browser)

    # 3. Add installed browsers next
    installed: List[str] = []
    if find_chrome_binary():
        installed.append('chrome')
    if find_edge_binary():
        installed.append('edge')
    if find_brave_binary():
        installed.append('brave')
    if find_firefox_binary():
        installed.append('firefox')

    for b in installed:
        if b not in order:
            order.append(b)

    # 4. Add all standard browsers as final fallback
    for b in ['chrome', 'edge', 'brave', 'firefox']:
        if b not in order:
            order.append(b)

    # Linux / Headless containers safety: prioritize chrome and firefox
    if sys.platform != "win32" or is_headless_environment():
        order = [b for b in order if b != 'edge'] + ['chrome', 'firefox']
        # Deduplicate
        seen = set()
        order = [x for x in order if not (x in seen or seen.add(x))]

    logger.info(f"🚀 Browser launch sequence: {' -> '.join([b.upper() for b in order])}")

    errors = []
    for b in order:
        try:
            logger.info(f"Attempting to launch {b.upper()} browser...")
            driver = launch_single_browser(b, headless=headless, user_data_dir=user_data_dir)
            logger.info(f"✓ Started {b.upper()} browser successfully! Ready for automated application.")
            return driver
        except Exception as e:
            logger.warning(f"Could not start {b.upper()}: {e}")
            errors.append(f"{b}: {e}")

    raise RuntimeError(
        f"Failed to launch any supported browser (Chrome, Edge, Brave, Firefox). "
        f"Please install Google Chrome or Microsoft Edge. Details: {'; '.join(errors)}"
    )


# ── Human Emulation & Anti-Detection Utilities ────────────────────────────────

def human_delay(min_sec: float = 1.5, max_sec: float = 3.5):
    """Introduce human-like variable pauses."""
    time.sleep(random.uniform(min_sec, max_sec))


def human_type(element, text: str, min_delay: float = 0.02, max_delay: float = 0.08):
    """Type characters sequentially with randomized keystroke intervals."""
    try:
        element.clear()
    except Exception:
        pass
    for char in text:
        element.send_keys(char)
        time.sleep(random.uniform(min_delay, max_delay))


def human_scroll(driver, steps: int = 3):
    """Simulate realistic candidate scrolling behavior with pauses."""
    for _ in range(steps):
        scroll_y = random.randint(250, 600)
        driver.execute_script(f"window.scrollBy(0, {scroll_y});")
        time.sleep(random.uniform(0.6, 1.4))
    # Slight micro-scroll upwards like reading
    driver.execute_script("window.scrollBy(0, -120);")
    time.sleep(random.uniform(0.5, 1.0))


def safe_click(driver, element):
    """Scroll smoothly into center view, brief pause, and click with JS fallback."""
    try:
        driver.execute_script("arguments[0].scrollIntoView({block: 'center', behavior: 'smooth'});", element)
        time.sleep(0.4)
        element.click()
    except Exception:
        driver.execute_script("arguments[0].click();", element)
