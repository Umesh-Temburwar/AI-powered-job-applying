"""
Dynamic Answer Quality Guardrails & Form Sanitizer
================================================================================
Validates, sanitizes, and coerces bot-generated screening answers before
submission to live job application portals (Naukri, LinkedIn, Indeed, Internshala).
"""

import re
from typing import Optional

PLACEHOLDER_LEAK_RE = re.compile(r"\{\{[^}]+\}\}")
NUMBER_EXTRACT_RE = re.compile(r"\d+(?:\.\d+)?")


def strip_markdown_artifacts(text: str) -> str:
    """Remove raw Markdown tokens (**bold**, `code`, headings) unsuitable for plain ATS inputs."""
    if not text:
        return ""
    cleaned = re.sub(r"[`*_#]+", "", text)
    return re.sub(r"\s{2,}", " ", cleaned).strip()


def sanitize_numeric_answer(answer: str, default: str = "0") -> str:
    """Extract clean numeric value for HTML <input type='number'> fields."""
    if not answer:
        return default
    ans_low = answer.strip().lower()
    if any(tok in ans_low for tok in ["immediate", "fresher", "none", "zero", "n/a"]):
        match = NUMBER_EXTRACT_RE.search(ans_low)
        return match.group(0) if match else "0"
    match = NUMBER_EXTRACT_RE.search(ans_low)
    return match.group(0) if match else default


def sanitize_boolean_answer(answer: str, default: str = "Yes") -> str:
    """Coerce free-form responses into canonical Yes/No radio answers."""
    if not answer:
        return default
    ans_low = answer.strip().lower()
    if ans_low.startswith("no") or any(neg in ans_low for neg in ["not comfortable", "cannot", "do not", "unpaid"]):
        return "No"
    if ans_low.startswith("yes") or any(pos in ans_low for pos in ["available", "willing", "ready", "comfortable"]):
        return "Yes"
    return default


def truncate_cleanly(text: str, max_chars: int) -> str:
    """Truncate text without cutting words awkwardly in half."""
    if not text or max_chars <= 0 or len(text) <= max_chars:
        return text
    cut = text[:max_chars].rsplit(" ", 1)[0].rstrip(" ,;:-")
    return cut if cut else text[:max_chars]


def guard_form_answer(
    answer: str,
    field_type: str = "text",
    max_chars: Optional[int] = None,
    fallback: str = "Yes",
) -> str:
    """
    Apply full safety & formatting guardrails to a candidate answer:
    1. Strip any leaked {{placeholder}} tokens.
    2. Remove markdown formatting symbols.
    3. Coerce numeric and radio/boolean field types.
    4. Enforce max_chars cleanly.
    """
    cleaned = PLACEHOLDER_LEAK_RE.sub("", answer or "").strip()
    cleaned = strip_markdown_artifacts(cleaned)

    ft = (field_type or "text").strip().lower()
    if ft in {"number", "numeric", "integer", "float"}:
        return sanitize_numeric_answer(cleaned, default="0")

    if ft in {"radio", "boolean", "checkbox"}:
        return sanitize_boolean_answer(cleaned, default=fallback if fallback in {"Yes", "No"} else "Yes")

    if not cleaned:
        cleaned = fallback

    if max_chars is not None and max_chars > 0:
        cleaned = truncate_cleanly(cleaned, max_chars)

    return cleaned
