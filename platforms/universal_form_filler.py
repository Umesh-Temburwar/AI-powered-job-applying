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


def select_dropdown_option(driver: Any, dropdown_element: Any, target_text: str) -> bool:
    """
    Select an option from either a standard HTML <select> or custom UI listbox.
    """
    if dropdown_element is None or not target_text:
        return False
    try:
        tag = (dropdown_element.tag_name or "").lower()
        if tag == "select":
            sel = Select(dropdown_element)
            # Try exact visible text
            try:
                sel.select_by_visible_text(target_text)
                return True
            except Exception:
                pass
            # Try partial text match across options
            target_low = target_text.lower()
            for opt in sel.options:
                if target_low in opt.text.lower() or opt.text.lower() in target_low:
                    sel.select_by_visible_text(opt.text)
                    return True
            return False

        # Custom dropdown (e.g. React Select, Material UI, Tailwind dropdown)
        safe_click_control(driver, dropdown_element)
        time.sleep(0.2)
        if driver:
            # Look for popup options in current DOM
            option_elements = driver.find_elements(
                By.XPATH,
                f"//li[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{target_text.lower()}')] | "
                f"//div[@role='option'][contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{target_text.lower()}')]"
            )
            if option_elements:
                return safe_click_control(driver, option_elements[0])
            # Fallback keyboard selection
            dropdown_element.send_keys(target_text)
            time.sleep(0.1)
            dropdown_element.send_keys(Keys.ENTER)
            return True
    except Exception as exc:
        logger.debug("select_dropdown_option notice: %s", exc)
    return False


def navigate_modal_step(driver: Any) -> str:
    """
    Detects and clicks progression buttons in multi-step application wizards.
    Returns: 'submitted' | 'next_step' | 'no_action'
    """
    if not driver:
        return "no_action"

    # 1. Final submission buttons
    submit_xpaths = [
        "//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'submit your application')]",
        "//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'submit application')]",
        "//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'send application')]",
        "//button[@type='submit'][contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'submit')]",
        "//button[contains(@class, 'ia-SubmitButton') or contains(@id, 'submit')]"
    ]
    for xpath in submit_xpaths:
        try:
            elems = driver.find_elements(By.XPATH, xpath)
            for el in elems:
                if el.is_displayed() and el.is_enabled():
                    safe_click_control(driver, el)
                    logger.info("✓ Final application submission button clicked.")
                    time.sleep(2.0)
                    return "submitted"
        except Exception:
            pass

    # 2. Progression / Next step buttons
    next_xpaths = [
        "//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'continue')]",
        "//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'next')]",
        "//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'review your application')]",
        "//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'save and continue')]",
        "//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'proceed')]"
    ]
    for xpath in next_xpaths:
        try:
            elems = driver.find_elements(By.XPATH, xpath)
            for el in elems:
                if el.is_displayed() and el.is_enabled():
                    # Ensure it's not a cancel or back button
                    text = el.text.lower()
                    if "back" in text or "cancel" in text or "discard" in text:
                        continue
                    safe_click_control(driver, el)
                    time.sleep(1.5)
                    return "next_step"
        except Exception:
            pass

    return "no_action"



