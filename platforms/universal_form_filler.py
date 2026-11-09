"""
Universal Web Form Filler Automation Driver
================================================================================
Performs human-like, undetectable DOM interactions across application forms
on Naukri, Internshala, Indeed, LinkedIn, and generic ATS portals.
"""

import time
import random
import logging
from typing import Any, Optional, List
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import WebDriverException, ElementClickInterceptedException

logger = logging.getLogger("UniversalFormFiller")


def human_type(element: Any, text: str, min_delay: float = 0.015, max_delay: float = 0.045) -> bool:
    """
    Simulate human keystroke cadence with randomized inter-key jitter
    to defeat behavioral bot detection heuristics.
    """
    if element is None or text is None:
        return False
    try:
        element.click()
        time.sleep(0.1)
        element.send_keys(Keys.CONTROL + "a")
        element.send_keys(Keys.BACKSPACE)
        time.sleep(0.08)

        text_str = str(text)
        for char in text_str:
            element.send_keys(char)
            delay = random.uniform(min_delay, max_delay)
            time.sleep(delay)
        time.sleep(0.15)
        return True
    except Exception as exc:
        try:
            # Fallback direct assignment via JavaScript
            element.clear()
            element.send_keys(str(text))
            return True
        except Exception as fallback_exc:
            logger.debug("Failed human typing: %s (fallback: %s)", exc, fallback_exc)
            return False


def safe_click_control(driver: Any, element: Any) -> bool:
    """
    Safely click radio, checkbox, or toggle button with scroll-into-view
    and JavaScript execution fallback for elements covered by overlays.
    """
    if element is None:
        return False
    try:
        if driver:
            driver.execute_script("arguments[0].scrollIntoView({behavior: 'instant', block: 'center'});", element)
            time.sleep(0.08)

        # Try native click first
        element.click()
        time.sleep(0.1)
        return True
    except (ElementClickInterceptedException, WebDriverException):
        try:
            # Fallback JavaScript dispatch
            if driver:
                driver.execute_script("arguments[0].click();", element)
                time.sleep(0.1)
                return True
        except Exception as js_exc:
            logger.debug("JS click fallback failed: %s", js_exc)
    except Exception as exc:
        logger.debug("safe_click_control failed: %s", exc)
    return False

