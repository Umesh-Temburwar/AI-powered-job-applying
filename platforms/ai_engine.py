"""
AI Question Answerer & Intelligent ATS Keyword Matcher
================================================================================
Empowers the bot with:
  1. Instant answers for application questions & screening forms.
  2. Offline heuristic NLP answer generator + Optional Google Gemini / AI API support.
  3. ATS Keyword Matcher & Suitability Scorer for job descriptions.
"""

import os
import re
import json
import csv
import logging
import requests
from typing import Dict, List, Tuple, Optional
from dotenv import load_dotenv

from platforms.location_matcher import parse_target_locations, is_location_match

logger = logging.getLogger("AIEngine")
load_dotenv()

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PROFILE_PATH = os.path.join(BASE_DIR, "data", "profile_data.json") if os.path.exists(os.path.join(BASE_DIR, "data", "profile_data.json")) else os.path.join(BASE_DIR, "profile_data.json")
ANSWERS_PATH = os.path.join(BASE_DIR, "data", "application_answers.csv") if os.path.exists(os.path.join(BASE_DIR, "data", "application_answers.csv")) else os.path.join(BASE_DIR, "application_answers.csv")


def load_profile_data() -> Dict:
    """Load master candidate profile data."""
    if os.path.exists(PROFILE_PATH):
        try:
            with open(PROFILE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def load_answer_bank() -> Dict[str, str]:
    """Load standard answers from application_answers.csv."""
    answers = {}
    if os.path.exists(ANSWERS_PATH):
        try:
            with open(ANSWERS_PATH, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    q = (row.get("question_text") or "").strip().lower()
                    a = (row.get("answer") or "").strip()
                    if q and a:
                        answers[q] = a
        except Exception:
            pass
    return answers


class QuestionAnswerer:
    """Intelligent Question Answerer combining offline heuristics and optional LLM."""

    def __init__(self):
        self.profile = load_profile_data()
        self.answer_bank = load_answer_bank()
        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("AI_API_KEY") or ""
        self.personal = self.profile.get("personal", {})
        raw_edu = self.profile.get("education", {})
        if isinstance(raw_edu, list):
            self.education = raw_edu[0] if raw_edu else {}
        elif isinstance(raw_edu, dict):
            self.education = raw_edu
        else:
            self.education = {}
        self.skills = self.profile.get("key_skills", [
            "React.js", "Node.js", "Express.js", "MongoDB", "PostgreSQL", "Supabase", "REST APIs", "Git"
        ])

    def answer_question(
        self,
        question: str,
        role_title: str = "Full Stack Developer",
        max_len: int = 500,
        platform: str = "generic"
    ) -> str:
        """Find or generate the best answer for any screening question."""
        q_clean = question.strip().lower()
        plat = platform.lower()

        # Platform-specific answer overrides
        if "internshala" in plat:
            if any(term in q_clean for term in ["unpaid", "without stipend", "zero stipend", "no stipend", "volunteer"]):
                if any(term in q_clean for term in ["comfortable", "willing", "acceptable", "open to", "agree", "okay with", "accept", "interest"]):
                    return "No"
                if any(term in q_clean for term in ["require", "need", "expect"]):
                    return "Yes"
                if "paid or unpaid" in q_clean:
                    return "Paid"
                return "No"
            if any(term in q_clean for term in ["available for", "months", "duration", "start date", "availability"]):
                return "Yes, I am available full-time immediately for the entire required duration."
            if any(term in q_clean for term in ["why should you be hired", "why should we hire you"]):
                projs = self.profile.get("projects") or []
                proj_names = [p.get("title") for p in projs if isinstance(p, dict) and p.get("title")]
                proj_mention = f"like {' and '.join(proj_names[:2])}" if proj_names else "with responsive UI and REST APIs"
                deg = self.education.get("degree") or "Computer Science"
                return (
                    f"As a {deg} graduate specializing in {', '.join(self.skills[:4])}, "
                    f"I have built complete web applications {proj_mention}. "
                    "I am ready to contribute immediately with high dedication."
                )[:max_len]

        if "naukri" in plat:
            if "notice period in days" in q_clean:
                return "0"
            if "notice period" in q_clean:
                return self.personal.get("notice_period") or "Immediate"
            if "expected ctc" in q_clean:
                return str(self.personal.get("expected_ctc") or "4.5")

        if "linkedin" in plat:
            if any(term in q_clean for term in ["phone", "mobile", "contact number"]):
                return str(self.personal.get("phone") or os.getenv("PHONE", "+91 9876543210"))
            if any(term in q_clean for term in ["authorized", "sponsorship", "legally"]):
                return "Yes" if "sponsorship" not in q_clean else "No"
            if "commute" in q_clean or "on-site" in q_clean:
                return "Yes"

        if "indeed" in plat:
            if "education" in q_clean or "degree" in q_clean:
                return "Bachelor's Degree"
            if "shift" in q_clean:
                return "Flexible"
            if "willing to relocate" in q_clean:
                return "Yes"

        # 1. Exact or substring match in answer bank
        for k, v in self.answer_bank.items():
            if k in q_clean or q_clean in k:
                return v

        # 2. Rule-based heuristic pattern matching
        # Stipend & Unpaid Policy Screening
        if any(term in q_clean for term in ["unpaid", "without stipend", "zero stipend", "no stipend", "volunteer"]):
            if any(term in q_clean for term in ["comfortable", "willing", "acceptable", "open to", "agree", "okay with", "accept", "interest"]):
                return "No"
            if any(term in q_clean for term in ["require", "need", "expect"]):
                return "Yes"
            if "paid or unpaid" in q_clean:
                return "Paid"
            return "No"
        if "stipend" in q_clean and any(term in q_clean for term in ["expected", "requirement", "how much"]):
            return "15000 - 25000"

        # Notice Period
        if any(term in q_clean for term in ["notice period", "joining", "how soon", "when can you join"]):
            if "naukri" in plat:
                return "Immediate"
            return "Immediate (0 Days) - Can join immediately"

        # Years of Experience
        if any(term in q_clean for term in ["total experience", "years of experience", "how many years"]):
            if "total" in q_clean or "relevant" in q_clean:
                return "1" if "0" not in str(self.personal.get("total_experience_years", "0")) else "Fresher / 0-1 Year hands-on project experience"
            return "1"

        # Current CTC / Salary
        if "current ctc" in q_clean or "current salary" in q_clean:
            return "0 (Fresher)"

        # Expected CTC
        if "expected ctc" in q_clean or "expected salary" in q_clean:
            return str(self.personal.get("expected_ctc", "4.5 Lakhs"))

        # Current Location / City
        if any(term in q_clean for term in ["current location", "current city", "where do you live", "where are you located", "present location", "residing in"]):
            curr = self.personal.get("current_location") or os.getenv("LOCATION", "Pune")
            if any(term in q_clean for term in ["are you residing in", "are you located in", "are you based in"]):
                target_locs = parse_target_locations(profile_data=self.profile)
                if any(is_location_match(loc, [curr]) or loc in q_clean for loc in target_locs if loc in q_clean):
                    return "Yes"
                return "Yes, willing to relocate or work remotely"
            return str(curr).title()

        # Preferred Location / Target Location
        if any(term in q_clean for term in ["preferred location", "preferred city", "desired location", "target location"]):
            target_locs = parse_target_locations(profile_data=self.profile)
            if target_locs:
                return ", ".join(l.title() for l in target_locs)
            return str(os.getenv("LOCATION", "Pune")).title()

        # Relocation / Willing to Move
        if any(term in q_clean for term in ["relocate", "relocation", "willing to move", "ready to relocate", "open to relocate"]):
            target_locs = parse_target_locations(profile_data=self.profile)
            for loc in target_locs:
                if loc in q_clean:
                    return f"Yes, fully willing to relocate to {loc.title()}"
            return "Yes, fully willing to relocate or work remotely"

        # Full-time / Internship availability
        if any(term in q_clean for term in ["available for", "full time", "months", "duration"]):
            return "Yes, available full-time immediately"

        # Graduation / Passing Year
        if any(term in q_clean for term in ["graduation", "passing year", "year of pass", "graduated", "batch"]):
            return str(self.education.get("passing_year") or self.education.get("year") or os.getenv("EDUCATION_PASSING_YEAR") or "2025")

        # College / University
        if any(term in q_clean for term in ["college", "university", "institute", "school"]):
            return str(self.education.get("college") or self.education.get("institution") or os.getenv("EDUCATION_COLLEGE") or "Engineering College")

        # CGPA / Percentage
        if any(term in q_clean for term in ["cgpa", "percentage", "marks", "gpa", "score"]):
            return str(self.education.get("cgpa") or self.education.get("score") or os.getenv("EDUCATION_SCORE") or "8.0")

        # Degree / Stream
        if any(term in q_clean for term in ["degree", "branch", "stream", "field of study", "qualification"]):
            deg = self.education.get("degree") or os.getenv("EDUCATION_DEGREE") or "B.Tech"
            fos = self.education.get("field_of_study") or "Computer Science"
            return f"{deg} in {fos}" if "stream" in q_clean or "branch" in q_clean else deg

        # 3. LLM API (if configured in .env)
        if self.api_key and len(question) > 15:
            llm_ans = self._query_gemini(question, role_title)
            if llm_ans:
                return llm_ans[:max_len]

        # 4. Contextual Fallback for subjective questions ("Why hire you?", "Describe project", etc.)
        if any(term in q_clean for term in ["why", "hire", "fit", "suitable", "strength"]):
            skills_str = ", ".join(self.skills[:5]) if self.skills else "Software Engineering"
            deg = self.education.get("degree") or "Engineering"
            projs = self.profile.get("projects") or []
            proj_names = [p.get("title") for p in projs if isinstance(p, dict) and p.get("title")]
            proj_mention = f"like {' and '.join(proj_names[:2])}" if proj_names else "with clean architectures and robust APIs"
            return (
                f"As a {deg} graduate with hands-on expertise in {skills_str}, "
                f"I have designed applications with production-ready architectures, RESTful APIs, and secure database integrations {proj_mention}. "
                f"I am eager to contribute immediately with high ownership and technical problem-solving."
            )[:max_len]

        if any(term in q_clean for term in ["project", "describe a project", "portfolio"]):
            projs = self.profile.get("projects") or []
            if projs and isinstance(projs[0], dict):
                p0 = projs[0]
                p_title = p0.get("title", "Web Application")
                p_stack = ", ".join(p0.get("tech_stack", [])) if isinstance(p0.get("tech_stack"), list) else str(p0.get("tech_stack", ""))
                p_desc = p0.get("description", "")
                return f"I developed '{p_title}' using {p_stack}. {p_desc}"[:max_len]
            return (
                f"I developed full-stack software applications featuring responsive frontend interfaces, "
                f"modular REST APIs using {', '.join(self.skills[:3])}, and secure database persistence."
            )[:max_len]

        # Generic affirmative response
        return "Yes, I have hands-on practical experience in this domain and can demonstrate project implementations."

    def get_answer(self, question: str, role_title: str = "", max_len: int = 500) -> str:
        """Alias for answer_question."""
        return self.answer_question(question=question, role_title=role_title, max_len=max_len)


    def _query_gemini(self, question: str, role_title: str) -> Optional[str]:
        """Query Gemini API for subjective screening questions."""
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.api_key}"
            cand_name = f"{self.personal.get('firstname', '')} {self.personal.get('lastname', '')}".strip() or self.personal.get('name') or "Candidate"
            skills_str = ", ".join(self.skills[:6]) if self.skills else "Modern Web Technologies"
            prompt = (
                f"You are answering a job application question on behalf of {cand_name}, a {role_title} "
                f"specializing in {skills_str}. "
                f"Role applied for: {role_title}.\n"
                f"Question: {question}\n\n"
                f"Provide a concise, professional, first-person response (under 80 words) that highlights skills and readiness."
            )
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.4, "maxOutputTokens": 150}
            }
            resp = requests.post(url, json=payload, timeout=8)
            if resp.status_code == 200:
                data = resp.json()
                return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception as e:
            logger.debug(f"Gemini fallback notice: {e}")
        return None


