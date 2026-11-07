import logging
import re
import time
from typing import Any, Optional
from bs4 import BeautifulSoup
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException

from services.platform_automation.base import ApplyResult, BasePlatformAdapter, JobOpportunity
from platforms.location_matcher import is_location_match, parse_target_locations, get_location_search_slugs

logger = logging.getLogger("InternshalaAdapter")


def is_unpaid_internship(stipend: str = "", title: str = "", company: str = "", extra: str = "") -> bool:
    """
    Detect whether an Internshala vacancy is unpaid, zero-stipend, or pure volunteer work.
    Returns True if unpaid (must be skipped), False if paid or legitimate compensation.
    """
    blob = f"{stipend} {title} {company} {extra}".lower().strip()
    if not blob:
        return False

    # 1. Explicit unpaid keywords & volunteering phrases
    unpaid_phrases = [
        "unpaid",
        "un-paid",
        "non-paid",
        "no stipend",
        "without stipend",
        "zero stipend",
        "nil stipend",
        "free internship",
        "volunteer",
        "volunteering",
        "pro bono",
        "certificate only",
        "expenses only",
        "expenses covered only",
    ]
    for phrase in unpaid_phrases:
        if phrase in blob:
            return True

    # 2. Check for zero amount / zero stipend representations
    stipend_lower = stipend.lower().strip()
    if stipend_lower:
        # Crucial: 0 must not be part of a larger number like 10,000 or 2,000
        if re.search(r"(?<![0-9])0\s*(?:/|\bper\b)\s*month", stipend_lower):
            return True
        if re.search(r"^(?:₹|rs\.?|inr)?\s*0\s*$", stipend_lower):
            return True
        if re.search(r"(?<![0-9])0\s*-\s*0(?![0-9])", stipend_lower):
            return True
        if re.search(r"(?:₹|rs\.?|inr)\s*0(?![0-9])", stipend_lower):
            return True

    return False


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
        self.target_locations = parse_target_locations(locations)
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
        loc_slugs = get_location_search_slugs(self.target_locations) or [""]

        for kw in keywords:
            kw_l = kw.lower()
            matched = False
            for k, slug in slug_map.items():
                if k in kw_l and slug not in used_slugs:
                    used_slugs.add(slug)
                    matched = True
                    for l_slug in loc_slugs[:2]:
                        if l_slug == "work-from-home":
                            urls.append(f"https://internshala.com/jobs/work-from-home-{slug}-jobs/")
                            urls.append(f"https://internshala.com/internships/work-from-home-{slug}-internship/")
                        elif l_slug:
                            urls.append(f"https://internshala.com/jobs/{slug}-jobs-in-{l_slug}/")
                            urls.append(f"https://internshala.com/internships/{slug}-internship-in-{l_slug}/")
                        else:
                            urls.append(f"https://internshala.com/jobs/{slug}-jobs/")
                            urls.append(f"https://internshala.com/internships/{slug}-internship/")
            if not matched:
                clean_kw = kw.replace(" ", "-").lower()
                for l_slug in loc_slugs[:2]:
                    if l_slug == "work-from-home":
                        urls.append(f"https://internshala.com/jobs/work-from-home-keywords-{clean_kw}/")
                    elif l_slug:
                        urls.append(f"https://internshala.com/jobs/keywords-{clean_kw}/?location={l_slug}")
                    else:
                        urls.append(f"https://internshala.com/jobs/keywords-{clean_kw}/")

        return urls[:8]

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

                    # Skip unpaid internships right from the search results
                    card_raw_text = card.get_text(" ", strip=True)
                    if is_unpaid_internship(salary, job_title, company, card_raw_text):
                        logger.info("🚫 Filtered unpaid Internshala vacancy: '%s' @ '%s' (Stipend: %s)", job_title, company, salary)
                        continue

                    # Strictly skip vacancies not matching candidate target locations
                    target_locs = getattr(self, "target_locations", None) or parse_target_locations()
                    if not is_location_match(location, target_locs):
                        logger.info("📍 [LOCATION FILTER] Filtered Internshala vacancy: '%s' @ '%s' (Location: '%s') - Out of scope: %s", job_title, company, location, target_locs)
                        continue

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
        # Reject unpaid internships immediately
        if is_unpaid_internship(job.salary or "", job.job_title or "", job.company or ""):
            return ApplyResult(
                job_url=job.job_url,
                job_title=job.job_title,
                company=job.company,
                platform="Internshala",
                success=False,
                status="skipped",
                notes=f"Skipped unpaid internship (Stipend: {job.salary}). Excluded by candidate compensation policy.",
            )

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

            # Live detail page stipend check
            sal_elem = driver.find_elements(By.CSS_SELECTOR, ".stipend, .salary, [class*='salary'], [class*='stipend']")
            live_stipend = sal_elem[0].text.strip() if sal_elem else (job.salary or "")
            if is_unpaid_internship(live_stipend, job.job_title, job.company):
                return ApplyResult(
                    job_url=job.job_url,
                    job_title=job.job_title,
                    company=job.company,
                    platform="Internshala",
                    success=False,
                    status="skipped",
                    notes=f"Skipped unpaid internship detected on detail page (Stipend: {live_stipend}).",
                )

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

            # Check if candidate has already applied
            already_applied = driver.find_elements(
                By.XPATH,
                "//span[contains(text(),'Applied')] | //div[contains(text(),'Already applied')] | //div[contains(@class,'already_applied')]"
            )
            if already_applied and any(e.is_displayed() for e in already_applied):
                return ApplyResult(
                    job_url=job.job_url,
                    job_title=job.job_title,
                    company=job.company,
                    platform="Internshala",
                    success=True,
                    status="applied",
                    notes=f"Already applied previously to '{job.job_title}' at {job.company}.",
                )

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

            # Answer standard radio questions (smart check to reject unpaid confirmations)
            radios = driver.find_elements(By.CSS_SELECTOR, "input[type='radio']")
            for r in radios:
                try:
                    val = (r.get_attribute("value") or "").lower()
                    context_text = ""
                    try:
                        parent_group = r.find_element(By.XPATH, "./ancestor::div[contains(@class,'form-group') or contains(@class,'question')][1]")
                        context_text = parent_group.text.lower()
                    except Exception:
                        pass

                    if any(term in context_text for term in ["unpaid", "without stipend", "no stipend", "zero stipend"]):
                        if val in ["no", "false", "0"]:
                            driver.execute_script("arguments[0].click();", r)
                    elif val in ["yes", "immediate", "available", "1"]:
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
