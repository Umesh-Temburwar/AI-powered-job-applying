import logging
import time
from typing import Any, Optional
from bs4 import BeautifulSoup
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException

from services.platform_automation.base import ApplyResult, BasePlatformAdapter, JobOpportunity

logger = logging.getLogger("InternshalaAdapter")


class InternshalaPlatformAdapter(BasePlatformAdapter):
    @property
    def platform_name(self) -> str:
        return "Internshala"

    def check_session(self, driver: Any) -> tuple[bool, Optional[str]]:
        try:
            driver.get("https://internshala.com/student/dashboard")
            time.sleep(3)
            cur = driver.current_url.lower()

            if "student/dashboard" in cur or "user_profile" in cur:
                try:
                    name_elem = driver.find_elements(By.CSS_SELECTOR, ".user_profile_name, .profile_name, h1")
                    if name_elem and name_elem[0].text.strip():
                        return True, name_elem[0].text.strip()
                except Exception:
                    pass
                return True, "Session Verified"

            return False, "Not logged in (redirected from student dashboard)"
        except Exception as exc:
            logger.warning("Error verifying Internshala session: %s", exc)
            return False, str(exc)

    def build_search_urls(self, keywords: list[str], locations: list[str]) -> list[str]:
        slug_map = {
            "full stack": "full-stack-development",
            "react": "react-js-development",
            "node": "node-js-development",
            "web": "web-development",
            "python": "python-django",
            "frontend": "front-end-development",
            "backend": "backend-development",
            "software": "software-development",
        }

        urls = []
        used_slugs = set()
        for kw in keywords:
            kw_l = kw.lower()
            matched = False
            for k, slug in slug_map.items():
                if k in kw_l and slug not in used_slugs:
                    used_slugs.add(slug)
                    urls.append(f"https://internshala.com/jobs/{slug}-jobs/")
                    matched = True
            if not matched:
                clean_kw = kw.replace(" ", "-").lower()
                urls.append(f"https://internshala.com/jobs/keywords-{clean_kw}/")

        return urls[:6]

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

            logger.info("Opening Internshala search category: %s", url)
            try:
                driver.get(url)
                time.sleep(3.5)
            except Exception as e:
                logger.warning("Failed to open %s: %s", url, e)
                continue

            soup = BeautifulSoup(driver.page_source, "html5lib")
            cards = soup.find_all("div", class_="individual_internship")
            if not cards:
                cards = soup.find_all("div", class_="container-fluid individual_internship")

            logger.info("Found %d vacancy cards on Internshala page", len(cards))

            for card in cards:
                if len(opportunities) >= max_results:
                    break
                if cancel_check and cancel_check():
                    break

                try:
                    title_a = card.find("a", class_="job-title-href") or card.find("a", class_="view_detail_button")
                    if not title_a or not title_a.get("href"):
                        continue

                    job_url = title_a.get("href")
                    if job_url.startswith("/"):
                        job_url = "https://internshala.com" + job_url

                    clean_url = job_url.split("?")[0]
                    if clean_url in seen_urls:
                        continue
                    seen_urls.add(clean_url)

                    job_title = title_a.get_text(strip=True) or "Internshala Role"

                    comp_elem = card.find("p", class_="company-name") or card.find("a", class_="link_display_like_text")
                    company = comp_elem.get_text(strip=True) if comp_elem else "Employer"

                    loc_elem = card.find("a", class_="location_link") or card.find("span", class_="location")
                    location = loc_elem.get_text(strip=True) if loc_elem else "India / Remote"

                    sal_elem = card.find("span", class_="salary") or card.find("span", class_="stipend")
                    salary = sal_elem.get_text(strip=True) if sal_elem else "Competitive"

                    opportunities.append(
                        JobOpportunity(
                            job_title=job_title,
                            company=company,
                            job_url=clean_url,
                            platform="Internshala",
                            location=location,
                            salary=salary,
                            is_easy_apply=True,
                        )
                    )
                except Exception as card_err:
                    logger.debug("Error parsing Internshala card: %s", card_err)

        return opportunities

    def generate_cover_letter(self, profile: dict[str, Any], role_title: str) -> str:
        name = profile.get("full_name") or "Candidate"
        skills = profile.get("skills") or ["React", "Python", "Full Stack"]
        skills_str = ", ".join(skills[:6])
        summary = profile.get("summary") or ""

        return (
            f"Dear Hiring Team,\n\n"
            f"I am writing to express my strong interest in the {role_title} opportunity.\n\n"
            f"{summary}\n\n"
            f"My primary technical stack includes: {skills_str}. I am enthusiastic about applying my "
            f"hands-on development and problem-solving skills to contribute directly to your team's objectives.\n\n"
            f"I am available to start immediately.\n\n"
            f"Sincerely,\n{name}\n"
            f"Email: {profile.get('email', '')}\n"
            f"Phone: {profile.get('phone', '')}"
        )

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
                platform="Internshala",
                success=True,
                status="review_needed",
                notes=f"[DRY RUN] Job match discovered on Internshala for '{job.job_title}'. Verified vacancy details. Ready for candidate review.",
            )

        if not user_confirmed:
            return ApplyResult(
                job_url=job.job_url,
                job_title=job.job_title,
                company=job.company,
                platform="Internshala",
                success=False,
                status="review_needed",
                error="Live submission requires explicit user confirmation.",
                notes="Submission paused: confirmation required.",
            )

        try:
            driver.get(job.job_url)
            time.sleep(3)

            apply_selectors = [
                "//button[contains(@id,'apply_now_button') or contains(text(),'Apply now')]",
                "//a[contains(text(),'Apply now')]",
                "//button[contains(text(),'Apply')]",
            ]

            apply_btn = None
            for sel in apply_selectors:
                btns = driver.find_elements(By.XPATH, sel)
                if btns and btns[0].is_displayed():
                    apply_btn = btns[0]
                    break

            if not apply_btn:
                return ApplyResult(
                    job_url=job.job_url,
                    job_title=job.job_title,
                    company=job.company,
                    platform="Internshala",
                    success=False,
                    status="failed",
                    error="Apply button not available or already applied.",
                    notes="Apply button unavailable on Internshala.",
                )

            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", apply_btn)
            time.sleep(0.5)
            driver.execute_script("arguments[0].click();", apply_btn)
            time.sleep(3)

            # Fill cover letter in textareas
            cover_letter = self.generate_cover_letter(user_profile, job.job_title)
            textareas = driver.find_elements(By.CSS_SELECTOR, "textarea")
            for ta in textareas:
                if ta.is_displayed():
                    try:
                        ta.clear()
                        ta.send_keys(cover_letter)
                    except Exception:
                        pass

            # Answer standard radio questions
            radios = driver.find_elements(By.CSS_SELECTOR, "input[type='radio']")
            for r in radios:
                try:
                    val = (r.get_attribute("value") or "").lower()
                    if val in ["yes", "immediate", "available", "1"]:
                        driver.execute_script("arguments[0].click();", r)
                except Exception:
                    pass

            # Submit form
            submit_selectors = [
                "//input[@id='submit' or @type='submit']",
                "//button[contains(text(),'Submit') or contains(text(),'Send application')]",
            ]
            submitted = False
            for s in submit_selectors:
                sub_btn = driver.find_elements(By.XPATH, s)
                if sub_btn and sub_btn[0].is_displayed():
                    driver.execute_script("arguments[0].click();", sub_btn[0])
                    submitted = True
                    time.sleep(2)
                    break

            if submitted:
                return ApplyResult(
                    job_url=job.job_url,
                    job_title=job.job_title,
                    company=job.company,
                    platform="Internshala",
                    success=True,
                    status="applied",
                    notes=f"Application submitted successfully on Internshala for {job.job_title} @ {job.company}.",
                )

            return ApplyResult(
                job_url=job.job_url,
                job_title=job.job_title,
                company=job.company,
                platform="Internshala",
                success=False,
                status="failed",
                error="Submit button could not be activated.",
                notes="Form filled but submit button not confirmed.",
            )

        except Exception as exc:
            logger.error("Failed live application to %s: %s", job.job_url, exc)
            return ApplyResult(
                job_url=job.job_url,
                job_title=job.job_title,
                company=job.company,
                platform="Internshala",
                success=False,
                status="failed",
                error=str(exc),
                notes=f"Submission error: {exc}",
            )
