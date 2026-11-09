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

from platforms.resume_intelligence import ResumeKnowledgeGraph
from platforms.form_field_resolver import (
    FormFieldType,
    FormFieldClassifier,
    NumericExperienceResolver,
    BooleanIntentResolver,
    DropdownOptionResolver,
    ProjectEssayResolver
)

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
            try:
                sel.select_by_visible_text(target_text)
                return True
            except Exception:
                pass
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
            option_elements = driver.find_elements(
                By.XPATH,
                f"//li[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{target_text.lower()}')] | "
                f"//div[@role='option'][contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{target_text.lower()}')]"
            )
            if option_elements:
                return safe_click_control(driver, option_elements[0])
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
                    text = el.text.lower()
                    if "back" in text or "cancel" in text or "discard" in text:
                        continue
                    safe_click_control(driver, el)
                    time.sleep(1.5)
                    return "next_step"
        except Exception:
            pass

    return "no_action"


class UniversalFormFiller:
    """Orchestrates end-to-end intelligent form filling across job application portals."""

    def __init__(self, profile_data: Optional[dict] = None):
        self.graph = ResumeKnowledgeGraph(profile_data)

    def extract_field_label(self, driver: Any, element: Any) -> str:
        """Extract user-visible question text or attribute description for an input element."""
        if not element:
            return ""
        # 1. Direct attributes
        aria = element.get_attribute("aria-label") or ""
        placeholder = element.get_attribute("placeholder") or ""
        name = element.get_attribute("name") or ""
        el_id = element.get_attribute("id") or ""

        # 2. Linked <label for="id">
        label_text = ""
        if el_id and driver:
            try:
                lbls = driver.find_elements(By.XPATH, f"//label[@for='{el_id}']")
                if lbls and lbls[0].text.strip():
                    label_text = lbls[0].text.strip()
            except Exception:
                pass

        # 3. Ancestor / parent question container text
        parent_text = ""
        if driver and not label_text and not aria:
            try:
                parent = element.find_element(By.XPATH, "./ancestor::div[contains(@class,'question') or contains(@class,'field') or contains(@class,'form-group')][1]")
                if parent and parent.text.strip():
                    parent_text = parent.text.split("\n")[0].strip()
            except Exception:
                pass

        candidates = [label_text, aria, parent_text, placeholder, name]
        for c in candidates:
            if c and len(c.strip()) > 1:
                return c.strip()
        return ""

    def fill_form_step(self, driver: Any) -> int:
        """Inspect and fill all visible unpopulated fields in current modal view."""
        if not driver:
            return 0
        filled_count = 0

        # 1. Text & Textarea fields
        inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='text'], input[type='tel'], input[type='number'], input[type='email'], textarea")
        for inp in inputs:
            try:
                if not inp.is_displayed() or not inp.is_enabled():
                    continue
                val = inp.get_attribute("value") or ""
                if val.strip():
                    continue

                label = self.extract_field_label(driver, inp)
                el_tag = (inp.tag_name or "").lower()
                el_type = (inp.get_attribute("type") or "text").lower()

                field_type = FormFieldClassifier.classify(label, element_tag=el_tag, element_type=el_type)

                answer = ""
                lbl_low = label.lower()

                if "phone" in lbl_low or "mobile" in lbl_low or "contact" in lbl_low:
                    answer = self.graph.phone
                elif "email" in lbl_low:
                    answer = self.graph.email
                elif "first name" in lbl_low:
                    answer = self.graph.personal.get("firstname", "Umesh")
                elif "last name" in lbl_low:
                    answer = self.graph.personal.get("lastname", "Temburwar")
                elif "name" in lbl_low and not any(k in lbl_low for k in ["company", "college", "school"]):
                    answer = self.graph.name
                elif "city" in lbl_low or "location" in lbl_low or "address" in lbl_low:
                    answer = self.graph.current_location.split(",")[0].strip()
                elif field_type == FormFieldType.EXPERIENCE_YEARS:
                    answer = NumericExperienceResolver.resolve(label, self.graph)
                elif field_type == FormFieldType.PROJECT_ESSAY:
                    answer = ProjectEssayResolver.resolve(label, self.graph)
                elif field_type == FormFieldType.NOTICE_PERIOD:
                    answer = self.graph.notice_period
                elif field_type == FormFieldType.SALARY_CTC:
                    answer = self.graph.expected_ctc
                elif field_type == FormFieldType.NUMERIC:
                    answer = NumericExperienceResolver.resolve(label, self.graph)
                else:
                    answer = ProjectEssayResolver.resolve(label, self.graph, max_len=180)

                if answer:
                    if human_type(inp, answer):
                        filled_count += 1
                        logger.info("Auto-filled '%s' -> '%s'", label[:40], str(answer)[:40])
            except Exception as e:
                logger.debug("Error filling text field: %s", e)

        # 2. Radio controls
        radios = driver.find_elements(By.CSS_SELECTOR, "input[type='radio']")
        handled_radio_names = set()
        for r in radios:
            try:
                if not r.is_displayed():
                    continue
                r_name = r.get_attribute("name") or ""
                if r_name in handled_radio_names:
                    continue

                label = self.extract_field_label(driver, r)
                intent_yes = BooleanIntentResolver.resolve(label, self.graph)

                r_val = (r.get_attribute("value") or "").lower()
                r_txt = (r.text or "").lower()

                # Determine if this radio button represents Yes or No
                is_yes_btn = any(t in r_val or t in r_txt for t in ["yes", "true", "1"])
                is_no_btn = any(t in r_val or t in r_txt for t in ["no", "false", "0"])

                if (intent_yes and is_yes_btn) or (not intent_yes and is_no_btn):
                    if safe_click_control(driver, r):
                        filled_count += 1
                        if r_name:
                            handled_radio_names.add(r_name)
            except Exception as e:
                logger.debug("Error filling radio button: %s", e)

        # 3. Select dropdowns
        selects = driver.find_elements(By.CSS_SELECTOR, "select")
        for s in selects:
            try:
                if not s.is_displayed():
                    continue
                label = self.extract_field_label(driver, s)
                raw_options = [opt.text.strip() for opt in Select(s).options]
                matched_opt = DropdownOptionResolver.resolve(label, raw_options, self.graph)
                if matched_opt:
                    if select_dropdown_option(driver, s, matched_opt):
                        filled_count += 1
            except Exception as e:
                logger.debug("Error filling select dropdown: %s", e)

        return filled_count

    def execute_application_wizard(self, driver: Any, max_steps: int = 6) -> bool:
        """Walk through multi-step modal wizard and submit application."""
        for step in range(max_steps):
            time.sleep(1.5)
            self.fill_form_step(driver)
            time.sleep(1.0)
            status = navigate_modal_step(driver)
            if status == "submitted":
                return True
            if status == "no_action":
                break
        return False
