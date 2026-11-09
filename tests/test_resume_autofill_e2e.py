"""
End-to-End Regression Benchmark for AI Resume-Based Form Autofill
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


def test_resume_autofill_pipeline_comprehensive(graph):
    # Simulated form questions from diverse ATS portals (Indeed, Internshala, Naukri)
    test_scenarios = [
        {
            "question": "How many years of work experience do you have with React.js?",
            "expected_type": FormFieldType.EXPERIENCE_YEARS,
            "answer_check": lambda ans: float(ans) >= 1.0
        },
        {
            "question": "Years of experience with Node.js and Express backend development",
            "expected_type": FormFieldType.EXPERIENCE_YEARS,
            "answer_check": lambda ans: float(ans) >= 1.0
        },
        {
            "question": "What is your official notice period?",
            "expected_type": FormFieldType.NOTICE_PERIOD,
            "answer_check": lambda ans: "Immediate" in ans or "0 Days" in ans
        },
        {
            "question": "What is your expected fixed CTC per annum?",
            "expected_type": FormFieldType.SALARY_CTC,
            "answer_check": lambda ans: "4.5" in ans or "450000" in ans or "Lakhs" in ans
        },
        {
            "question": "Are you willing to relocate or work hybrid in Pune?",
            "expected_type": FormFieldType.BOOLEAN_RADIO,
            "answer_check": lambda ans: ans is True
        },
        {
            "question": "Will you require employment visa sponsorship to work in India?",
            "expected_type": FormFieldType.BOOLEAN_RADIO,
            "answer_check": lambda ans: ans is False
        },
        {
            "question": "Are you comfortable with an unpaid internship without stipend?",
            "expected_type": FormFieldType.BOOLEAN_RADIO,
            "answer_check": lambda ans: ans is False
        },
        {
            "question": "Why should we hire you for this Full Stack Developer position?",
            "expected_type": FormFieldType.PROJECT_ESSAY,
            "answer_check": lambda ans: "EdTech" in ans and len(ans) > 80
        },
        {
            "question": "Describe a full stack project you designed and deployed",
            "expected_type": FormFieldType.PROJECT_ESSAY,
            "answer_check": lambda ans: "React" in ans and len(ans) > 80
        }
    ]

    for scenario in test_scenarios:
        q = scenario["question"]
        classified = FormFieldClassifier.classify(q)
        assert classified == scenario["expected_type"], f"Failed classification for: {q}"

        if classified == FormFieldType.EXPERIENCE_YEARS:
            ans = NumericExperienceResolver.resolve(q, graph)
        elif classified == FormFieldType.BOOLEAN_RADIO:
            ans = BooleanIntentResolver.resolve(q, graph)
        elif classified == FormFieldType.NOTICE_PERIOD:
            ans = graph.notice_period
        elif classified == FormFieldType.SALARY_CTC:
            ans = graph.expected_ctc
        elif classified == FormFieldType.PROJECT_ESSAY:
            ans = ProjectEssayResolver.resolve(q, graph)
        else:
            ans = ProjectEssayResolver.resolve(q, graph)

        assert scenario["answer_check"](ans), f"Failed answer validation for '{q}'. Got: '{ans}'"

