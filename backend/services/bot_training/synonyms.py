"""
Domain Synonyms & Tech Stack Alias Dictionary
================================================================================
Normalizes recruiter phrasing, industry terminology, and programming synonyms
to canonical semantic representations for high-precision bot matching.
"""

from typing import Dict, List, Set, Optional

# Canonical category mapping
SYNONYM_CLUSTERS: Dict[str, List[str]] = {
    "notice_period": [
        "notice period", "official notice period", "notice period in days",
        "serving notice", "joining time", "how soon can you join", "when can you join",
        "joining availability", "immediate joiner", "can you join immediately",
        "earliest start date", "availability to join", "days required to join"
    ],
    "experience": [
        "total experience", "years of experience", "total years of experience",
        "relevant experience", "work experience", "experience in years",
        "total exp", "relevant exp", "hands on experience", "overall experience"
    ],
    "current_salary": [
        "current ctc", "current annual salary", "current salary", "present ctc",
        "current package", "present salary", "existing ctc", "current compensation",
        "current fixed ctc", "current in hand"
    ],
    "expected_salary": [
        "expected ctc", "expected annual salary", "expected salary", "salary expectation",
        "expected package", "desired ctc", "ctc expectation", "expected compensation",
        "minimum expected ctc", "target salary"
    ],
    "relocation": [
        "willing to relocate", "comfortable with relocating", "open to relocate",
        "relocation flexibility", "ready to move", "can relocate", "relocate to"
    ],
    "work_mode": [
        "work from office", "comfortable working from office", "wfo comfortable",
        "on site", "onsite", "in office", "hybrid availability", "ready to work from office"
    ],
    "fresher": [
        "are you a fresher", "fresher or experienced", "is this your first job",
        "entry level", "recent graduate", "new graduate"
    ],
    "qualification": [
        "highest qualification", "highest degree", "course degree", "education qualification",
        "highest educational qualification", "academic background", "graduation degree"
    ],
    "passing_year": [
        "graduation year", "year of passing", "passout year", "passing out year",
        "year of graduation", "batch of"
    ],
    "college": [
        "college name", "university name", "institute name", "engineering college",
        "alma mater", "school or university"
    ],
    "location": [
        "current location", "current city", "preferred location", "home town",
        "native location", "base location", "city of residence"
    ],
}

# Tech stack normalization aliases
TECH_ALIASES: Dict[str, str] = {
    "react": "react.js",
    "reactjs": "react.js",
    "react.js": "react.js",
    "node": "node.js",
    "nodejs": "node.js",
    "node.js": "node.js",
    "express": "express.js",
    "expressjs": "express.js",
    "express.js": "express.js",
    "js": "javascript",
    "ts": "typescript",
    "py": "python",
    "postgres": "postgresql",
    "postgre": "postgresql",
    "mongo": "mongodb",
    "rest": "rest apis",
    "restful": "rest apis",
    "rest api": "rest apis",
    "restful api": "rest apis",
    "rest apis": "rest apis",
}


def get_canonical_category(text: str) -> Optional[str]:
    """Identify the canonical question intent category from user or recruiter text."""
    t_clean = text.lower().strip()
    for category, phrases in SYNONYM_CLUSTERS.items():
        for phrase in phrases:
            if phrase in t_clean:
                return category
    return None


def expand_tech_aliases(text: str) -> str:
    """Replace non-standard technology mentions with canonical identifiers."""
    words = text.lower().split()
    expanded = []
    for w in words:
        stripped = w.strip(".,;:?!()")
        canonical = TECH_ALIASES.get(stripped, stripped)
        expanded.append(canonical)
    return " ".join(expanded)
