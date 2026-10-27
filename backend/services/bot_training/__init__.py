"""
Bot Training Package
================================================================================
Continuous training, screening QA benchmark evaluation, active learning,
and semantic matching algorithms for the Universal Job Apply Bot.
"""

from .engine import BotTrainer, EvaluationResult, BenchmarkSummary
from .similarity import QuestionMatcher, levenshtein_ratio, token_set_ratio, normalize_text

__all__ = [
    "BotTrainer",
    "EvaluationResult",
    "BenchmarkSummary",
    "QuestionMatcher",
    "levenshtein_ratio",
    "token_set_ratio",
    "normalize_text",
]
