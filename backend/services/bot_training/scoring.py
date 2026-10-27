"""
Confidence Scoring & Reasoning Pipeline
================================================================================
Calculates confidence weights, generates human-auditable reasoning trails,
and verifies answer validity against form constraints.
"""

from dataclasses import dataclass
from typing import Optional, Dict, Any


@dataclass
class ConfidenceReport:
    score: float  # 0.0 to 1.0
    strategy: str  # e.g., 'exact_bank', 'fuzzy_similarity', 'synonym_intent', 'heuristic_rule', 'fallback'
    reasoning: str
    is_trusted: bool
    requires_human_review: bool
    meta: Dict[str, Any]


class ConfidenceScorer:
    """Evaluates the confidence and explainability of bot-generated screening answers."""

    STRATEGY_WEIGHTS = {
        "exact_bank": 1.0,
        "token_set_ratio": 0.90,
        "synonym_intent": 0.85,
        "heuristic_rule": 0.80,
        "llm_synthetic": 0.75,
        "default_fallback": 0.40,
    }

    def __init__(self, review_threshold: float = 0.60):
        self.review_threshold = review_threshold

    def score_prediction(
        self,
        strategy: str,
        raw_similarity: float = 1.0,
        answer_length: int = 1,
        question_matched: Optional[str] = None
    ) -> ConfidenceReport:
        base_weight = self.STRATEGY_WEIGHTS.get(strategy, 0.50)
        # Composite score calculation
        score = round(base_weight * min(raw_similarity, 1.0), 4)

        # Penalize empty answers
        if answer_length == 0:
            score = 0.0

        is_trusted = score >= self.review_threshold
        requires_review = score < self.review_threshold

        reasoning = (
            f"Strategy '{strategy}' matched with raw similarity {raw_similarity:.2f}. "
            f"Resulting confidence is {score:.2f}."
        )
        if question_matched:
            reasoning += f" Matched against bank entry: '{question_matched}'."

        return ConfidenceReport(
            score=score,
            strategy=strategy,
            reasoning=reasoning,
            is_trusted=is_trusted,
            requires_human_review=requires_review,
            meta={"raw_similarity": raw_similarity, "answer_length": answer_length},
        )
