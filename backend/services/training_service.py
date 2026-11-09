"""
Bot Training Service
================================================================================
Unified service exposing training stats, benchmark execution, active learning,
and dataset synchronization to API routers and automation workers.
"""

import os
import glob
import json
import logging
from typing import Dict, List, Optional, Any

from schemas.training import (
    TrainingStatsResponse,
    EvaluateQuestionResponse,
    BenchmarkRunResponse,
    SyncTrainingResponse,
)
from services.bot_training.engine import BotTrainer
from services.bot_training.scoring import ConfidenceScorer
from services.bot_training.learning_registry import LearningRegistry
from services.bot_training.feedback_promoter import FeedbackPromoter
from services.bot_training.regression_detector import RegressionDetector
from services.bot_training.profile_trainer import CandidateProfileTrainer

logger = logging.getLogger("TrainingService")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATASETS_DIR = os.path.join(BASE_DIR, "backend", "services", "bot_training", "datasets")


class TrainingService:
    """Service layer coordinating bot training, evaluation benchmarks, and self-learning."""

    def __init__(self):
        self.trainer = BotTrainer()
        self.scorer = ConfidenceScorer()
        self.registry = LearningRegistry()
        self.promoter = FeedbackPromoter()
        self.detector = RegressionDetector()

    def get_stats(self) -> TrainingStatsResponse:
        base_stats = self.trainer.get_stats()
        history = self.detector.history
        last_acc = history[-1].get("accuracy_percentage") if history else None

        return TrainingStatsResponse(
            total_answers_in_bank=base_stats.get("total_answers_in_bank", 0),
            profile_loaded=base_stats.get("profile_loaded", False),
            candidate_name=base_stats.get("candidate_name", "Unknown"),
            skills_count=base_stats.get("skills_count", 0),
            historical_runs_count=len(history),
            last_accuracy_pct=last_acc,
        )

    def evaluate_question(
        self,
        question: str,
        expected_answer: Optional[str] = None,
        category: str = "general",
        role_context: str = "Full Stack Developer",
    ) -> EvaluateQuestionResponse:
        res = self.trainer.evaluate_question(question, expected_answer, category)
        conf_rep = self.scorer.score_prediction(
            strategy=res.source,
            raw_similarity=res.match_score,
            answer_length=len(res.predicted_answer),
            question_matched=question,
        )

        # If low confidence and no expected answer, log into active learning registry
        if conf_rep.requires_human_review:
            self.registry.record_unanswered_question(
                question=question,
                platform="api_eval",
                role_context=role_context,
                heuristic_prediction=res.predicted_answer,
                confidence=conf_rep.score,
            )

        return EvaluateQuestionResponse(
            question=res.question,
            predicted_answer=res.predicted_answer,
            confidence=conf_rep.score,
            match_score=res.match_score,
            is_correct=res.is_correct,
            category=res.category,
            latency_ms=res.latency_ms,
            source=res.source,
            reasoning=conf_rep.reasoning,
        )

    def load_domain_datasets(self) -> List[Dict[str, str]]:
        """Load all JSON benchmark questions from dataset directory."""
        pattern = os.path.join(DATASETS_DIR, "*.json")
        items = []
        for path in glob.glob(pattern):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        for entry in data:
                            items.append({
                                "question": entry.get("question_text", ""),
                                "expected": entry.get("answer", ""),
                                "category": entry.get("category", "general"),
                            })
            except Exception as exc:
                logger.warning("Failed loading benchmark dataset %s: %s", path, exc)
        return items

    def run_benchmark(self, include_extended: bool = True) -> BenchmarkRunResponse:
        dataset = self.load_domain_datasets() if include_extended else []
        if not dataset:
            # Fallback benchmark
            dataset = [
                {"question": "Notice Period", "expected": "Immediate", "category": "logistics"},
                {"question": "Expected CTC", "expected": "4.5", "category": "compensation"},
                {"question": "Willing to relocate?", "expected": "Yes", "category": "relocation"},
            ]

        summary = self.trainer.run_benchmark(dataset)
        rec = self.detector.record_run(summary)

        return BenchmarkRunResponse(
            total_evaluated=summary.total_evaluated,
            passed=summary.passed,
            failed=summary.failed,
            accuracy_percentage=summary.accuracy_percentage,
            average_latency_ms=summary.average_latency_ms,
            categories=summary.categories,
            delta_from_previous=rec.get("delta_from_previous", 0.0),
            has_regression=rec.get("has_regression", False),
        )

    def sync_all_datasets_to_bank(self) -> SyncTrainingResponse:
        """Promote all domain questions from JSON into the main answer bank."""
        items = self.load_domain_datasets()
        count = 0
        for item in items:
            q = item.get("question")
            a = item.get("expected")
            if q and a:
                if self.promoter.promote_answer(q, a):
                    count += 1

        # Reload answer bank in trainer
        self.trainer.answer_bank = self.trainer._load_answer_bank()
        total = len(self.trainer.answer_bank)

        return SyncTrainingResponse(
            synced_count=count,
            total_in_bank=total,
            message=f"Successfully synchronized {count} questions into active bot answer bank.",
        )

    def train_for_profile(self, profile_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Train and ground all screening answers dynamically for a candidate's profile."""
        pt = CandidateProfileTrainer(profile_data)
        count = pt.train_and_sync_answer_bank()
        self.trainer.answer_bank = self.trainer._load_answer_bank()
        return {
            "status": "success",
            "candidate_name": pt.graph.name,
            "trained_questions_count": count,
            "total_answers_in_bank": len(self.trainer.answer_bank)
        }


training_service = TrainingService()
