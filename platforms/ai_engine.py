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

logger = logging.getLogger("AIEngine")
load_dotenv()

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PROFILE_PATH = os.path.join(BASE_DIR, "profile_data.json")
ANSWERS_PATH = os.path.join(BASE_DIR, "application_answers.csv")


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
        self.education = self.profile.get("education", {})
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
            if any(term in q_clean for term in ["available for", "months", "duration", "start date", "availability"]):
                return "Yes, I am available full-time immediately for the entire required duration."
            if any(term in q_clean for term in ["why should you be hired", "why should we hire you"]):
                return (
                    f"As a Computer Science graduate specializing in {', '.join(self.skills[:4])}, "
                    "I have built complete web applications including an EdTech platform with responsive UI and REST APIs. "
                    "I am ready to contribute immediately with high dedication."
                )[:max_len]

        if "naukri" in plat:
            if "notice period in days" in q_clean:
                return "0"
            if "notice period" in q_clean:
                return "Immediate"
            if "expected ctc" in q_clean:
                return "4.5"

        # 1. Exact or substring match in answer bank
        for k, v in self.answer_bank.items():
            if k in q_clean or q_clean in k:
                return v

        # 2. Rule-based heuristic pattern matching
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

        # Relocation / Preferred Location
        if any(term in q_clean for term in ["relocate", "relocation", "willing to move", "preferred location"]):
            return "Yes, fully willing to relocate or work remotely"

        # Full-time / Internship availability
        if any(term in q_clean for term in ["available for", "full time", "months", "duration"]):
            return "Yes, available full-time immediately"

        # Graduation / Passing Year
        if any(term in q_clean for term in ["graduation", "passing year", "year of pass", "graduated"]):
            return str(self.education.get("passing_year", "2025"))

        # College / University
        if any(term in q_clean for term in ["college", "university", "institute"]):
            return str(self.education.get("college", "MBES College of Engineering"))

        # CGPA / Percentage
        if any(term in q_clean for term in ["cgpa", "percentage", "marks", "gpa"]):
            return str(self.education.get("cgpa", "6.06"))

        # Degree / Stream
        if any(term in q_clean for term in ["degree", "branch", "stream", "field of study"]):
            return f"{self.education.get('degree', 'B.Tech')} in {self.education.get('field_of_study', 'Computer Science')}"

        # 3. LLM API (if configured in .env)
        if self.api_key and len(question) > 15:
            llm_ans = self._query_gemini(question, role_title)
            if llm_ans:
                return llm_ans[:max_len]

        # 4. Contextual Fallback for subjective questions ("Why hire you?", "Describe project", etc.)
        if any(term in q_clean for term in ["why", "hire", "fit", "suitable", "strength"]):
            return (
                f"As a Computer Science graduate with hands-on expertise in {', '.join(self.skills[:5])}, "
                "I have designed full-stack applications with production-ready architectures, RESTful APIs, and secure database integrations. "
                "I have a proven track record delivering responsive web applications like the EdTech Learning Platform and ByteFest event website. "
                "I am eager to contribute immediately with high ownership and technical problem-solving."
            )[:max_len]

        if any(term in q_clean for term in ["project", "describe a project", "portfolio"]):
            return (
                "I developed a full-stack EdTech Learning Platform for courses, quizzes, assignments, and certificates. "
                "It features responsive React.js dashboards with Role-Based Access Control (RBAC), Supabase PostgreSQL database, "
                "and secure Node.js/Express.js REST APIs."
            )[:max_len]

        # Generic affirmative response
        return "Yes, I have hands-on practical experience in this domain and can demonstrate project implementations."

    def _query_gemini(self, question: str, role_title: str) -> Optional[str]:
        """Query Gemini API for subjective screening questions."""
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.api_key}"
            prompt = (
                f"You are answering a job application question on behalf of Umesh Temburwar, a Full Stack Developer "
                f"specializing in React.js, Node.js, Express.js, MongoDB, PostgreSQL, and Supabase. "
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

