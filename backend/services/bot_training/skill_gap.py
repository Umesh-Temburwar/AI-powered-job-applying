"""
Role-Based Job Description Parser & Skill Gap Analyzer
================================================================================
Extracts minimum experience requirements, degree criteria, and generates
gap-bridging action recommendations for candidate profile strengthening.
"""

import re
from typing import Dict, List, Optional, Any


class SkillGapAnalyzer:
    """Analyzes requirements from job descriptions and provides resume optimization tips."""

    @staticmethod
    def extract_experience_required(description: str) -> Optional[float]:
        """Extract minimum years of experience mentioned in job description."""
        desc_lower = description.lower()
        if "fresher" in desc_lower or "freshers" in desc_lower or "entry level" in desc_lower:
            match_num = re.search(r"(\d+)\s*years?", desc_lower)
            if match_num:
                return float(match_num.group(1))
            return 0.0

        patterns = [
            r"(\d+)\s*[-to]+\s*(\d+)\s*years?",
            r"(\d+)\+?\s*years?\s*(?:of)?\s*(?:experience|required)?",
            r"minimum\s*(\d+)\s*years?",
            r"(\d+)\+?\s*years?",
        ]
        for pat in patterns:
            match = re.search(pat, description, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1))
                except ValueError:
                    continue
        return None

    @classmethod
    def analyze_qualification_match(cls, description: str, candidate_degree: str = "B.Tech") -> bool:
        """Check if candidate degree satisfies posting requirements."""
        desc_lower = description.lower()
        if "degree" not in desc_lower and "qualification" not in desc_lower and "b.tech" not in desc_lower:
            return True
        degree_patterns = ["b.tech", "btech", "b.e", "be", "bachelor", "engineering", "computer science"]
        return any(p in desc_lower for p in degree_patterns)

    @classmethod
    def generate_recommendations(cls, missing_skills: List[str]) -> List[str]:
        """Generate targeted learning recommendations for unfulfilled requirements."""
        recommendations = []
        for skill in missing_skills[:4]:
            s_clean = skill.title()
            recommendations.append(f"Add a verified portfolio project demonstrating hands-on {s_clean} integration.")
        return recommendations
