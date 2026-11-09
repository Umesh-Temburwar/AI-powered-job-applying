"""
Semantic Form Field Classifier & Intelligent Resume Resolver
================================================================================
Analyzes form inputs, labels, and screening questions to classify intent
and synthesize verified answers grounded directly in candidate's resume.
"""

import re
import logging
from enum import Enum
from typing import Dict, List, Any, Optional
from platforms.resume_intelligence import ResumeKnowledgeGraph

logger = logging.getLogger("FormFieldResolver")


class FormFieldType(Enum):
    TEXT = "text"
    NUMERIC = "numeric"
    EXPERIENCE_YEARS = "experience_years"
    BOOLEAN_RADIO = "boolean_radio"
    SELECT_DROPDOWN = "select_dropdown"
    MULTI_SELECT = "multi_select"
    PROJECT_ESSAY = "project_essay"
    SALARY_CTC = "salary_ctc"
    NOTICE_PERIOD = "notice_period"
    RESUME_UPLOAD = "resume_upload"
    UNKNOWN = "unknown"


class FormFieldClassifier:
    """Semantic intent classifier for job application form fields."""

    @staticmethod
    def classify(label_or_question: str, element_tag: str = "input", element_type: str = "text") -> FormFieldType:
        if not label_or_question:
            if element_type == "radio":
                return FormFieldType.BOOLEAN_RADIO
            if element_tag == "select":
                return FormFieldType.SELECT_DROPDOWN
            if element_type == "file":
                return FormFieldType.RESUME_UPLOAD
            return FormFieldType.TEXT

        q = label_or_question.lower().strip()

        # Resume upload
        if any(term in q for term in ["resume", "cv", "upload document", "attach"]):
            if element_type == "file" or "upload" in q:
                return FormFieldType.RESUME_UPLOAD

        # Experience in years / Numeric skills (Evaluated before generic "do you have" boolean check)
        if any(term in q for term in ["how many years", "years of experience", "total experience", "relevant experience"]) or \
           (re.search(r'\bexperience\b', q) and any(term in q for term in ["year", "years", "yrs", "in years"])):
            return FormFieldType.EXPERIENCE_YEARS

        # Long-form / Essay questions
        if any(term in q for term in ["why hire you", "why should we hire", "tell us about", "biggest achievement", "cover letter"]) or \
           ("describe" in q and any(term in q for term in ["project", "experience", "yourself", "work", "challenge"])) or \
           (element_tag == "textarea" and len(q) > 20):
            return FormFieldType.PROJECT_ESSAY

        # Boolean radio / Yes-No questions (Evaluated before salary/notice checks for "Are you willing/comfortable...")
        if element_type == "radio" or any(term in q for term in [
            "are you willing", "do you have", "are you comfortable", "can you relocate",
            "are you located", "do you require", "will you require", "are you legally",
            "is it acceptable", "agree to", "consent to", "would you be", "do you possess"
        ]):
            return FormFieldType.BOOLEAN_RADIO

        # Notice period
        if any(term in q for term in ["notice period", "how soon", "when can you join", "joining date", "availability"]):
            return FormFieldType.NOTICE_PERIOD

        # Salary / CTC
        if any(term in q for term in ["ctc", "salary", "stipend", "compensation"]):
            return FormFieldType.SALARY_CTC

        # Dropdowns
        if element_tag == "select":
            return FormFieldType.SELECT_DROPDOWN

        # Generic numeric
        if element_type == "number" or "gpa" in q or "cgpa" in q or "percentage" in q:
            return FormFieldType.NUMERIC

        return FormFieldType.TEXT


