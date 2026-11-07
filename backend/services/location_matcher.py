"""
Location Matcher & Strict Geolocation Filtering Engine
================================================================================
Analyzes and enforces candidate's configured target locations across all job portals
(Naukri, Internshala, Indeed, LinkedIn, Glassdoor, Shine, etc.).

Ensures the bot ONLY applies to jobs/internships matching the user's selected
cities and remote preferences, strictly skipping/ignoring any out-of-scope locations.
"""

import os
import re
import json
import logging
from typing import List, Union, Optional

logger = logging.getLogger("LocationMatcher")

# Bidirectional lookup builder for city clusters
LOCATION_CLUSTERS = [
    {"pune", "pimpri", "chinchwad", "hinjewadi", "magarpatta", "pcmc", "kharadi", "hadapsar", "baner", "wakad"},
    {"bangalore", "bengaluru", "whitefield", "electronic city", "bellandur", "koramangala", "indiranagar"},
    {"mumbai", "bombay", "navi mumbai", "thane", "andheri", "bkc", "powai", "airoli", "vashi"},
    {"delhi", "new delhi", "ncr", "gurgaon", "gurugram", "noida", "greater noida", "ghaziabad", "faridabad", "delhi ncr"},
    {"hyderabad", "secunderabad", "cyberabad", "hitec city", "gachibowli", "madhapur", "kondapur"},
    {"chennai", "madras", "omr", "taramani", "guindy"},
    {"kolkata", "calcutta", "salt lake", "new town"},
    {"ahmedabad", "gandhinagar", "gift city"},
    {"ambajogai", "amba", "beed", "latur", "marathwada"},
    {"nagpur", "mihan"},
    {"indore", "super corridor"},
]

CITY_SYNONYMS = {}
for cluster in LOCATION_CLUSTERS:
    for city in cluster:
        CITY_SYNONYMS[city] = list(cluster)

REMOTE_TERMS = {"remote", "work from home", "wfh", "virtual", "anywhere", "work from anywhere", "telecommute", "home", "home-based"}


def parse_target_locations(
    explicit_locations: Optional[Union[str, List[str]]] = None,
    profile_data: Optional[dict] = None,
    locations: Optional[Union[str, List[str]]] = None,
    **kwargs
) -> List[str]:
    """
    Extract and clean user's configured target locations from:
    1. Explicit function argument
    2. Passed profile_data
    3. Environment variable LOCATION
    4. data/profile_data.json (preferred_locations or current_location)
    5. Default fallback: ['pune', 'remote']
    """
    candidates: List[str] = []

    # 1. From explicit argument
    target_arg = explicit_locations if explicit_locations is not None else locations
    if target_arg:
        if isinstance(target_arg, str):
            candidates.extend([loc.strip() for loc in target_arg.split(",") if loc.strip()])
        elif isinstance(target_arg, list):
            for item in target_arg:
                if isinstance(item, str):
                    for sub in item.split(","):
                        if sub.strip():
                            candidates.append(sub.strip())

    # 2. From environment variable
    if not candidates:
        env_loc = os.getenv("LOCATION", "").strip()
        if env_loc:
            candidates.extend([loc.strip() for loc in env_loc.split(",") if loc.strip()])

    # 3. From passed profile_data or reading profile_data.json
    if not candidates and profile_data:
        personal = profile_data.get("personal", {})
        prefs = personal.get("preferred_locations") or []
        if isinstance(prefs, list):
            for p in prefs:
                if isinstance(p, str) and p.strip():
                    candidates.append(p.strip())
        curr = personal.get("current_location", "").strip()
        if curr and curr not in candidates:
            candidates.append(curr)

    if not candidates:
        potential_paths = [
            os.path.join(os.path.dirname(__file__), "..", "..", "data", "profile_data.json"),
            os.path.join(os.path.dirname(__file__), "..", "data", "profile_data.json"),
            os.path.join("data", "profile_data.json"),
            "profile_data.json",
        ]
        for ppath in potential_paths:
            if os.path.exists(ppath):
                try:
                    with open(ppath, "r", encoding="utf-8") as f:
                        pdata = json.load(f)
                        personal = pdata.get("personal", {})
                        prefs = personal.get("preferred_locations") or []
                        if isinstance(prefs, list):
                            for p in prefs:
                                if isinstance(p, str) and p.strip():
                                    candidates.append(p.strip())
                        curr = personal.get("current_location", "").strip()
                        if curr and curr not in candidates:
                            candidates.append(curr)
                    if candidates:
                        break
                except Exception as exc:
                    logger.debug("profile_data.json location read notice: %s", exc)

    # 4. Standard default fallback
    if not candidates:
        candidates = ["Pune", "Remote"]

    # De-duplicate while preserving casing order
    clean_list: List[str] = []
    seen = set()
    for loc in candidates:
        low = loc.lower()
        if low not in seen:
            seen.add(low)
            clean_list.append(loc)

    return clean_list


