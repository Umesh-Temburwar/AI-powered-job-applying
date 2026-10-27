"""
Bot Training Package
================================================================================
Continuous training, screening QA benchmark evaluation, active learning,
and semantic matching algorithms for the Universal Job Apply Bot.
"""

from .engine import BotTrainer, EvaluationResult, BenchmarkSummary
from .similarity import QuestionMatcher, levenshtein_ratio, token_set_ratio, normalize_text
from .synonyms import get_canonical_category, expand_tech_aliases, SYNONYM_CLUSTERS, TECH_ALIASES

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
]
