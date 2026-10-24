"""
Universal Browser Manager
================================================================================
Centralized browser automation driver creator supporting:
  - Microsoft Edge
  - Google Chrome
  - Brave Browser
  - Mozilla Firefox

Automatically detects your Windows default browser, downloads matching drivers,
and configures anti-detection flags so job portals do not block the bot.
"""

import os
import sys
import logging
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


def get_default_browser() -> Optional[str]:
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
    """Locate Brave executable if installed."""
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


def launch_single_browser(browser_name, headless=False, user_data_dir=None):
    """Initialize a WebDriver instance for the specified browser."""
    b = browser_name.lower().strip()

    if b == 'edge':
        options = webdriver.EdgeOptions()
        options.add_argument("--start-maximized")
        options.add_argument("--disable-notifications")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)
        if user_data_dir:
            options.add_argument(f"--user-data-dir={user_data_dir}")
        if headless:
            options.add_argument("--headless=new")
        edge_bin = find_edge_binary()
        if edge_bin:
            options.binary_location = edge_bin

        edge_driver_path = os.getenv('EDGE_DRIVER_PATH', '')
        if WEBDRIVER_MANAGER_AVAILABLE:
            service = EdgeService(EdgeChromiumDriverManager().install())
        elif edge_driver_path:
            service = EdgeService(executable_path=edge_driver_path)
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
        if user_data_dir:
            options.add_argument(f"--user-data-dir={user_data_dir}")
        if headless:
            options.add_argument("--headless=new")
        chrome_bin = find_chrome_binary()
        if chrome_bin:
            options.binary_location = chrome_bin

        chrome_driver_path = os.getenv('CHROME_DRIVER_PATH', '')
        if WEBDRIVER_MANAGER_AVAILABLE:
            service = ChromeService(ChromeDriverManager().install())
        elif chrome_driver_path:
            service = ChromeService(executable_path=chrome_driver_path)
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
        if user_data_dir:
            options.add_argument(f"--user-data-dir={user_data_dir}")
        if headless:
            options.add_argument("--headless=new")
        if WEBDRIVER_MANAGER_AVAILABLE:
            service = ChromeService(ChromeDriverManager().install())
        else:
            service = ChromeService()
        return webdriver.Chrome(service=service, options=options)

    elif b == 'firefox':
        options = webdriver.FirefoxOptions()
        options.add_argument("--disable-notifications")
        if headless:
            options.add_argument("-headless")
        if WEBDRIVER_MANAGER_AVAILABLE:
            service = FirefoxService(GeckoDriverManager().install())
        else:
            service = FirefoxService()
        return webdriver.Firefox(service=service, options=options)

    else:
        raise ValueError(f"Unsupported browser: {browser_name}")


def create_driver(target=None, headless=False, user_data_dir=None):
    """
    Auto-detects the system default browser first, then gracefully falls back
    to any other available browser (Edge, Chrome, Brave, Firefox).
    """
    target = (target or os.getenv('BROWSER', 'auto') or 'auto').lower()
    default_browser = get_default_browser()

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
            driver = launch_single_browser(b, headless=headless, user_data_dir=user_data_dir)
            logger.info(f"✓ Started {b.upper()} browser successfully!")
            return driver
        except Exception as e:
            logger.warning(f"Could not start {b.upper()}: {e}")

    raise RuntimeError("Failed to launch any supported browser (Edge, Chrome, Brave, Firefox).")


# ── Human Emulation & Anti-Detection Utilities ────────────────────────────────

import time
import random


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

