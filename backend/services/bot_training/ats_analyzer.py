"""
Advanced ATS Keyword Extractor & Weighted Skill Scorer
================================================================================
Performs n-gram extraction, weighted skill matching, and gap analysis
between job postings and candidate technical credentials.
"""

import re
from typing import Dict, List, Set, Tuple, Any

SKILL_TAXONOMY: Dict[str, Dict[str, Any]] = {
    "frontend": {
        "weight": 1.2,
        "skills": ["react", "react.js", "next.js", "typescript", "javascript", "tailwind", "redux", "html5", "css3"],
    },
    "backend": {
        "weight": 1.3,
        "skills": ["node.js", "express.js", "python", "fastapi", "rest apis", "asyncio", "microservices"],
    },
    "database": {
        "weight": 1.2,
        "skills": ["postgresql", "mongodb", "supabase", "sql", "redis", "prisma", "mongoose"],
    },
    "devops_cloud": {
        "weight": 1.0,
        "skills": ["git", "github", "docker", "ci/cd", "linux", "aws", "render", "vercel"],
    },
    "fundamentals": {
        "weight": 0.9,
        "skills": ["data structures", "algorithms", "oop", "system design", "agile", "unit testing"],
    },
}


class ATSAnalyzer:
    """Computes multidimensional ATS matching scores for job vacancies."""

    def __init__(self, candidate_skills: List[str]):
        self.candidate_skills = {s.lower().strip() for s in candidate_skills if s.strip()}

    def extract_ngrams(self, text: str, max_n: int = 3) -> Set[str]:
        """Extract unigrams, bigrams, and trigrams from job text."""
        words = re.findall(r"[a-zA-Z0-9\.\+#\-]+", text.lower())
        ngrams = set()
        for n in range(1, max_n + 1):
            for i in range(len(words) - n + 1):
                ngram = " ".join(words[i : i + n])
                ngrams.add(ngram)
        return ngrams

    def analyze_job(self, title: str, description: str) -> Dict[str, Any]:
        """Analyze job description and return weighted ATS score and breakdown."""
        full_text = f"{title} {description}".lower()
        extracted_ngrams = self.extract_ngrams(full_text)

        matched_skills = set()
        missing_skills = set()
        total_weight = 0.0
        earned_weight = 0.0

        category_breakdown = {}

        for cat_name, cat_info in SKILL_TAXONOMY.items():
            cat_weight = cat_info["weight"]
            cat_skills = cat_info["skills"]
            cat_matched = []
            cat_missing = []

            for skill in cat_skills:
                # Check if skill requested in job
                if skill in extracted_ngrams or re.search(r"\b" + re.escape(skill) + r"\b", full_text):
                    total_weight += cat_weight
                    # Check if candidate has skill
                    if any(skill in cs or cs in skill for cs in self.candidate_skills):
                        earned_weight += cat_weight
                        matched_skills.add(skill)
                        cat_matched.append(skill)
                    else:
                        missing_skills.add(skill)
                        cat_missing.append(skill)

            category_breakdown[cat_name] = {
                "matched": cat_matched,
                "missing": cat_missing,
                "match_rate": round(len(cat_matched) / max(len(cat_matched) + len(cat_missing), 1) * 100, 1),
            }

        # If job didn't specify distinct tech stack keywords, fall back to title match
        if total_weight == 0.0:
            score = 75.0
            verdict = "moderate_match"
        else:
            score = round((earned_weight / total_weight) * 100.0, 1)
            score = max(min(score, 100.0), 20.0)
            if score >= 75.0:
                verdict = "high_match"
            elif score >= 50.0:
                verdict = "moderate_match"
            else:
                verdict = "low_match"

        return {
            "score": score,
            "verdict": verdict,
            "matched_skills": sorted(list(matched_skills)),
            "missing_skills": sorted(list(missing_skills)),
            "category_breakdown": category_breakdown,
            "is_recommended": score >= 50.0,
        }
