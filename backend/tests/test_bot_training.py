"""
Unit & Regression Tests for Bot Training Subsystem
================================================================================
Validates similarity matching, domain synonym resolution, formatting,
confidence scoring, and benchmark metrics.
"""

import pytest
from services.bot_training.similarity import (
    normalize_text,
    levenshtein_distance,
    levenshtein_ratio,
    token_set_ratio,
    QuestionMatcher,
)
from services.bot_training.synonyms import (
    get_canonical_category,
    expand_tech_aliases,
)
from services.bot_training.formatters import (
    format_salary_response,
    format_notice_period,
    format_experience,
    format_boolean_choice,
    adapt_answer_for_field,
)
from services.bot_training.scoring import ConfidenceScorer
from services.bot_training.engine import BotTrainer


def test_normalize_text():
    assert normalize_text("What is your Notice Period?!") == "what is your notice period"
    assert normalize_text("  React.js / Node.js  ") == "react js node js"
    assert normalize_text("") == ""


def test_levenshtein_similarity():
    assert levenshtein_distance("kitten", "sitting") == 3
    assert levenshtein_ratio("react", "react") == 1.0
    assert levenshtein_ratio("react", "redux") > 0.3


def test_token_set_ratio():
    s1 = "years of experience in react"
    s2 = "react years of experience"
    assert token_set_ratio(s1, s2) == 1.0


def test_question_matcher():
    bank = {
        "notice period": {"answer": "Immediate", "field_type": "text"},
        "expected ctc": {"answer": "4.5 LPA", "field_type": "text"},
    }
    matcher = QuestionMatcher(bank, threshold=0.7)
    
    # Exact match
    res = matcher.find_best_match("notice period")
    assert res is not None
    assert res[1]["answer"] == "Immediate"

    # Permuted token match
    res_perm = matcher.find_best_match("what is your expected ctc")
    assert res_perm is not None
    assert res_perm[1]["answer"] == "4.5 LPA"


def test_canonical_synonyms():
    assert get_canonical_category("how soon can you join") == "notice_period"
    assert get_canonical_category("current ctc (in lpa)") == "current_salary"
    assert get_canonical_category("are you willing to relocate to bangalore") == "relocation"
    assert get_canonical_category("highest educational qualification") == "qualification"


def test_expand_tech_aliases():
    expanded = expand_tech_aliases("Expert in ReactJS and NodeJS with Postgres")
    assert "react.js" in expanded
    assert "node.js" in expanded
    assert "postgresql" in expanded


def test_format_salary_response():
    assert format_salary_response("4.5", "lpa") == "4.5"
    assert format_salary_response("4.5", "rupees") == "450000"
    assert format_salary_response("450000", "lpa") == "4.5"
    assert format_salary_response(0, "rupees") == "0"


def test_format_notice_period():
    assert format_notice_period(0, "immediate") == "Immediate"
    assert format_notice_period(0, "numeric") == "0"
    assert format_notice_period(15, "full") == "15 Days"


def test_format_experience():
    assert format_experience(1, style="numeric") == "1"
    assert format_experience(0, is_fresher=True, style="fresher_text") == "Fresher"


def test_adapt_answer_for_field():
    assert adapt_answer_for_field("Yes, absolutely", "radio") == "Yes"
    assert adapt_answer_for_field("0 days", "numeric") == "0"


def test_confidence_scorer():
    scorer = ConfidenceScorer()
    rep = scorer.score_prediction(strategy="exact_bank", raw_similarity=1.0, answer_length=5)
    assert rep.is_trusted is True
    assert rep.score == 1.0

    rep_fallback = scorer.score_prediction(strategy="default_fallback", raw_similarity=0.5, answer_length=3)
    assert rep_fallback.requires_human_review is True


def test_bot_trainer_benchmark():
    trainer = BotTrainer()
    benchmark_set = [
        {"question": "Notice Period", "expected": "Immediate", "category": "logistics"},
        {"question": "Expected CTC", "expected": "4.5", "category": "compensation"},
    ]
    summary = trainer.run_benchmark(benchmark_set)
    assert summary.total_evaluated == 2
    assert summary.accuracy_percentage >= 50.0
