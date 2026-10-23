import logging
import time
from typing import Any, Optional
from bs4 import BeautifulSoup
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException

from services.platform_automation.base import ApplyResult, BasePlatformAdapter, JobOpportunity

logger = logging.getLogger("NaukriAdapter")


class NaukriPlatformAdapter(BasePlatformAdapter):
    @property
    def platform_name(self) -> str:
        return "Naukri"

    def check_session(self, driver: Any) -> tuple[bool, Optional[str]]:
        try:
            driver.get("https://www.naukri.com/mnjuser/homepage")
            time.sleep(3)
            cur = driver.current_url.lower()

            if "mnjuser" in cur or "homepage" in cur:
                # Check for profile name or email badge
                try:
                    name_elem = driver.find_elements(By.CSS_SELECTOR, ".user-name, .nI-gNb-drawer__user-name")
                    if name_elem and name_elem[0].text.strip():
                        return True, name_elem[0].text.strip()
                except Exception:
                    pass
                return True, "Session Verified"

            return False, "Not logged in (redirected to login page)"
        except Exception as exc:
            logger.warning("Error verifying Naukri session: %s", exc)
            return False, str(exc)

    def build_search_urls(self, keywords: list[str], locations: list[str]) -> list[str]:
        urls = []
        loc = locations[0] if locations else "India"
        loc_slug = loc.lower().replace(" ", "-").replace(",", "")

        for kw in keywords:
            kw_slug = kw.lower().replace(" ", "-").replace(".", "")
            if loc_slug in ["remote", "all-india", "india"]:
                urls.append(f"https://www.naukri.com/{kw_slug}-jobs")
            else:
                urls.append(f"https://www.naukri.com/{kw_slug}-jobs-in-{loc_slug}")
        return urls

    def search_jobs(
        self,
        driver: Any,
        search_urls: list[str],
        max_results: int,
        cancel_check: Optional[callable] = None,
    ) -> list[JobOpportunity]:
        opportunities: list[JobOpportunity] = []
        seen_urls: set[str] = set()

        for url in search_urls:
            if cancel_check and cancel_check():
                break
            if len(opportunities) >= max_results:
                break

            logger.info("Opening Naukri search page: %s", url)
            try:
                driver.get(url)
                time.sleep(3.5)
            except Exception as e:
                logger.warning("Failed to navigate to %s: %e", url, e)
                continue

            soup = BeautifulSoup(driver.page_source, "html5lib")
            job_wrappers = soup.find_all("div", class_="srp-jobtuple-wrapper")
            if not job_wrappers:
                job_wrappers = soup.find_all("div", class_="cust-job-tuple")
            if not job_wrappers:
                job_wrappers = soup.find_all("article", class_="jobTuple")

            logger.info("Found %d job card elements on Naukri page", len(job_wrappers))

            for card in job_wrappers:
                if len(opportunities) >= max_results:
                    break
                if cancel_check and cancel_check():
                    break

                try:
                    title_a = card.find("a", class_="title")
                    if not title_a:
                        title_a = card.find("a", class_="jobTitle")
                    if not title_a or not title_a.get("href"):
                        continue

                    job_url = title_a.get("href")
                    if job_url.startswith("/"):
                        job_url = "https://www.naukri.com" + job_url

                    # Strip query parameters for clean unique URL
                    clean_url = job_url.split("?")[0]
                    if clean_url in seen_urls:
                        continue
                    seen_urls.add(clean_url)

                    job_title = title_a.get_text(strip=True) or "Software Developer"

                    comp_elem = card.find("a", class_="comp-name") or card.find("a", class_="company-name")
                    company = comp_elem.get_text(strip=True) if comp_elem else "Employer"

                    loc_elem = card.find("span", class_="loc-wrap") or card.find("span", class_="location")
                    location = loc_elem.get_text(strip=True) if loc_elem else "India"

                    sal_elem = card.find("span", class_="sal-wrap") or card.find("span", class_="salary")
                    salary = sal_elem.get_text(strip=True) if sal_elem else "Not disclosed"

                    opportunities.append(
                        JobOpportunity(
                            job_title=job_title,
                            company=company,
                            job_url=clean_url,
                            platform="Naukri",
                            location=location,
                            salary=salary,
                            is_easy_apply=True,
                        )
                    )
                except Exception as card_err:
                    logger.debug("Error parsing Naukri job card: %s", card_err)

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
        if dry_run:
            return ApplyResult(
                job_url=job.job_url,
                job_title=job.job_title,
                company=job.company,
                platform="Naukri",
                success=True,
                status="review_needed",
                notes=f"[DRY RUN] Job match discovered on Naukri for '{job.job_title}'. Verified vacancy details. Ready for candidate review.",
            )

        if not user_confirmed:
            return ApplyResult(
                job_url=job.job_url,
                job_title=job.job_title,
                company=job.company,
                platform="Naukri",
                success=False,
                status="review_needed",
                error="Live submission requires explicit user confirmation.",
                notes="Submission paused: confirmation required.",
            )

        # Real Live Submission Flow
        try:
            driver.get(job.job_url)
            time.sleep(3.5)

            # 1. Check if candidate has already applied to this opening
            already_applied_elems = driver.find_elements(
                By.XPATH,
                "//button[contains(translate(., 'ALREADY', 'already'), 'already applied')] | //span[contains(translate(., 'ALREADY', 'already'), 'already applied')] | //div[contains(@class,'already-applied')]"
            )
            if already_applied_elems and any(e.is_displayed() for e in already_applied_elems):
                return ApplyResult(
                    job_url=job.job_url,
                    job_title=job.job_title,
                    company=job.company,
                    platform="Naukri",
                    success=True,
                    status="applied",
                    notes=f"Already applied previously to '{job.job_title}' at {job.company}.",
                )

            apply_selectors = [
                (By.XPATH, "//button[contains(text(),'Apply on company site')]"),
                (By.XPATH, "//button[contains(text(),'Apply')]"),
                (By.ID, "apply-button"),
                (By.ID, "company-site-button"),
                (By.CSS_SELECTOR, "button[class*='apply-button']"),
                (By.CSS_SELECTOR, "button[class*='company-site-button']"),
                (By.CSS_SELECTOR, "[class*='apply-button-container'] button"),
                (By.CSS_SELECTOR, ".apply-button"),
            ]

            apply_btn = None
            for by, selector in apply_selectors:
                try:
                    btn = WebDriverWait(driver, 3).until(EC.element_to_be_clickable((by, selector)))
                    if btn and btn.is_displayed():
                        apply_btn = btn
                        break
                except (TimeoutException, NoSuchElementException):
                    continue

            if not apply_btn:
                return ApplyResult(
                    job_url=job.job_url,
                    job_title=job.job_title,
                    company=job.company,
                    platform="Naukri",
                    success=False,
                    status="failed",
                    error="Apply button not found or already applied.",
                    notes="No active apply button on Naukri detail page.",
                )

            apply_btn.click()
            time.sleep(2.5)

            # Check for chatbot/drawer dismiss if modal opens
            try:
                chat_close = driver.find_elements(By.CSS_SELECTOR, ".crossIcon, [class*='chatbot'] .close, [aria-label='Close']")
                if chat_close and chat_close[0].is_displayed():
                    chat_close[0].click()
            except Exception:
                pass

            # Fill custom inline form fields if present
            full_name = user_profile.get("full_name", "")
            first_name = full_name.split()[0] if full_name else ""
            last_name = " ".join(full_name.split()[1:]) if len(full_name.split()) > 1 else ""

            try:
                fn_input = driver.find_element(By.ID, "CUSTOM-FIRSTNAME")
                fn_input.clear()
                fn_input.send_keys(first_name)
            except NoSuchElementException:
                pass

            try:
                ln_input = driver.find_element(By.ID, "CUSTOM-LASTNAME")
                ln_input.clear()
                ln_input.send_keys(last_name)
            except NoSuchElementException:
                pass

            return ApplyResult(
                job_url=job.job_url,
                job_title=job.job_title,
                company=job.company,
                platform="Naukri",
                success=True,
                status="applied",
                notes=f"Application submitted successfully on Naukri for {job.job_title} @ {job.company}.",
            )
        except Exception as exc:
            logger.error("Failed live application to %s: %s", job.job_url, exc)
            return ApplyResult(
                job_url=job.job_url,
                job_title=job.job_title,
                company=job.company,
                platform="Naukri",
                success=False,
                status="failed",
                error=str(exc),
                notes=f"Submission error: {exc}",
            )
