"""
Bot Training Package
================================================================================
Continuous training, screening QA benchmark evaluation, active learning,
and semantic matching algorithms for the Universal Job Apply Bot.
"""

from .engine import BotTrainer, EvaluationResult, BenchmarkSummary
from .similarity import QuestionMatcher, levenshtein_ratio, token_set_ratio, normalize_text
from .synonyms import get_canonical_category, expand_tech_aliases, SYNONYM_CLUSTERS, TECH_ALIASES
from .formatters import (
    format_salary_response,
    format_notice_period,
    format_experience,
    format_boolean_choice,
    adapt_answer_for_field,
)
from .scoring import ConfidenceScorer, ConfidenceReport
from .learning_registry import LearningRegistry
from .dataset_exporter import DatasetExporter
from .ats_analyzer import ATSAnalyzer
from .skill_gap import SkillGapAnalyzer
from .questionnaire_simulator import QuestionnaireSimulator, QuestionItem, SimulationReport
from .feedback_promoter import FeedbackPromoter
from .regression_detector import RegressionDetector

__all__ = [
    "BotTrainer",
    "EvaluationResult",
    "BenchmarkSummary",
    "QuestionMatcher",
    "levenshtein_ratio",
    "token_set_ratio",
    "normalize_text",
    "get_canonical_category",
    "expand_tech_aliases",
    "SYNONYM_CLUSTERS",
    "TECH_ALIASES",
    "format_salary_response",
    "format_notice_period",
    "format_experience",
    "format_boolean_choice",
    "adapt_answer_for_field",
    "ConfidenceScorer",
    "ConfidenceReport",
    "LearningRegistry",
    "DatasetExporter",
    "ATSAnalyzer",
    "SkillGapAnalyzer",
    "QuestionnaireSimulator",
    "QuestionItem",
    "SimulationReport",
    "FeedbackPromoter",
    "RegressionDetector",
]
