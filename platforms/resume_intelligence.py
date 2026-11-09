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
