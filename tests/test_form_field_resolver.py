"""
Unit tests for Form Field Semantic Resolver (platforms/form_field_resolver.py)
"""

import pytest
from platforms.resume_intelligence import ResumeKnowledgeGraph
from platforms.form_field_resolver import (
    FormFieldType,
    FormFieldClassifier,
    NumericExperienceResolver,
    BooleanIntentResolver,
    DropdownOptionResolver,
    ProjectEssayResolver
)


@pytest.fixture
def graph():
    return ResumeKnowledgeGraph()


def test_form_field_classifier():
    assert FormFieldClassifier.classify("How many years of React experience do you have?") == FormFieldType.EXPERIENCE_YEARS
    assert FormFieldClassifier.classify("Are you willing to relocate to Pune?", element_type="radio") == FormFieldType.BOOLEAN_RADIO
    assert FormFieldClassifier.classify("Please select your highest degree", element_tag="select") == FormFieldType.SELECT_DROPDOWN
    assert FormFieldClassifier.classify("Why should we hire you for this role?", element_tag="textarea") == FormFieldType.PROJECT_ESSAY
    assert FormFieldClassifier.classify("What is your expected CTC in INR?") == FormFieldType.SALARY_CTC
    assert FormFieldClassifier.classify("What is your current notice period?") == FormFieldType.NOTICE_PERIOD
    assert FormFieldClassifier.classify("Upload your updated Resume", element_type="file") == FormFieldType.RESUME_UPLOAD


def test_numeric_experience_resolver(graph):
    react_yrs = NumericExperienceResolver.resolve("How many years of experience do you have in React.js?", graph)
    assert float(react_yrs) >= 1.0

    node_yrs = NumericExperienceResolver.resolve("Node.js experience in years", graph)
    assert float(node_yrs) >= 1.0

    total_yrs = NumericExperienceResolver.resolve("Total years of experience", graph)
    assert float(total_yrs) >= 1.0

    cgpa = NumericExperienceResolver.resolve("What is your graduation CGPA?", graph)
    assert cgpa == "6.06"


def test_boolean_intent_resolver(graph):
    # Affirmative questions
    assert BooleanIntentResolver.resolve("Are you willing to relocate to Pune?", graph) is True
    assert BooleanIntentResolver.resolve("Do you possess a personal laptop for work?", graph) is True
    assert BooleanIntentResolver.resolve("Are you legally authorized to work in India?", graph) is True
    assert BooleanIntentResolver.resolve("Do you have hands-on experience with PostgreSQL?", graph) is True

    # Negative / Rejection questions
    assert BooleanIntentResolver.resolve("Will you require visa sponsorship now or in the future?", graph) is False
    assert BooleanIntentResolver.resolve("Are you comfortable with an unpaid internship with zero stipend?", graph) is False
    assert BooleanIntentResolver.resolve("Have you ever been convicted of a criminal offense?", graph) is False
    assert BooleanIntentResolver.resolve("Are you bound by any non-compete agreement?", graph) is False


def test_dropdown_option_resolver(graph):
    # Degree dropdown
    degree_options = ["High School", "Diploma", "B.Tech / B.E. (Computer Science)", "Master's (M.Tech)"]
    matched_degree = DropdownOptionResolver.resolve("Select your highest education degree", degree_options, graph)
    assert matched_degree == "B.Tech / B.E. (Computer Science)"

    # Notice period dropdown
    notice_options = ["More than 3 months", "2 Months", "1 Month", "15 Days", "Immediate (0 Days)"]
    matched_notice = DropdownOptionResolver.resolve("What is your notice period?", notice_options, graph)
    assert matched_notice == "Immediate (0 Days)"

    # Location dropdown
    loc_options = ["Kolkata", "Delhi NCR", "Pune", "Chennai"]
    matched_loc = DropdownOptionResolver.resolve("Select your preferred job location", loc_options, graph)
    assert matched_loc == "Pune"


def test_project_essay_resolver(graph):
    ans_why = ProjectEssayResolver.resolve("Why should we hire you for this role?", graph)
    assert "React" in ans_why
    assert "EdTech" in ans_why
    assert len(ans_why) > 80

    ans_challenge = ProjectEssayResolver.resolve("Describe a difficult bug or challenge you overcame", graph)
    assert "ByteFest" in ans_challenge
    assert len(ans_challenge) > 80

    ans_db = ProjectEssayResolver.resolve("Explain your experience with PostgreSQL databases", graph)
    assert "PostgreSQL" in ans_db
    assert len(ans_db) > 80
