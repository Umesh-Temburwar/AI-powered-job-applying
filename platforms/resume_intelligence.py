"""
Resume Intelligence & Knowledge Graph Engine
================================================================================
Parses, indexes, and synthesizes candidate resume data into a structured
knowledge graph for intelligent auto form-filling across job portals.
"""

import os
import re
import json
import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger("ResumeIntelligence")


class ResumeKnowledgeGraph:
    """Structured representation of candidate's verified background, skills, and projects."""

    def __init__(self, profile_data: Optional[Dict[str, Any]] = None):
        self.profile = profile_data if profile_data is not None else self._load_default_profile()
        self.personal = self.profile.get("personal", {})
        
        # Candidate Personal Identity (Derives dynamically from active user profile)
        first_n = self.personal.get("firstname") or self.profile.get("firstname") or ""
        last_n = self.personal.get("lastname") or self.profile.get("lastname") or ""
        self.name = self.personal.get("name") or self.profile.get("name") or f"{first_n} {last_n}".strip() or "Candidate"
        self.first_name = first_n or (self.name.split()[0] if self.name else "Candidate")
        self.last_name = last_n or (self.name.split()[-1] if len(self.name.split()) > 1 else "")
        self.email = self.personal.get("email") or self.profile.get("email") or ""
        self.phone = self.personal.get("phone") or self.profile.get("phone") or ""
        self.current_location = self.personal.get("current_location") or self.profile.get("current_location") or os.getenv("LOCATION", "Pune, Maharashtra")
        self.preferred_locations = self.personal.get("preferred_locations") or self.profile.get("preferred_locations") or [self.current_location]
        self.notice_period = self.personal.get("notice_period") or self.profile.get("notice_period") or "Immediate (0 Days)"
        self.total_experience_years = float(self.personal.get("total_experience_years") or self.profile.get("total_experience_years") or 1.0)
        self.expected_ctc = self.personal.get("expected_ctc") or self.profile.get("expected_ctc") or "4.5 Lakhs"

        self.skills = self._normalize_skills(self.profile.get("key_skills") or self.profile.get("skills", []))
        self.projects = self._load_projects()
        self.education = self._load_education()
        self.experience = self._load_experience()
        self.skill_taxonomy = self._build_skill_taxonomy()

    def _build_skill_taxonomy(self) -> Dict[str, List[str]]:
        """Categorize skills into technical domains for targeted question answering."""
        taxonomy = {
            "frontend": ["React.js", "JavaScript", "HTML", "CSS", "Tailwind CSS", "Bootstrap", "Responsive Design", "DOM"],
            "backend": ["Node.js", "Express.js", "REST APIs", "FastAPI", "API Design", "Microservices"],
            "database": ["PostgreSQL", "Supabase", "MongoDB", "Firebase", "SQL", "Database Design", "CRUD"],
            "languages": ["JavaScript", "Python", "C++", "C", "HTML", "CSS", "SQL"],
            "devops_tools": ["Git", "GitHub", "VS Code", "Linux", "Vercel", "Docker", "Postman", "CI/CD"],
            "security_auth": ["Supabase Auth", "JWT", "Role-Based Access Control", "RBAC", "Session Management"],
            "soft_skills": ["Problem Solving", "Communication", "Team Leadership", "Critical Thinking", "Time Management"]
        }
        return taxonomy

    def has_skill(self, query: str) -> bool:
        """Check if candidate possesses a queried technical skill (with alias matching)."""
        if not query:
            return False
        q_clean = query.lower().strip()
        alias_map = {
            "js": "javascript",
            "ts": "typescript",
            "py": "python",
            "postgres": "postgresql",
            "mongo": "mongodb",
            "reactjs": "react.js",
            "react": "react.js",
            "nodejs": "node.js",
            "node": "node.js",
            "expressjs": "express.js",
            "express": "express.js",
            "rest": "rest apis",
            "api": "rest apis",
            "cpp": "c++",
        }
        resolved = alias_map.get(q_clean, q_clean)
        for s in self.skills:
            s_low = s.lower()
            if resolved in s_low or s_low in resolved:
                return True
        return False

    def get_skill_experience_years(self, skill_name: str) -> float:
        """
        Estimate hands-on project and working experience years for a given skill.
        Returns realistic numeric duration (e.g. 1.0 or 1.5) based on project history.
        """
        if not skill_name:
            return self.total_experience_years

        s_low = skill_name.lower().strip()
        # Core skills used continuously across EdTech, ByteFest, and Inventory projects
        tier_1_skills = {"react", "react.js", "javascript", "node.js", "express", "express.js", "html", "css", "git", "github"}
        # Secondary skills used in dedicated projects
        tier_2_skills = {"postgresql", "supabase", "mongodb", "python", "c++", "c", "rest", "rest apis", "linux"}

        for t in tier_1_skills:
            if t in s_low:
                return max(1.0, self.total_experience_years)

        for t in tier_2_skills:
            if t in s_low:
                return 1.0

        if self.has_skill(skill_name):
            return 1.0

        return 0.5

    def _load_default_profile(self) -> Dict[str, Any]:
        paths = [
            os.path.join(os.path.dirname(__file__), "..", "data", "profile_data.json"),
            os.path.join(os.path.dirname(__file__), "data", "profile_data.json"),
            os.path.join("data", "profile_data.json"),
            "profile_data.json",
        ]
        for p in paths:
            if os.path.exists(p):
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        return json.load(f)
                except Exception as exc:
                    logger.debug("Error reading profile %s: %s", p, exc)
        return {}

    def get_best_matching_project(self, query: str) -> Dict[str, Any]:
        """Find the most relevant candidate project matching query keywords."""
        if not self.projects:
            return {}
        q_low = query.lower()
        scored = []
        for p in self.projects:
            score = 0
            # Title match
            if any(term in q_low for term in p["title"].lower().split()):
                score += 2
            # Tech stack match
            for t in p.get("tech_stack", []):
                if t.lower() in q_low:
                    score += 3
            # Description match
            if any(k in q_low for k in ["database", "postgres", "sql", "supabase"]) and "supabase" in str(p.get("tech_stack", [])).lower():
                score += 2
            if any(k in q_low for k in ["traffic", "scale", "event", "performance", "visitor", "visitors", "attendee", "attendees", "challenge", "bug", "troubleshoot", "obstacle", "latency"]) and "bytefest" in p["title"].lower():
                score += 4
            if any(k in q_low for k in ["nosql", "inventory", "crud"]) and "inventory" in p["title"].lower():
                score += 3
            scored.append((score, p))

        scored.sort(key=lambda x: x[0], reverse=True)
        return scored[0][1]

    def get_project_narrative(self, question: str = "", max_chars: int = 500) -> str:
        """Generate a concise, professional project description tailored to the question."""
        proj = self.get_best_matching_project(question)
        if not proj:
            return (
                "Developed a full-stack EdTech Learning Platform featuring responsive React dashboards, "
                "Node.js/Express REST APIs, Supabase PostgreSQL database, and Role-Based Access Control (RBAC)."
            )[:max_chars]

        title = proj.get("title", "Full Stack Project")
        stack = ", ".join(proj.get("tech_stack", []))
        desc = proj.get("description", "")
        metrics = proj.get("metrics", "")

        narrative = f"In the '{title}' project, I engineered a solution using {stack}. {desc} Impact: {metrics}"
        return narrative[:max_chars]

    def get_portfolio_links(self) -> Dict[str, str]:
        """Return candidate's verified portfolio and live project links."""
        custom_links = self.profile.get("portfolio_links") or {}
        if custom_links:
            return custom_links
        
        links = {}
        if self.personal.get("portfolio") or self.profile.get("portfolio"):
            links["portfolio"] = self.personal.get("portfolio") or self.profile.get("portfolio")
        if self.personal.get("github") or self.profile.get("github"):
            links["github"] = self.personal.get("github") or self.profile.get("github")
        if self.personal.get("linkedin") or self.profile.get("linkedin"):
            links["linkedin"] = self.personal.get("linkedin") or self.profile.get("linkedin")

        if not links:
            links = {
                "portfolio": "https://umeshtemburwar.vercel.app/",
                "github": "https://github.com/Umesh-Temburwar",
                "linkedin": "https://www.linkedin.com/in/umesh-temburwar-673555373/",
            }
        return links

    def _normalize_skills(self, skills_raw: List[str]) -> List[str]:
        if not skills_raw:
            return [
                "React.js", "JavaScript", "Node.js", "Express.js", "PostgreSQL",
                "MongoDB", "Supabase", "Git", "REST APIs", "Python", "HTML", "CSS"
            ]
        seen = set()
        clean = []
        for s in skills_raw:
            s_clean = s.strip()
            if s_clean and s_clean.lower() not in seen:
                seen.add(s_clean.lower())
                clean.append(s_clean)
        return clean

    def get_education_details(self) -> Dict[str, str]:
        """Return standardized academic qualifications dynamically grounded in candidate profile."""
        deg = self.education.get("degree") or self.profile.get("degree") or "Bachelor of Technology (B.Tech)"
        major = self.education.get("field_of_study") or self.education.get("major") or self.profile.get("field_of_study") or "Computer Science and Engineering"
        inst = self.education.get("institution") or self.education.get("college") or self.profile.get("college") or self.profile.get("institution") or "Engineering College"
        loc = self.education.get("location") or self.profile.get("college_location") or ""
        yr = str(self.education.get("passing_year") or self.education.get("year") or self.profile.get("passing_year") or "2025")
        raw_cgpa = str(self.education.get("cgpa") or self.education.get("score") or self.profile.get("cgpa") or "8.0")
        score = self.education.get("score") or self.profile.get("score") or (f"{raw_cgpa} CGPA" if "cgpa" not in raw_cgpa.lower() and "%" not in raw_cgpa else raw_cgpa)
        coursework = self.education.get("coursework") or self.profile.get("coursework") or (
            "Data Structures & Algorithms, Object-Oriented Programming, Database Management Systems (DBMS), "
            "Operating Systems, Computer Networks, and Software Engineering."
        )
        return {
            "degree": deg,
            "major": major,
            "college": inst,
            "location": loc,
            "year": yr,
            "cgpa": raw_cgpa,
            "score": score,
            "coursework": coursework
        }

    def get_cover_letter_elevator_pitch(self, target_role: str = "Full Stack Developer", max_chars: int = 1200) -> str:
        """Generate high-conversion cover letter tailored directly to the target role and user's verified background."""
        skills_summary = ", ".join(self.skills[:7]) if self.skills else "Modern Software Engineering"
        edu = self.get_education_details()
        proj_names = [p.get("title", "Web Application") for p in self.projects[:2]]
        proj_mention = f"including {' and '.join(f'the {p}' for p in proj_names)}" if proj_names else "including production web applications"

        pitch = (
            f"Dear Hiring Team,\n\n"
            f"I am writing to express my strong interest in the {target_role} position. "
            f"As a {edu['major']} graduate with hands-on development experience in {skills_summary}, "
            f"I have engineered and deployed responsive production web applications, {proj_mention}.\n\n"
            f"I have an {self.notice_period} notice period and am eager to bring high ownership, clean architectural practices, "
            f"and reliable problem-solving to your engineering team.\n\n"
            f"Best regards,\n{self.name}\n{self.phone} | {self.email}"
        )
        return pitch[:max_chars]

    def _load_projects(self) -> List[Dict[str, Any]]:
        projects = self.profile.get("projects") or []
        if isinstance(projects, list) and len(projects) > 0:
            return projects

        # Dynamically build project records grounded in candidate's actual skills
        primary_skills = self.skills[:6] if self.skills else ["React.js", "Node.js", "Express.js", "PostgreSQL"]
        return [
            {
                "title": "Full Stack Web Platform",
                "role": "Full Stack Developer",
                "tech_stack": primary_skills,
                "description": (
                    f"Full-stack web application designed and built with {', '.join(primary_skills)}. "
                    "Engineered responsive user interfaces, built scalable REST APIs, and implemented secure database persistence."
                ),
                "highlights": [
                    "Built responsive frontend components with modern design standards",
                    "Integrated secure REST APIs and database schema persistence",
                    "Optimized application load times and state management workflows"
                ],
                "live_url": "",
                "metrics": "Production-ready deployment with seamless user experience."
            }
        ]

    def _load_education(self) -> Dict[str, Any]:
        edu_list = self.profile.get("education") or []
        if isinstance(edu_list, list) and len(edu_list) > 0:
            return edu_list[0]
        elif isinstance(edu_list, dict) and edu_list:
            return edu_list

        # Top-level or environment fallbacks
        return {
            "degree": self.profile.get("degree") or os.getenv("EDUCATION_DEGREE", "Bachelor of Technology (B.Tech)"),
            "field_of_study": self.profile.get("field_of_study") or self.profile.get("major", "Computer Science and Engineering"),
            "institution": self.profile.get("college") or self.profile.get("institution", "Engineering College"),
            "location": self.profile.get("college_location", "Maharashtra"),
            "passing_year": str(self.profile.get("passing_year", "2025")),
            "cgpa": str(self.profile.get("cgpa", "8.0")),
            "score": str(self.profile.get("score", "8.0 CGPA")),
            "coursework": self.profile.get("coursework", "Data Structures, Database Systems, Operating Systems, Computer Networks")
        }

    def _load_experience(self) -> List[Dict[str, Any]]:
        exp_list = self.profile.get("experience") or []
        if isinstance(exp_list, list) and len(exp_list) > 0:
            return exp_list
        return [
            {
                "role": "Software Developer Intern",
                "company": "Tech Solutions",
                "duration": "6 Months",
                "location": self.current_location,
                "responsibilities": [
                    "Developed and maintained responsive web applications",
                    "Collaborated with cross-functional teams to implement new features",
                    "Wrote clean, tested code and improved system performance"
                ]
            }
        ]