class ATSMatcher:
    """Calculates match compatibility between candidate skills and job description."""

    def __init__(self):
        self.profile = load_profile_data()
        self.candidate_skills = set(
            s.lower() for s in self.profile.get("key_skills", [
                "react.js", "node.js", "javascript", "express.js", "postgresql",
                "mongodb", "supabase", "python", "rest apis", "git", "html5", "css3"
            ])
        )

    def evaluate_match(self, job_title: str, job_description: str) -> Dict:
        """Analyze job description and return ATS compatibility score and skill breakdown."""
        text = f"{job_title} {job_description}".lower()

        # Common tech stack dictionary
        target_keywords = [
            "react", "react.js", "node", "node.js", "javascript", "typescript",
            "express", "express.js", "mongodb", "postgresql", "postgres", "supabase",
            "python", "rest api", "rest apis", "git", "github", "html", "css",
            "redux", "tailwind", "sql", "docker", "next.js", "aws"
        ]

        required_in_job = set()
        for kw in target_keywords:
            # Word boundary search
            if re.search(r'\b' + re.escape(kw) + r'\b', text):
                required_in_job.add(kw)

        if not required_in_job:
            # Default fallback score for related titles
            title_l = job_title.lower()
            if any(term in title_l for term in ["full stack", "react", "node", "web developer", "software engineer", "frontend", "backend"]):
                return {
                    "score": 85,
                    "matched_skills": list(self.candidate_skills)[:5],
                    "missing_skills": [],
                    "is_recommended": True
                }
            return {"score": 70, "matched_skills": [], "missing_skills": [], "is_recommended": True}

        matched = set()
        missing = set()

        for req in required_in_job:
            # Normalize for matching
            is_match = False
            for c_skill in self.candidate_skills:
                if req in c_skill or c_skill in req:
                    matched.add(req)
                    is_match = True
                    break
            if not is_match:
                missing.add(req)

        score = round((len(matched) / len(required_in_job)) * 100) if required_in_job else 80

        return {
            "score": max(min(score, 100), 25),
            "matched_skills": sorted(list(matched)),
            "missing_skills": sorted(list(missing)),
            "is_recommended": score >= 50
        }

    @staticmethod
    def calculate_compatibility_percentage(candidate_skills: List[str], required_skills: List[str]) -> float:
        """Calculate normalized compatibility percentage between two skill sets."""
        if not required_skills:
            return 100.0
        c_set = {s.strip().lower() for s in candidate_skills if s.strip()}
        r_set = {s.strip().lower() for s in required_skills if s.strip()}
        if not r_set:
            return 100.0
        intersection = c_set.intersection(r_set)
        return round((len(intersection) / len(r_set)) * 100.0, 1)


# Global Singletons
qa_engine = QuestionAnswerer()
ats_matcher = ATSMatcher()