def is_location_match(
    job_location: Optional[str],
    target_locations: Optional[Union[str, List[str]]] = None,
    allow_remote: bool = True,
    **kwargs
) -> bool:
    """
    Strictly evaluate if a job or internship posting matches user's target locations.
    
    Returns:
        True  -> Location matches candidate's criteria. Proceed with applying.
        False -> Location is out-of-scope. Skip / ignore the job.
    """
    targets = parse_target_locations(target_locations)
    if not targets:
        return True  # If no preference at all, allow all

    targets_lower = [t.lower().strip() for t in targets if t.strip()]

    # If user explicitly specified 'any', 'all', 'india', or 'anywhere', accept all
    if any(t in ["all", "any", "anywhere", "india", "pan india"] for t in targets_lower):
        return True

    # Check if user accepts remote roles
    user_wants_remote = allow_remote and any(t in REMOTE_TERMS for t in targets_lower)

    if not job_location:
        # If job has no location specified, allow if user allows remote or if only general role
        return user_wants_remote

    loc_str = str(job_location).lower().strip()

    # 1. Check if job is remote / WFH
    is_job_remote = any(re.search(r'\b' + re.escape(term) + r'\b', loc_str) for term in REMOTE_TERMS)
    if is_job_remote and user_wants_remote:
        return True

    # 2. Check each target city against the job location text
    for target in targets_lower:
        if target in REMOTE_TERMS:
            continue

        # Direct word match or exact boundary match
        pattern = r'\b' + re.escape(target) + r'\b'
        if re.search(pattern, loc_str):
            return True

        # Check regional cluster synonyms (e.g. Pune matches Hinjewadi or Pimpri)
        synonyms = CITY_SYNONYMS.get(target, [])
        for syn in synonyms:
            syn_pattern = r'\b' + re.escape(syn) + r'\b'
            if re.search(syn_pattern, loc_str):
                return True

    # 3. Multi-city postings check: e.g. "Pune / Bangalore / Hyderabad"
    sub_cities = re.split(r'[/,|+&;\-]', loc_str)
    for sub in sub_cities:
        sub_clean = sub.strip()
        if not sub_clean:
            continue
        for target in targets_lower:
            if target in REMOTE_TERMS:
                continue
            if target == sub_clean or target in sub_clean:
                return True
            for syn in CITY_SYNONYMS.get(target, []):
                if syn == sub_clean or syn in sub_clean:
                    return True

    # If job is remote but candidate didn't specify remote and allow_remote is False
    if is_job_remote and not user_wants_remote:
        return False

    # Out of scope location
    return False


def get_location_search_slugs(target_locations: Optional[Union[str, List[str]]] = None) -> List[str]:
    """
    Generate normalized portal URL slugs for configured target locations.
    Example: ['Pune', 'Remote'] -> ['pune', 'work-from-home']
    """
    targets = parse_target_locations(target_locations)
    slugs = []
    for loc in targets:
        low = loc.lower().strip()
        if low in REMOTE_TERMS:
            if "work-from-home" not in slugs:
                slugs.append("work-from-home")
        else:
            clean_slug = re.sub(r'[^a-z0-9]+', '-', low).strip('-')
            if clean_slug and clean_slug not in slugs:
                slugs.append(clean_slug)
    return slugs

