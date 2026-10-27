"""
Bot Training Package
================================================================================
Continuous training, screening QA benchmark evaluation, active learning,
and semantic matching algorithms for the Universal Job Apply Bot.
"""

from .engine import BotTrainer, EvaluationResult, BenchmarkSummary

__all__ = ["BotTrainer", "EvaluationResult", "BenchmarkSummary"]
