"""
Unit tests for Bot Training NLP Modules:
- normalizer.py (ATS label cleanup, HR abbreviations, Hinglish)
- similarity.py (char n-gram, weighted token overlap, top-k matching)
- template_renderer.py (multi-user dynamic placeholder resolution)
- synonyms.py (expanded intent clusters and tech aliases)
"""

from services.bot_training.normalizer import normalize_question, extract_numeric_unit
from services.bot_training.similarity import (
    char_ngram_similarity,
    weighted_token_similarity,
    QuestionMatcher,
)
from services.bot_training.template_renderer import CandidateTemplateRenderer
from services.bot_training.synonyms import get_canonical_category, expand_tech_aliases


def test_normalize_question_cleans_ats_noise_and_abbreviations():
    assert "experience" in normalize_question("1. Total exp (required)*")
    assert "notice period" in normalize_question("Q2: What is your np? *")
    assert "work from office" in normalize_question("Comfortable with wfo?")
    assert "when can you join" in normalize_question("Kab join kar sakte ho?")
    assert "kubernetes" in normalize_question("Hands-on k8s and nextjs?")


def test_extract_numeric_unit_detection():
    assert extract_numeric_unit("Expected CTC (in LPA)") == "lpa"
    assert extract_numeric_unit("Minimum monthly stipend") == "monthly_inr"
    assert extract_numeric_unit("Official notice period in days") == "days"
    assert extract_numeric_unit("College CGPA") == "cgpa"
    assert extract_numeric_unit("12th percentage marks") == "percentage"
    assert extract_numeric_unit("Total years of experience") == "years"


def test_ngram_and_weighted_similarity():
    assert char_ngram_similarity("experience in react", "experiance in react") > 0.75
    assert weighted_token_similarity(
        "What is your expected annual CTC?",
        "Please enter expected annual CTC",
    ) > 0.75

    matcher = QuestionMatcher(
        {
            "what is your official notice period": {"answer": "Immediate"},
            "what is your expected ctc": {"answer": "6 LPA"},
        },
        threshold=0.6,
    )
    top = matcher.find_top_matches("official notice period", top_k=2)
    assert len(top) >= 1
    assert top[0][1]["answer"] == "Immediate"


def test_template_renderer_isolates_multiple_candidates():
    user_a = {
        "personal": {"name": "Aarav Mehta", "current_location": "Pune", "expected_ctc": "7 LPA", "notice_period": "Immediate"},
        "education": {"degree": "B.Tech", "field_of_study": "IT", "college": "COEP Pune", "cgpa": "8.9", "passing_year": "2024"},
        "key_skills": ["React.js", "TypeScript", "Node.js"],
    }
    user_b = {
        "personal": {"name": "Sneha Nair", "current_location": "Kochi", "expected_ctc": "10 LPA", "notice_period": "30 Days"},
        "education": {"degree": "M.Tech", "field_of_study": "Data Science", "college": "NIT Calicut", "cgpa": "9.2", "passing_year": "2023"},
        "key_skills": ["Python", "PyTorch", "FastAPI"],
    }

    tmpl = "{{candidate_name}} graduated with {{degree}} in {{major}} from {{college}} ({{cgpa}} CGPA), expecting {{expected_ctc}}."
    out_a = CandidateTemplateRenderer(user_a).render_text(tmpl)
    out_b = CandidateTemplateRenderer(user_b).render_text(tmpl)

    assert "Aarav Mehta" in out_a and "COEP Pune" in out_a and "8.9" in out_a
    assert "Sneha Nair" not in out_a
    assert "Sneha Nair" in out_b and "NIT Calicut" in out_b and "10 LPA" in out_b
    assert "Aarav Mehta" not in out_b
    assert not CandidateTemplateRenderer.has_unresolved_placeholders(out_a)
    assert not CandidateTemplateRenderer.has_unresolved_placeholders(out_b)


def test_expanded_synonyms_and_tech_aliases():
    assert get_canonical_category("Share your GitHub profile link") == "github"
    assert get_canonical_category("Share your LinkedIn URL") == "linkedin"
    assert get_canonical_category("Do you require visa sponsorship?") == "visa_sponsorship"
    assert get_canonical_category("Are you open to rotational shift?") == "shift_readiness"
    assert "kubernetes" in expand_tech_aliases("k8s")
    assert "next.js" in expand_tech_aliases("nextjs")
