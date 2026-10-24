"""Core utility functions for backend text cleaning, query normalization, and URL parsing."""

import re
import urllib.parse
from typing import List, Optional


def sanitize_search_query(query: str) -> str:
    """Sanitize and strip dangerous or special characters from job search terms."""
    if not query:
        return ""
    # Strip HTML tags
    cleaned = re.sub(r"<[^>]+>", "", query)
    # Remove control characters
    cleaned = "".join(ch for ch in cleaned if ord(ch) >= 32)
    # Collapse multiple whitespaces
    return " ".join(cleaned.split()).strip()


def normalize_job_url(raw_url: str) -> str:
    """Normalize job portal URL by removing tracking query parameters (utm_*, etc.)."""
    if not raw_url:
        return ""
    try:
        parsed = urllib.parse.urlparse(raw_url.strip())
        query_params = urllib.parse.parse_qsl(parsed.query)
        filtered_params = [
            (k, v) for k, v in query_params
            if not k.lower().startswith("utm_") and k.lower() not in {"fbclid", "gclid", "ref"}
        ]
        clean_query = urllib.parse.urlencode(filtered_params)
        return urllib.parse.urlunparse((
            parsed.scheme,
            parsed.netloc,
            parsed.path,
            parsed.params,
            clean_query,
            ""  # drop fragment
        ))
    except Exception:
        return raw_url.strip()


def split_comma_separated(value: Optional[str]) -> List[str]:
    """Split comma or semicolon-separated values into a clean deduplicated list."""
    if not value:
        return []
    items = re.split(r"[,;]+", value)
    result = []
    seen = set()
    for item in items:
        cleaned = item.strip()
        if cleaned and cleaned.lower() not in seen:
            seen.add(cleaned.lower())
            result.append(cleaned)
    return result