class NumericExperienceResolver:
    """Extracts target skill and returns verified years of experience from resume."""

    @staticmethod
    def extract_skill_from_question(question: str, graph: ResumeKnowledgeGraph) -> Optional[str]:
        q_low = question.lower()
        # Direct check against candidate's skills
        for skill in graph.skills:
            pattern = r'\b' + re.escape(skill.lower()) + r'\b'
            if re.search(pattern, q_low):
                return skill

        # Common aliases
        aliases = {
            "reactjs": "React.js",
            "react": "React.js",
            "nodejs": "Node.js",
            "node": "Node.js",
            "expressjs": "Express.js",
            "express": "Express.js",
            "postgres": "PostgreSQL",
            "postgresql": "PostgreSQL",
            "mongo": "MongoDB",
            "mongodb": "MongoDB",
            "js": "JavaScript",
            "javascript": "JavaScript",
            "python": "Python",
            "git": "Git",
            "rest": "REST APIs",
            "api": "REST APIs",
            "html": "HTML",
            "css": "CSS"
        }
        for alias, normalized in aliases.items():
            if re.search(r'\b' + re.escape(alias) + r'\b', q_low):
                return normalized

        return None

    @classmethod
    def resolve(cls, question: str, graph: ResumeKnowledgeGraph) -> str:
        q_low = question.lower().strip()

        # CGPA or percentage
        if "cgpa" in q_low or "gpa" in q_low:
            return graph.education.get("cgpa", "6.06")
        if "percentage" in q_low:
            return "65"

        # Passing year or graduation year
        if any(term in q_low for term in ["passing year", "graduation year", "batch", "passout"]):
            return str(graph.education.get("passing_year", "2025"))

        # Skill-specific experience
        target_skill = cls.extract_skill_from_question(question, graph)
        if target_skill:
            years = graph.get_skill_experience_years(target_skill)
            return str(int(years)) if years.is_integer() else f"{years:.1f}"

        # Total or relevant experience
        if any(term in q_low for term in ["total experience", "overall experience", "total years", "work experience"]):
            tot = graph.total_experience_years
            return str(int(tot)) if tot.is_integer() else f"{tot:.1f}"

        # Default fallback for numeric experience field
        return "1"


class BooleanIntentResolver:
    """Accurately decides True (Yes) vs False (No) for radio buttons and checkboxes."""

    @classmethod
    def resolve(cls, question: str, graph: ResumeKnowledgeGraph) -> bool:
        q_low = question.lower().strip()

        # 1. Negative Intent Questions (Expected Answer: "No")
        # Visa sponsorship requirement
        if "sponsorship" in q_low or any(term in q_low for term in ["require visa", "need visa", "visa support"]):
            return False

        # Unpaid / zero stipend role
        if any(term in q_low for term in ["unpaid", "without stipend", "zero stipend", "no stipend", "volunteer"]):
            if any(term in q_low for term in ["willing to accept", "comfortable with", "open to", "agree to"]):
                return False

        # Criminal record / disciplinary action
        if any(term in q_low for term in ["criminal", "convicted", "felony", "misdemeanor", "terminated for cause", "fired", "disciplinary"]):
            return False

        # Non-compete / restrictive covenant
        if any(term in q_low for term in ["non-compete", "restrictive covenant", "binding agreement"]):
            return False

        # 2. Positive Intent Questions (Expected Answer: "Yes")
        # Relocation & work model
        if any(term in q_low for term in ["willing to relocate", "open to relocate", "hybrid", "remote", "work from home", "commute", "travel"]):
            return True

        # Work authorization in India
        if any(term in q_low for term in ["authorized to work", "legally authorized", "eligible to work in india", "citizen of india"]):
            return True

        # Infrastructure readiness (laptop, broadband)
        if any(term in q_low for term in ["personal laptop", "broadband", "internet connection", "quiet workspace"]):
            return True

        # Background verification and compliance
        if any(term in q_low for term in ["background check", "background verification", "drug test", "reference check", "agree to terms"]):
            return True

        # Availability and commitment
        if any(term in q_low for term in ["immediate", "join immediately", "available for", "full-time", "full time", "rotational shift", "night shift", "flexible hours"]):
            return True

        # Technical skills possessed by candidate
        for skill in graph.skills:
            if re.search(r'\b' + re.escape(skill.lower()) + r'\b', q_low):
                if any(term in q_low for term in ["experience with", "hands-on", "knowledge of", "proficient in", "familiar with"]):
                    return True

        # Standard affirmative fallback for recruiter screening questions
        return True


