"""
Recruiter Question Normalizer & Pre-Processor
================================================================================
Cleans noisy ATS form labels, expands common HR abbreviations, strips mandatory
markers / question numbers, and normalizes phrasing before intent matching.
"""

import re
from typing import Dict

from .synonyms import expand_tech_aliases

HR_ABBREVIATIONS: Dict[str, str] = {
    "exp": "experience",
    "yrs": "years",
    "yr": "year",
    "sal": "salary",
    "pkg": "package",
    "loc": "location",
    "np": "notice period",
    "wfo": "work from office",
    "wfh": "work from home",
    "ctc": "ctc",
    "lpa": "lakhs per annum",
    "grad": "graduation",
    "deg": "degree",
    "qual": "qualification",
    "bgv": "background verification",
    "reloc": "relocation",
    "imm": "immediate",
    "avail": "available",
}

HINGLISH_PHRASES: Dict[str, str] = {
    "kitna experience": "how much experience",
    "kab join kar sakte": "when can you join",
    "current salary kya hai": "what is your current salary",
    "expected salary kya hai": "what is your expected salary",
    "relocate kar sakte": "willing to relocate",
    "notice period kitna": "what is your notice period",
}


def normalize_question(raw_question: str) -> str:
    """
    Clean and normalize an ATS screening question for high-precision matching.
    Removes numbering prefixes, asterisks, mandatory tags, and expands abbreviations.
    """
    if not raw_question:
        return ""

    text = raw_question.strip().lower()

    # Strip leading numbering like "1.", "Q1:", "Question 3 -"
    text = re.sub(r"^(?:q(?:uestion)?\s*\d+[\.\:\-\)]\s*|\d+[\.\:\-\)]\s*)", "", text)

    # Remove "(required)", "(mandatory)", "(optional)", trailing asterisks
    text = re.sub(r"\((?:required|mandatory|optional|in years|in lpa|in days)\)", " ", text)
    text = text.replace("*", " ")

    # Normalize Hinglish phrases
    for src, dst in HINGLISH_PHRASES.items():
        if src in text:
            text = text.replace(src, dst)

    # Replace punctuation with spaces except +/#/. inside tech names
    text = re.sub(r"[^\w\s\.\+\#\/\-]", " ", text)

    # Expand HR abbreviations token-by-token
    tokens = text.split()
    expanded_tokens = [HR_ABBREVIATIONS.get(tok.strip("."), tok) for tok in tokens]
    cleaned = " ".join(expanded_tokens)

    # Expand tech aliases
    cleaned = expand_tech_aliases(cleaned)

    # Collapse whitespace
    return re.sub(r"\s+", " ", cleaned).strip()


def extract_numeric_unit(raw_question: str) -> str:
    """Detect whether a recruiter question expects days, months, years, LPA, INR, or percent."""
    q = (raw_question or "").lower()
    if any(k in q for k in ["in lpa", "lakhs", "lakh", "per annum", "annual ctc", "expected ctc", "current ctc"]):
        return "lpa"
    if any(k in q for k in ["monthly", "per month", "stipend", "in hand"]):
        return "monthly_inr"
    if any(k in q for k in ["in days", "notice period", "days"]):
        return "days"
    if any(k in q for k in ["in months", "months"]):
        return "months"
    if any(k in q for k in ["cgpa", "gpa"]):
        return "cgpa"
    if any(k in q for k in ["percentage", "percent", "%", "marks"]):
        return "percentage"
    if any(k in q for k in ["years", "yrs", "experience"]):
        return "years"
    return "text"
