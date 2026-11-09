"""
Semantic Form Field Classifier & Intelligent Resume Resolver
================================================================================
Analyzes form inputs, labels, and screening questions to classify intent
and synthesize verified answers grounded directly in candidate's resume.
"""

import re
import logging
from enum import Enum
from typing import Dict, List, Any, Optional
from platforms.resume_intelligence import ResumeKnowledgeGraph

logger = logging.getLogger("FormFieldResolver")


class FormFieldType(Enum):
    TEXT = "text"
    NUMERIC = "numeric"
    EXPERIENCE_YEARS = "experience_years"
    BOOLEAN_RADIO = "boolean_radio"
    SELECT_DROPDOWN = "select_dropdown"
    MULTI_SELECT = "multi_select"
    PROJECT_ESSAY = "project_essay"
    SALARY_CTC = "salary_ctc"
    NOTICE_PERIOD = "notice_period"
    RESUME_UPLOAD = "resume_upload"
    UNKNOWN = "unknown"


class FormFieldClassifier:
    """Semantic intent classifier for job application form fields."""

    @staticmethod
    def classify(label_or_question: str, element_tag: str = "input", element_type: str = "text") -> FormFieldType:
        if not label_or_question:
            if element_type == "radio":
                return FormFieldType.BOOLEAN_RADIO
            if element_tag == "select":
                return FormFieldType.SELECT_DROPDOWN
            if element_type == "file":
                return FormFieldType.RESUME_UPLOAD
            return FormFieldType.TEXT

        q = label_or_question.lower().strip()

        # Resume upload
        if any(term in q for term in ["resume", "cv", "upload document", "attach"]):
            if element_type == "file" or "upload" in q:
                return FormFieldType.RESUME_UPLOAD

        # Notice period
        if any(term in q for term in ["notice period", "how soon", "when can you join", "joining date", "availability"]):
            return FormFieldType.NOTICE_PERIOD

        # Salary / CTC
        if any(term in q for term in ["expected ctc", "current ctc", "salary expectation", "expected salary", "stipend"]):
            return FormFieldType.SALARY_CTC

        # Long-form / Essay questions
        if any(term in q for term in ["why hire you", "why should we hire", "describe a project", "tell us about", "biggest achievement", "cover letter"]):
            return FormFieldType.PROJECT_ESSAY
        if element_tag == "textarea" and len(q) > 20:
            return FormFieldType.PROJECT_ESSAY

        # Experience in years / Numeric skills
        if any(term in q for term in ["how many years", "years of experience", "total experience", "relevant experience"]) or \
           (re.search(r'\bexperience\b', q) and any(term in q for term in ["year", "years", "yrs", "in years"])):
            return FormFieldType.EXPERIENCE_YEARS

        # Boolean radio / Yes-No questions
        if element_type == "radio" or any(term in q for term in [
            "are you willing", "do you have", "are you comfortable", "can you relocate",
            "are you located", "do you require", "will you require", "are you legally",
            "is it acceptable", "agree to", "consent to"
        ]):
            return FormFieldType.BOOLEAN_RADIO

        # Dropdowns
        if element_tag == "select":
            return FormFieldType.SELECT_DROPDOWN

        # Generic numeric
        if element_type == "number" or "gpa" in q or "cgpa" in q or "percentage" in q:
            return FormFieldType.NUMERIC

        return FormFieldType.TEXT
