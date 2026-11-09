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
        self.profile = profile_data or self._load_default_profile()
        self.personal = self.profile.get("personal", {})
        self.name = self.personal.get("name") or "Umesh Temburwar"
        self.email = self.personal.get("email") or "umeshtemburwar2002@gmail.com"
        self.phone = self.personal.get("phone") or "+91 8856087984"
        self.current_location = self.personal.get("current_location") or "Pune, Maharashtra"
        self.preferred_locations = self.personal.get("preferred_locations") or ["Pune", "Bangalore", "Remote"]
        self.notice_period = self.personal.get("notice_period") or "Immediate (0 Days)"
        self.total_experience_years = float(self.personal.get("total_experience_years") or 1.0)
        self.expected_ctc = self.personal.get("expected_ctc") or "4.5 Lakhs"

        self.skills = self._normalize_skills(self.profile.get("key_skills", []))
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
            if any(k in q_low for k in ["traffic", "scale", "event", "performance"]) and "bytefest" in p["title"].lower():
                score += 2
            if any(k in q_low for k in ["nosql", "inventory", "crud"]) and "inventory" in p["title"].lower():
                score += 2
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
        return {
            "portfolio": "https://umeshtemburwar.vercel.app/",
            "github": "https://github.com/Umesh-Temburwar",
            "linkedin": "https://www.linkedin.com/in/umesh-temburwar-673555373/",
            "edtech_project": "https://edtechacademy.vercel.app/",
            "bytefest_project": "https://bytefest2k25.vercel.app/"
        }

    def _normalize_skills(self, skills_raw: List[str]) -> List[str]:
        if not skills_raw:
            return [
                "React.js", "JavaScript", "Node.js", "Express.js", "PostgreSQL",
                "MongoDB", "Supabase", "Git", "REST APIs", "Python", "C++", "HTML", "CSS"
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
        """Return standardized academic qualifications."""
        return {
            "degree": self.education.get("degree", "Bachelor of Technology (B.Tech)"),
            "major": self.education.get("field_of_study", "Computer Science and Engineering"),
            "college": self.education.get("institution", "MBES College of Engineering"),
            "location": self.education.get("location", "Ambajogai, Maharashtra"),
            "year": str(self.education.get("passing_year", "2025")),
            "cgpa": str(self.education.get("cgpa", "6.06")),
            "score": str(self.education.get("score", "6.06 CGPA"))
        }

    def get_cover_letter_elevator_pitch(self, target_role: str = "Full Stack Developer", max_chars: int = 650) -> str:
        """Generate high-conversion cover letter tailored directly to the target role."""
        skills_summary = ", ".join(self.skills[:7])
        pitch = (
            f"Dear Hiring Team,\n\n"
            f"I am writing to express my strong interest in the {target_role} position. "
            f"As a Computer Science graduate with hands-on full-stack development experience in {skills_summary}, "
            f"I have engineered and deployed responsive production web applications, including the EdTech Learning Platform "
            f"(built with React.js, Node.js/Express, and Supabase PostgreSQL with RBAC) and the ByteFest 2K25 portal "
            f"serving 2,000+ daily visitors.\n\n"
            f"I have an immediate notice period (0 Days) and am eager to bring high ownership, clean architectural practices, "
            f"and reliable problem-solving to your engineering team.\n\n"
            f"Best regards,\n{self.name}\n{self.phone} | {self.email}"
        )
        return pitch[:max_chars]

    def _load_projects(self) -> List[Dict[str, Any]]:
        projects = self.profile.get("projects") or []
        if not projects:
            projects = [
                {
                    "title": "EdTech Learning Platform",
                    "role": "Full Stack Developer",
                    "tech_stack": ["React.js", "Node.js", "Express.js", "Supabase PostgreSQL", "Supabase Auth", "Supabase Storage"],
                    "description": (
                        "Full-stack EdTech platform for courses, quizzes, assignments, certificates, and student progress tracking. "
                        "Engineered responsive React.js dashboards with Role-Based Access Control (RBAC), "
                        "integrated Supabase PostgreSQL database, and built secure Express.js REST APIs."
                    ),
                    "highlights": [
                        "Built responsive React dashboards with role-based access control for students, instructors, and admins",
                        "Integrated Supabase PostgreSQL, Auth, and Storage for authentication and media management",
                        "Developed secure Node.js/Express.js REST APIs for course catalog, quizzes, and certificates"
                    ],
                    "live_url": "https://edtechacademy.vercel.app/",
                    "metrics": "Production web application with complete course lifecycle and secure RBAC."
                },
                {
                    "title": "ByteFest 2K25 Event Platform",
                    "role": "Website Developer & Core Organizer",
                    "tech_stack": ["React.js", "JavaScript", "Node.js", "Tailwind CSS", "Vercel"],
                    "description": (
                        "Designed, built, and deployed high-traffic technical festival portal serving 2,000+ daily visitors. "
                        "Managed online participant registrations and event telemetry for 1,500+ attendees."
                    ),
                    "highlights": [
                        "Scaled website to smoothly handle 2,000+ daily concurrent visitors with zero downtime",
                        "Automated event registration and ticketing for 1,500+ participants",
                        "Provided technical support and live system telemetry during the festival"
                    ],
                    "live_url": "https://bytefest2k25.vercel.app/",
                    "metrics": "2,000+ daily attendees, 1,500+ participants."
                },
                {
                    "title": "Automobile Spare Parts Inventory Management System",
                    "role": "Backend & Database Developer",
                    "tech_stack": ["MongoDB", "Express.js", "React.js", "Node.js"],
                    "description": (
                        "Web-based inventory management system for automobile spare parts featuring secure CRUD operations, "
                        "role-based authentication, real-time category filtering, search index, and CSV audit reports."
                    ),
                    "highlights": [
                        "Designed scalable MongoDB collections for parts catalog, stock levels, and supplier invoices",
                        "Implemented search filtering and CSV reporting for stock audit workflows",
                        "Built role-based administrative authentication to prevent unauthorized inventory alterations"
                    ],
                    "live_url": "",
                    "metrics": "Optimized stock lookup and automated inventory audit reports."
                }
            ]
        return projects

    def _load_education(self) -> Dict[str, Any]:
        edu_list = self.profile.get("education") or []
        if isinstance(edu_list, list) and edu_list:
            return edu_list[0]
        return {
            "degree": "Bachelor of Technology (B.Tech)",
            "field_of_study": "Computer Science and Engineering",
            "institution": "MBES College of Engineering",
            "location": "Ambajogai, Maharashtra",
            "passing_year": "2025",
            "cgpa": "6.06",
            "score": "6.06 CGPA"
        }

    def _load_experience(self) -> List[Dict[str, Any]]:
        exp_list = self.profile.get("experience") or []
        if not exp_list:
            exp_list = [
                {
                    "role": "Project Coordinator & Core Tech Member",
                    "company": "ByteFest",
                    "duration": "May 2025 - June 2025",
                    "location": "Ambajogai, Maharashtra | On-site",
                    "responsibilities": [
                        "Designed and deployed fast, responsive, and dynamic event website",
                        "Handled secure data management of participant registrations",
                        "Coordinated technical fest execution and live system monitoring"
                    ]
                }
            ]
        return exp_list
