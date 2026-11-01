"""
Bot Training & Evaluation Engine
================================================================================
Orchestrates screening question evaluation, golden dataset benchmarking,
confidence scoring, and model fine-tuning dataset generation.
"""

import os
import json
import csv
import time
import logging
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Any

logger = logging.getLogger("BotTrainingEngine")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
PROFILE_PATH = os.path.join(BASE_DIR, "data", "profile_data.json") if os.path.exists(os.path.join(BASE_DIR, "data", "profile_data.json")) else os.path.join(BASE_DIR, "profile_data.json")
ANSWERS_PATH = os.path.join(BASE_DIR, "data", "application_answers.csv") if os.path.exists(os.path.join(BASE_DIR, "data", "application_answers.csv")) else os.path.join(BASE_DIR, "application_answers.csv")


@dataclass
class EvaluationResult:
    question: str
    expected_answer: Optional[str]
    predicted_answer: str
    match_score: float
    is_correct: bool
    category: str
    latency_ms: float
    source: str = "heuristic"
    confidence: float = 1.0


@dataclass
class BenchmarkSummary:
    total_evaluated: int
    passed: int
    failed: int
    accuracy_percentage: float
    average_latency_ms: float
    categories: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)


class BotTrainer:
    """Core engine for training the bot, evaluating screening accuracy, and tracking learning progress."""

    def __init__(self, profile_path: str = PROFILE_PATH, answers_path: str = ANSWERS_PATH):
        self.profile_path = profile_path
        self.answers_path = answers_path
        self.profile_data = self._load_profile()
        self.answer_bank = self._load_answer_bank()

    def _load_profile(self) -> Dict[str, Any]:
        if os.path.exists(self.profile_path):
            try:
                with open(self.profile_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as exc:
                logger.warning("Failed to load profile for training: %s", exc)
        return {}

    def _load_answer_bank(self) -> Dict[str, Dict[str, str]]:
        bank = {}
        if os.path.exists(self.answers_path):
            try:
                with open(self.answers_path, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        q = (row.get("question_text") or "").strip()
                        a = (row.get("answer") or "").strip()
                        ft = (row.get("field_type") or "text").strip()
                        if q and a:
                            bank[q.lower()] = {
                                "original_question": q,
                                "answer": a,
                                "field_type": ft,
                            }
            except Exception as exc:
                logger.warning("Failed to load answer bank: %s", exc)
        return bank

    def get_stats(self) -> Dict[str, Any]:
        """Return dataset statistics and training health metrics."""
        return {
            "total_answers_in_bank": len(self.answer_bank),
            "profile_loaded": bool(self.profile_data),
            "candidate_name": self.profile_data.get("personal", {}).get("name", "Unknown"),
            "skills_count": len(self.profile_data.get("key_skills", [])),
            "profile_path": self.profile_path,
            "answers_path": self.answers_path,
        }

    def evaluate_question(
        self,
        question: str,
        expected_answer: Optional[str] = None,
        category: str = "general"
    ) -> EvaluationResult:
        """Evaluate a single question using the bot's Q&A intelligence."""
        t0 = time.perf_counter()
        q_norm = question.strip().lower()

        # Direct answer bank lookup
        predicted = None
        source = "answer_bank"
        if q_norm in self.answer_bank:
            predicted = self.answer_bank[q_norm]["answer"]
        else:
            # Substring match
            for k, val in self.answer_bank.items():
                if k in q_norm or q_norm in k:
                    predicted = val["answer"]
                    source = "answer_bank_substring"
                    break

        if not predicted:
            predicted = "Fresher / Immediate" if "notice" in q_norm or "experience" in q_norm else "Yes"
            source = "default_fallback"

        latency = (time.perf_counter() - t0) * 1000.0

        is_correct = True
        match_score = 1.0
        if expected_answer:
            exp_clean = expected_answer.strip().lower()
            pred_clean = predicted.strip().lower()
            if exp_clean == pred_clean:
                match_score = 1.0
                is_correct = True
            elif exp_clean in pred_clean or pred_clean in exp_clean:
                match_score = 0.85
                is_correct = True
            else:
                match_score = 0.0
                is_correct = False

        return EvaluationResult(
            question=question,
            expected_answer=expected_answer,
            predicted_answer=predicted,
            match_score=match_score,
            is_correct=is_correct,
            category=category,
            latency_ms=round(latency, 2),
            source=source,
            confidence=match_score,
        )

    def run_benchmark(self, benchmark_dataset: List[Dict[str, str]]) -> BenchmarkSummary:
        """Run standard evaluation suite over a dataset and generate metrics."""
        results: List[EvaluationResult] = []
        category_stats: Dict[str, Dict[str, Any]] = {}

        for item in benchmark_dataset:
            q = item.get("question", "")
            exp = item.get("expected", None)
            cat = item.get("category", "general")
            res = self.evaluate_question(q, exp, cat)
            results.append(res)

            if cat not in category_stats:
                category_stats[cat] = {"total": 0, "passed": 0, "failed": 0}
            category_stats[cat]["total"] += 1
            if res.is_correct:
                category_stats[cat]["passed"] += 1
            else:
                category_stats[cat]["failed"] += 1

        total = len(results)
        passed = sum(1 for r in results if r.is_correct)
        failed = total - passed
        acc = round((passed / total * 100.0), 2) if total > 0 else 0.0
        avg_lat = round(sum(r.latency_ms for r in results) / total, 2) if total > 0 else 0.0

        for cat, data in category_stats.items():
            tot = data["total"]
            pas = data["passed"]
            data["accuracy"] = round((pas / tot * 100.0), 2) if tot > 0 else 0.0

        return BenchmarkSummary(
            total_evaluated=total,
            passed=passed,
            failed=failed,
            accuracy_percentage=acc,
            average_latency_ms=avg_lat,
            categories=category_stats,
        )
