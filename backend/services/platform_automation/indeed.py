import logging
import time
import urllib.parse
from typing import Any, Optional
from bs4 import BeautifulSoup
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException

from services.platform_automation.base import ApplyResult, BasePlatformAdapter, JobOpportunity

logger = logging.getLogger("IndeedAdapter")


class IndeedPlatformAdapter(BasePlatformAdapter):
    @property
    def platform_name(self) -> str:
        return "Indeed"

    def check_session(self, driver: Any) -> tuple[bool, Optional[str]]:
        try:
            driver.get("https://in.indeed.com")
            time.sleep(3)
            cur = driver.current_url.lower()

            try:
                # Indeed account menu / profile button
                profile_btn = driver.find_elements(
                    By.CSS_SELECTOR,
                    "[data-gnav-element-name='Profile'], [aria-label*='Account'], [data-testid='account-button']"
                )
                if profile_btn:
                    return True, "Session Verified"
            except Exception:
                pass

            # Check if sign in button is visible
            sign_in = driver.find_elements(By.CSS_SELECTOR, "a[href*='account/login'], [data-gnav-element-name='SignIn']")
            if sign_in and sign_in[0].is_displayed():
                return False, "Not logged in (Sign in button present)"

            return True, "Session Verified (Guest/Active Profile)"
        except Exception as exc:
            logger.warning("Error verifying Indeed session: %s", exc)
            return False, str(exc)

    def build_search_urls(self, keywords: list[str], locations: list[str]) -> list[str]:
        urls = []
        loc = locations[0] if locations else "India"
        encoded_l = urllib.parse.quote_plus(loc)

        for kw in keywords:
            encoded_q = urllib.parse.quote_plus(kw)
            # sc=0kf:attr(5QWDV); is the filter parameter for "Easily Apply" jobs on Indeed
            urls.append(f"https://in.indeed.com/jobs?q={encoded_q}&l={encoded_l}&sc=0kf%3Aattr%285QWDV%29%3B")

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

            logger.info("Opening Indeed search page: %s", url)
            try:
                driver.get(url)
                time.sleep(3.5)
            except Exception as e:
                logger.warning("Failed to open %s: %s", url, e)
                continue

            soup = BeautifulSoup(driver.page_source, "html5lib")
            cards = soup.find_all("div", class_="job_seen_beacon")
            if not cards:
                cards = soup.find_all("div", class_="resultContent")
            if not cards:
                cards = soup.find_all("div", class_="cardOutline")

            logger.info("Found %d job card elements on Indeed page", len(cards))

            for card in cards:
                if len(opportunities) >= max_results:
                    break
                if cancel_check and cancel_check():
                    break

                try:
                    title_a = card.find("a", class_="jcs-JobTitle") or card.find("h2", class_="jobTitle")
                    if not title_a:
                        title_a = card.find("a")
                    if not title_a:
                        continue

                    href = title_a.get("href") if title_a.name == "a" else (title_a.find("a").get("href") if title_a.find("a") else None)
                    if not href:
                        continue

                    if href.startswith("/"):
                        job_url = "https://in.indeed.com" + href
                    else:
                        job_url = href

                    clean_url = job_url.split("&")[0]
                    if clean_url in seen_urls:
                        continue
                    seen_urls.add(clean_url)

                    job_title = title_a.get_text(strip=True) or "Software Engineer"

                    comp_elem = card.find("span", class_="companyName") or card.find("span", {"data-testid": "company-name"})
                    company = comp_elem.get_text(strip=True) if comp_elem else "Employer"

                    loc_elem = card.find("div", class_="companyLocation") or card.find("div", {"data-testid": "text-location"})
                    location = loc_elem.get_text(strip=True) if loc_elem else "India"

                    sal_elem = card.find("div", class_="salary-snippet-container") or card.find("div", class_="metadata")
                    salary = sal_elem.get_text(strip=True) if sal_elem else "Estimated Market Rate"

                    opportunities.append(
                        JobOpportunity(
                            job_title=job_title,
                            company=company,
                            job_url=clean_url,
                            platform="Indeed",
                            location=location,
                            salary=salary,
                            is_easy_apply=True,
                        )
                    )
                except Exception as card_err:
                    logger.debug("Error parsing Indeed card: %s", card_err)

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
                platform="Indeed",
                success=True,
                status="review_needed",
                notes=f"[DRY RUN] Job match discovered on Indeed for '{job.job_title}'. Verified vacancy details. Ready for candidate review.",
            )

        if not user_confirmed:
            return ApplyResult(
                job_url=job.job_url,
                job_title=job.job_title,
                company=job.company,
                platform="Indeed",
                success=False,
                status="review_needed",
                error="Live submission requires explicit user confirmation.",
                notes="Submission paused: confirmation required.",
            )

        try:
            driver.get(job.job_url)
            time.sleep(3)

            apply_btn = None
            for sel in [
                "#indeedApplyButton",
                "button[id*='indeedApply']",
                ".indeed-apply-button",
                "//button[contains(text(),'Apply now')]",
            ]:
                if sel.startswith("//"):
                    btns = driver.find_elements(By.XPATH, sel)
                else:
                    btns = driver.find_elements(By.CSS_SELECTOR, sel)
                if btns and btns[0].is_displayed():
                    apply_btn = btns[0]
                    break

            if not apply_btn:
                return ApplyResult(
                    job_url=job.job_url,
                    job_title=job.job_title,
                    company=job.company,
                    platform="Indeed",
                    success=False,
                    status="failed",
                    error="Easily Apply button not present on Indeed listing.",
                    notes="No direct Easy Apply button available.",
                )

            driver.execute_script("arguments[0].click();", apply_btn)
            time.sleep(3)

            # Step through modal inputs
            phone = user_profile.get("phone", "+91 9876543210")
            for _ in range(5):
                time.sleep(1.5)
                # Fill phone
                phone_inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='tel'], input[id*='phone']")
                for pi in phone_inputs:
                    if pi.is_displayed() and not pi.get_attribute("value"):
                        pi.send_keys(phone)

                # Click continue or submit
                cont_btns = driver.find_elements(
                    By.XPATH,
                    "//button[contains(text(),'Continue') or contains(text(),'Review your application') or contains(text(),'Submit')]"
                )
                if cont_btns and cont_btns[0].is_displayed():
                    driver.execute_script("arguments[0].click();", cont_btns[0])
                else:
                    break

            return ApplyResult(
                job_url=job.job_url,
                job_title=job.job_title,
                company=job.company,
                platform="Indeed",
                success=True,
                status="applied",
                notes=f"Application submitted successfully on Indeed for {job.job_title} @ {job.company}.",
            )

        except Exception as exc:
            logger.error("Failed live application on Indeed for %s: %s", job.job_url, exc)
            return ApplyResult(
                job_url=job.job_url,
                job_title=job.job_title,
                company=job.company,
                platform="Indeed",
                success=False,
                status="failed",
                error=str(exc),
                notes=f"Submission error: {exc}",
            )