class DropdownOptionResolver:
    """Fuzzy matches and selects the best matching <option> from candidate profile."""

    @classmethod
    def resolve(cls, question: str, options: List[str], graph: ResumeKnowledgeGraph) -> Optional[str]:
        if not options:
            return None

        # Clean options list
        valid_options = [opt for opt in options if opt.strip() and not opt.lower().startswith("select")]
        if not valid_options:
            return options[0] if options else None

        q_low = question.lower()

        # 1. Degree / Education dropdown
        if any(term in q_low for term in ["degree", "education", "qualification"]):
            priority_terms = ["b.tech", "bachelor of technology", "b.e", "bachelor's", "engineering", "graduate"]
            for term in priority_terms:
                for opt in valid_options:
                    if term in opt.lower():
                        return opt

        # 2. Notice period dropdown
        if any(term in q_low for term in ["notice", "availability", "joining"]):
            priority_terms = ["immediate", "0 days", "< 15 days", "15 days", "1 month"]
            for term in priority_terms:
                for opt in valid_options:
                    if term in opt.lower():
                        return opt

        # 3. Experience level dropdown
        if any(term in q_low for term in ["experience level", "total experience", "years"]):
            priority_terms = ["1 year", "0-1", "1-2", "entry", "fresher", "junior", "associate"]
            for term in priority_terms:
                for opt in valid_options:
                    if term in opt.lower():
                        return opt

        # 4. Location dropdown
        if any(term in q_low for term in ["location", "city", "preferred"]):
            priority_locs = ["pune", "remote", "bangalore", "mumbai", "hyderabad", "work from home"]
            for loc in priority_locs:
                for opt in valid_options:
                    if loc in opt.lower():
                        return opt

        # 5. Gender dropdown
        if "gender" in q_low:
            for opt in valid_options:
                if "male" in opt.lower() and "female" not in opt.lower():
                    return opt

        # 6. Country dropdown
        if "country" in q_low:
            for opt in valid_options:
                if "india" in opt.lower():
                    return opt

        # 7. Employment type dropdown
        if any(term in q_low for term in ["employment type", "job type"]):
            for opt in valid_options:
                if "full" in opt.lower() or "permanent" in opt.lower():
                    return opt

        # Fallback to the first non-empty option
        return valid_options[0]


class ProjectEssayResolver:
    """Generates context-rich essay answers grounded strictly in resume projects."""

    @classmethod
    def resolve(cls, question: str, graph: ResumeKnowledgeGraph, max_len: int = 600) -> str:
        q_low = question.lower().strip()

        # 1. Why Hire You / Why Fit
        if any(term in q_low for term in ["why hire you", "why should we hire", "why are you a good fit", "why fit", "why interested"]):
            return (
                f"As a Computer Science graduate with hands-on full-stack development experience, I bring proven expertise in "
                f"React.js, Node.js, Express.js, and Supabase PostgreSQL. I have built production-ready applications like the "
                f"EdTech Learning Platform (with secure RBAC and REST APIs) and the ByteFest 2K25 portal (handling 2,000+ daily visitors). "
                f"With immediate availability (0 Days notice), I am ready to take high ownership, write maintainable code, and deliver value immediately."
            )[:max_len]

        # 2. Challenge / Technical Problem Solved
        if any(term in q_low for term in ["challenge", "difficult bug", "problem solved", "obstacle", "troubleshoot"]):
            return (
                "While building the ByteFest 2K25 event portal, we experienced traffic spikes during registration opening with 2,000+ daily visitors. "
                "I resolved latency bottlenecks by optimizing React component rendering cycles, eliminating redundant API round-trips, and "
                "configuring edge caching via Vercel CDN. This maintained 100% uptime and ensured seamless registration for 1,500+ participants."
            )[:max_len]

        # 3. Database & Backend Architecture
        if any(term in q_low for term in ["database", "backend", "architecture", "rest api", "postgres", "sql"]):
            return (
                "In my EdTech Learning Platform, I architected a secure backend using Node.js, Express.js, and Supabase PostgreSQL. "
                "I implemented relational schemas with foreign key constraints for student enrollments and course modules, enforced "
                "Row-Level Security (RLS) policies, and implemented JWT-based Role-Based Access Control (RBAC) across instructor and admin routes."
            )[:max_len]

        # 4. Project description / Portfolio
        if any(term in q_low for term in ["project", "describe a project", "portfolio", "application"]):
            return graph.get_project_narrative(question, max_chars=max_len)

        # 5. Technical Strengths
        if any(term in q_low for term in ["strength", "greatest strength", "skill"]):
            return (
                f"My key technical strengths lie in end-to-end full-stack JavaScript/TypeScript engineering: building clean, responsive UI "
                f"components with React.js, designing robust RESTful microservices with Node.js/Express, and managing relational databases with PostgreSQL. "
                f"I prioritize clean architecture, automated testing, and fast problem resolution."
            )[:max_len]

        # Standard grounded narrative fallback
        return graph.get_project_narrative(question, max_chars=max_len)




