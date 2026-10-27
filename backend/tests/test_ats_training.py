"""
Unit Tests for ATS Skill Analyzer and Gap Analyzer
================================================================================
Validates n-gram extraction, weighted skill matching, and resume gap recommendations.
"""

import pytest
from services.bot_training.ats_analyzer import ATSAnalyzer
from services.bot_training.skill_gap import SkillGapAnalyzer


def test_ats_analyzer_high_match():
    candidate_skills = ["React.js", "Node.js", "Express.js", "PostgreSQL", "Docker", "Git"]
    analyzer = ATSAnalyzer(candidate_skills)

    title = "Full Stack Developer (React / Node / Postgres)"
    desc = "We are seeking a Full Stack Developer skilled in React.js, Node.js, Express.js, and PostgreSQL with Git and Docker."
    result = analyzer.analyze_job(title, desc)

    assert result["score"] >= 80.0
    assert result["verdict"] == "high_match"
    assert result["is_recommended"] is True
    assert "react.js" in result["matched_skills"] or "react" in result["matched_skills"]


def test_ats_analyzer_low_match():
    candidate_skills = ["React.js", "Node.js"]
    analyzer = ATSAnalyzer(candidate_skills)

    title = "Embedded Firmware Engineer (C++ / RTOS)"
    desc = "Looking for candidate with expertise in C++, RTOS, hardware debugging, and circuit design."
    result = analyzer.analyze_job(title, desc)

    # Score should be low or default fallback
    assert result["verdict"] in ("low_match", "moderate_match")


def test_extract_experience_required():
    assert SkillGapAnalyzer.extract_experience_required("Candidate must possess 2 to 4 years of experience.") == 2.0
    assert SkillGapAnalyzer.extract_experience_required("Minimum 3 years hands-on coding.") == 3.0
    assert SkillGapAnalyzer.extract_experience_required("Freshers welcome, 0 years required.") == 0.0


def test_analyze_qualification_match():
    assert SkillGapAnalyzer.analyze_qualification_match("B.Tech or BE in Computer Science required.") is True
    assert SkillGapAnalyzer.analyze_qualification_match("Open to any engineering graduate.") is True


def test_generate_recommendations():
    missing = ["docker", "redis"]
    recs = SkillGapAnalyzer.generate_recommendations(missing)
    assert len(recs) == 2
    assert "Docker" in recs[0]
