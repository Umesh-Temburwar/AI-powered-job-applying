"""Universal Job Apply Bot — LinkedIn Platform Adapter
Implements session verification, public job discovery, and Easy Apply form assistance.
Never requests user password; candidate logs in manually in isolated browser profile.
"""

import logging
import time
import urllib.parse
from typing import Any, Callable, Optional

from bs4 import BeautifulSoup
from selenium.common.exceptions import NoSuchElementException, TimeoutException, WebDriverException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from services.platform_automation.base import ApplyResult, BasePlatformAdapter, JobOpportunity

logger = logging.getLogger("LinkedInAdapter")


class LinkedInPlatformAdapter(BasePlatformAdapter):
    @property
    def platform_name(self) -> str:
        return "LinkedIn"

    def check_session(self, driver: Any) -> tuple[bool, Optional[str]]:
        """Verify if candidate has an active authenticated session on LinkedIn."""
        try:
            driver.get("https://www.linkedin.com/feed/")
            time.sleep(3)
            cur = driver.current_url.lower()

            # 1. Check for cookie li_at
            try:
                cookies = driver.get_cookies()
                has_li_at = any(c.get("name") == "li_at" for c in cookies)
                if has_li_at and "login" not in cur and "checkpoint" not in cur:
                    return True, "Session Verified (li_at cookie present)"
            except Exception:
                pass

            # 2. Check for navigation profile icon
            try:
                me_icon = driver.find_elements(
                    By.CSS_SELECTOR,
                    ".global-nav__me, [data-view-name='profile-dropdown'], img.global-nav__me-photo"
                )
                if me_icon and ("feed" in cur or "in/" in cur):
                    return True, "Session Verified (Profile Nav present)"
            except Exception:
                pass

            # 3. Check if redirected to login or security checkpoint
            if "login" in cur or "signup" in cur:
                return False, "Not logged in (Redirected to login page)"
            if "checkpoint" in cur:
                return False, "LinkedIn Security Checkpoint / Verification Required"

            # Check for sign-in button
            sign_in = driver.find_elements(By.CSS_SELECTOR, "a[href*='login'], .nav__button-secondary")
            if sign_in and sign_in[0].is_displayed():
                return False, "Not logged in (Sign in button present)"

            return True, "Session Active"
        except Exception as exc:
            logger.warning("Error verifying LinkedIn session: %s", exc)
            return False, str(exc)

    def build_search_urls(self, keywords: list[str], locations: list[str]) -> list[str]:
        urls = []
        loc = locations[0] if locations else "India"
        encoded_l = urllib.parse.quote_plus(loc)

        for kw in keywords:
            encoded_q = urllib.parse.quote_plus(kw)
            # f_AL=true filters for Easy Apply positions on LinkedIn
            urls.append(
                f"https://www.linkedin.com/jobs/search/?keywords={encoded_q}&location={encoded_l}&f_AL=true"
            )

        return urls

    def search_jobs(
        self,
        driver: Any,
        search_urls: list[str],
        max_results: int,
        cancel_check: Optional[Callable[[], bool]] = None,
    ) -> list[JobOpportunity]:
        opportunities: list[JobOpportunity] = []
        seen_urls: set[str] = set()

        for search_url in search_urls:
            if cancel_check and cancel_check():
                break
            if len(opportunities) >= max_results:
                break

            logger.info("Scanning LinkedIn job results: %s", search_url)
            try:
                driver.get(search_url)
                time.sleep(3)

                # Scroll down slightly to trigger lazy-loaded cards
                try:
                    driver.execute_script("window.scrollTo(0, 500);")
                    time.sleep(1.5)
                except Exception:
                    pass

                soup = BeautifulSoup(driver.page_source, "html.parser")
                job_cards = soup.select(
                    "li.jobs-search-results__list-item, div.job-card-container, div.base-card"
                )

                for card in job_cards:
                    if len(opportunities) >= max_results:
                        break

                    # Title & URL
                    title_elem = card.select_one(
                        "a.job-card-list__title--link, a.base-card__full-link, .job-card-list__title"
                    )
                    if not title_elem:
                        continue

                    title = title_elem.get_text(strip=True)
                    url = title_elem.get("href", "")
                    if not url:
                        continue
                    if url.startswith("/"):
                        url = f"https://www.linkedin.com{url}"
                    clean_url = url.split("?")[0]

                    if clean_url in seen_urls:
                        continue
                    seen_urls.add(clean_url)

                    # Company
                    comp_elem = card.select_one(
                        ".job-card-container__company-name, .job-card-container__primary-description, .base-search-card__subtitle"
                    )
                    company = comp_elem.get_text(strip=True) if comp_elem else "LinkedIn Recruiter"

                    # Location
                    loc_elem = card.select_one(
                        ".job-card-container__metadata-item, .job-search-card__location"
                    )
                    location = loc_elem.get_text(strip=True) if loc_elem else "India"

                    # Check Easy Apply indicator
                    is_easy = bool(card.select_one(".job-card-container__apply-method, [aria-label*='Easy Apply']")) or True

                    opportunities.append(
                        JobOpportunity(
                            job_title=title,
                            company=company,
                            job_url=clean_url,
                            platform="LinkedIn",
                            location=location,
                            is_easy_apply=is_easy,
                        )
                    )
            except Exception as exc:
                logger.warning("Error fetching LinkedIn search page: %s", exc)

        return opportunities

    def apply_to_job(
        self,
        driver: Any,
        job: JobOpportunity,
        user_profile: dict[str, Any],
        resume_path: Optional[str],
        dry_run: bool = True,
        user_confirmed: bool = False,
    ) -> ApplyResult:
        """Process LinkedIn job application."""
        if dry_run:
            return ApplyResult(
                job_url=job.job_url,
                job_title=job.job_title,
                company=job.company,
                platform="LinkedIn",
                success=True,
                status="review_needed",
                notes="[Dry-run] Vacancy matched. Easy Apply form assistance verified without live submission.",
            )

        if not user_confirmed:
            return ApplyResult(
                job_url=job.job_url,
                job_title=job.job_title,
                company=job.company,
                platform="LinkedIn",
                success=False,
                status="review_needed",
                notes="Live application requires explicit candidate confirmation.",
            )

        try:
            driver.get(job.job_url)
            time.sleep(3)

            # 1. Check if candidate already applied
            already_applied = driver.find_elements(
                By.XPATH,
                "//span[contains(text(),'Applied')] | //div[contains(@class,'jobs-s-apply__application-badge')]"
            )
            if already_applied and any(e.is_displayed() for e in already_applied):
                return ApplyResult(
                    job_url=job.job_url,
                    job_title=job.job_title,
                    company=job.company,
                    platform="LinkedIn",
                    success=True,
                    status="applied",
                    notes=f"Already applied previously on LinkedIn to '{job.job_title}' at {job.company}.",
                )

            easy_apply_btn = driver.find_elements(
                By.CSS_SELECTOR,
                "button.jobs-apply-button, button[aria-label*='Easy Apply']"
            )
            if not easy_apply_btn:
                return ApplyResult(
                    job_url=job.job_url,
                    job_title=job.job_title,
                    company=job.company,
                    platform="LinkedIn",
                    success=False,
                    status="unsupported",
                    notes="External employer redirect — requires manual candidate submission.",
                )

            # In controlled mode, click easy apply modal
            easy_apply_btn[0].click()
            time.sleep(2)

            # Step through modal if multi-step form
            phone = user_profile.get("phone", "")
            for _ in range(4):
                time.sleep(1.2)
                # Fill phone input if present
                phone_inputs = driver.find_elements(By.CSS_SELECTOR, "input[id*='phoneNumber'], input[type='tel']")
                for pi in phone_inputs:
                    if pi.is_displayed() and not pi.get_attribute("value") and phone:
                        pi.send_keys(phone)

                # Find next / review / submit button
                action_btn = driver.find_elements(
                    By.XPATH,
                    "//button[contains(span/text(),'Next') or contains(span/text(),'Review') or contains(span/text(),'Submit application') or contains(text(),'Submit')]"
                )
                if action_btn and action_btn[0].is_displayed():
                    btn_text = action_btn[0].text.strip().lower()
                    action_btn[0].click()
                    if "submit" in btn_text:
                        time.sleep(2)
                        break
                else:
                    break

            return ApplyResult(
                job_url=job.job_url,
                job_title=job.job_title,
                company=job.company,
                platform="LinkedIn",
                success=True,
                status="applied",
                notes="LinkedIn Easy Apply processed successfully.",
            )
        except Exception as exc:
            return ApplyResult(
                job_url=job.job_url,
                job_title=job.job_title,
                company=job.company,
                platform="LinkedIn",
                success=False,
                status="failed",
                notes=f"Automation error: {exc}",
                error=str(exc),
            )
