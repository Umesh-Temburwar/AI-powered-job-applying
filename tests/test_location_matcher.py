import pytest
from platforms.location_matcher import is_location_match, parse_target_locations, get_location_search_slugs


def test_location_match_direct_city():
    assert is_location_match("Pune", ["Pune"]) is True
    assert is_location_match("Pune, Maharashtra", ["Pune"]) is True
    assert is_location_match("Pimpri-Chinchwad, Pune", ["Pune"]) is True
    assert is_location_match("Hinjewadi, Pune", ["Pune"]) is True


def test_location_mismatch_different_city():
    # User targeted Pune only - Delhi, Bangalore, Noida must be rejected
    assert is_location_match("Noida", ["Pune"]) is False
    assert is_location_match("Delhi, NCR", ["Pune"]) is False
    assert is_location_match("Bengaluru", ["Pune"]) is False
    assert is_location_match("Chennai, Tamil Nadu", ["Pune"]) is False
    assert is_location_match("Gurgaon, Haryana", ["Pune"]) is False


def test_location_match_synonyms():
    # Bangalore <-> Bengaluru
    assert is_location_match("Bengaluru", ["Bangalore"]) is True
    assert is_location_match("Bangalore / Whitefield", ["Bengaluru"]) is True
    # Mumbai <-> Bombay / Navi Mumbai
    assert is_location_match("Navi Mumbai", ["Mumbai"]) is True
    assert is_location_match("Thane, Maharashtra", ["Mumbai"]) is True
    # Gurgaon <-> Gurugram / NCR
    assert is_location_match("Gurugram", ["Gurgaon"]) is True


def test_location_match_ambajogai():
    assert is_location_match("Ambajogai", ["Ambajogai"]) is True
    assert is_location_match("Ambajogai, Maharashtra", ["Ambajogai"]) is True
    assert is_location_match("Beed / Ambajogai", ["Ambajogai"]) is True
    assert is_location_match("Pune", ["Ambajogai"]) is False


def test_location_match_multi_city():
    # Job has multiple locations: if at least one matches, accept
    assert is_location_match("Pune / Bangalore / Hyderabad", ["Pune"]) is True
    assert is_location_match("Delhi, Mumbai, Chennai", ["Mumbai"]) is True
    assert is_location_match("Kolkata / Chennai", ["Pune", "Bangalore"]) is False


def test_location_match_remote():
    assert is_location_match("Work From Home", ["Remote"]) is True
    assert is_location_match("Hybrid - Remote / Pune", ["Pune"]) is True
    assert is_location_match("WFH", ["Remote", "Pune"]) is True
    # If user did not allow remote and only targeted Pune:
    assert is_location_match("Work From Home", ["Pune"], allow_remote=False) is False


def test_parse_target_locations_comma_string():
    targets = parse_target_locations("Pune, Bangalore, Remote")
    assert "Pune" in targets
    assert "Bangalore" in targets
    assert "Remote" in targets


def test_get_location_search_slugs():
    slugs = get_location_search_slugs(["Pune", "Work From Home", "New Delhi"])
    assert "pune" in slugs
    assert "work-from-home" in slugs
    assert "new-delhi" in slugs


def test_ai_engine_location_answers():
    from platforms.ai_engine import qa_engine
    ans_curr = qa_engine.get_answer("What is your current location?")
    assert len(ans_curr) > 0
    ans_pref = qa_engine.get_answer("What is your preferred job location?")
    assert len(ans_pref) > 0
    ans_reloc = qa_engine.get_answer("Are you willing to relocate to Pune?")
    assert "yes" in ans_reloc.lower()


def test_indeed_platform_search_url_and_helpers():
    from platforms.indeed_platform import build_search_url, load_profile, load_answers
    url = build_search_url("Full Stack Developer", "Pune")
    assert "in.indeed.com/jobs" in url
    assert "Full+Stack+Developer" in url
    assert "Pune" in url
    assert "sc=0kf" in url


