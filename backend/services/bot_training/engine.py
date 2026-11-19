"""
Bot Training & Evaluation Engine
================================================================================
Orchestrates screening question evaluation, golden dataset benchmarking,
confidence scoring, and model fine-tuning dataset generation.
"""

import os
import glob
import json
import csv
import time
import logging
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Any

from .normalizer import normalize_question
from .similarity import QuestionMatcher
from .template_renderer import CandidateTemplateRenderer

logger = logging.getLogger("BotTrainingEngine")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
PROFILE_PATH = os.path.join(BASE_DIR, "data", "profile_data.json") if os.path.exists(os.path.join(BASE_DIR, "data", "profile_data.json")) else os.path.join(BASE_DIR, "profile_data.json")
ANSWERS_PATH = os.path.join(BASE_DIR, "data", "application_answers.csv") if os.path.exists(os.path.join(BASE_DIR, "data", "application_answers.csv")) else os.path.join(BASE_DIR, "application_answers.csv")
DATASETS_DIR = os.path.join(BASE_DIR, "backend", "services", "bot_training", "datasets")
if not os.path.exists(DATASETS_DIR):
    DATASETS_DIR = os.path.join(BASE_DIR, "services", "bot_training", "datasets")


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

    def __init__(
        self,
        profile_path: str = PROFILE_PATH,
        answers_path: str = ANSWERS_PATH,
        profile_data: Optional[Dict[str, Any]] = None,
    ):
        self.profile_path = profile_path
        self.answers_path = answers_path
        self.raw_templates = self._load_raw_templates()
        self.base_csv_bank = self._load_answer_bank()
        self.profile_data = profile_data if profile_data is not None else self._load_profile()
        self.renderer = CandidateTemplateRenderer(self.profile_data or None)
        self.answer_bank: Dict[str, Dict[str, str]] = {}
        self._rebuild_dynamic_answer_bank()

    def _load_raw_templates(self) -> Dict[str, Dict[str, str]]:
        """Load canonical universal templates from golden domain datasets."""
        raw: Dict[str, Dict[str, str]] = {}
        pattern = os.path.join(DATASETS_DIR, "*.json")
        for path in glob.glob(pattern):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        for entry in data:
                            q = entry.get("question_text", "").strip()
                            a = entry.get("answer", "").strip()
                            ft = entry.get("field_type", "text").strip()
                            cat = entry.get("category", "general").strip()
                            if q and a:
                                raw[q.lower()] = {
                                    "original_question": q,
                                    "template": a,
                                    "field_type": ft,
                                    "category": cat,
                                }
            except Exception as exc:
                logger.debug("Failed loading raw dataset template %s: %s", path, exc)
        return raw

    def load_candidate_profile(self, profile_data: Optional[Dict[str, Any]] = None) -> None:
        """Bind candidate profile to trainer, update template context, and re-ground entire bank dynamically."""
        self.profile_data = profile_data if profile_data is not None else self._load_profile()
        self.renderer = CandidateTemplateRenderer(self.profile_data or None)
        self._rebuild_dynamic_answer_bank()

    def _rebuild_dynamic_answer_bank(self) -> None:
        """Hydrate universal templates dynamically for the active candidate and overlay candidate profile QA."""
        fresh_bank: Dict[str, Dict[str, str]] = {}

        # 1. First, hydrate all universal dataset templates for active candidate
        for q_low, info in self.raw_templates.items():
            rendered_ans = self.renderer.render_text(info["template"])
            fresh_bank[q_low] = {
                "original_question": info["original_question"],
                "answer": rendered_ans,
                "field_type": info["field_type"],
            }

        # 2. Overlay with base CSV bank (rendered through template renderer)
        for q_low, info in self.base_csv_bank.items():
            if q_low not in fresh_bank:
                fresh_bank[q_low] = {
                    "original_question": info["original_question"],
                    "answer": self.renderer.render_text(info["answer"]),
                    "field_type": info["field_type"],
                }

        self.answer_bank = fresh_bank

        # 3. Overlay candidate profile Q&A
        if self.profile_data:
            self._overlay_candidate_profile(self.profile_data)
        else:
            self.matcher = QuestionMatcher(self.answer_bank, threshold=0.72)

    def _overlay_candidate_profile(self, profile_data: Dict[str, Any]) -> None:
        """Hydrate candidate-specific Q&A into memory bank without disk pollution."""
        try:
            from .profile_trainer import CandidateProfileTrainer
            pt = CandidateProfileTrainer(profile_data)
            pairs = pt.generate_candidate_qa_pairs()
            for p in pairs:
                q_text = p.get("question_text", "").strip()
                ans = p.get("answer", "").strip()
                ft = p.get("field_type", "text")
                if q_text and ans:
                    self.answer_bank[q_text.lower()] = {
                        "original_question": q_text,
                        "answer": ans,
                        "field_type": ft,
                    }
            self.matcher = QuestionMatcher(self.answer_bank, threshold=0.72)
        except Exception as exc:
            logger.warning("Could not overlay candidate profile QA pairs: %s", exc)

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
        q_clean = normalize_question(question)

        # Render template placeholders in expected_answer if provided
        rendered_expected = (
            self.renderer.render_text(expected_answer)
            if expected_answer
            else expected_answer
        )

        # Direct answer bank lookup
        predicted = None
        source = "answer_bank"
        if q_norm in self.answer_bank:
            predicted = self.answer_bank[q_norm]["answer"]
        elif q_clean in self.answer_bank:
            predicted = self.answer_bank[q_clean]["answer"]
            source = "answer_bank_normalized"
        else:
            # Substring match
            for k, val in self.answer_bank.items():
                if k in q_norm or q_norm in k or (q_clean and (k in q_clean or q_clean in k)):
                    predicted = val["answer"]
                    source = "answer_bank_substring"
                    break

        if not predicted and self.answer_bank:
            fuzzy_hit = self.matcher.find_best_match(q_clean or q_norm)
            if fuzzy_hit:
                predicted = fuzzy_hit[1]["answer"]
                source = "semantic_fuzzy_match"

        if not predicted:
            if any(term in q_norm for term in ["unpaid", "without stipend", "zero stipend", "no stipend", "volunteer"]):
                predicted = "No"
                source = "stipend_policy_heuristic"
            else:
                predicted = "Fresher / Immediate" if "notice" in q_norm or "experience" in q_norm else "Yes"
                source = "default_fallback"

        predicted = self.renderer.render_text(predicted)
        latency = (time.perf_counter() - t0) * 1000.0

        is_correct = True
        match_score = 1.0
        if rendered_expected:
            exp_clean = rendered_expected.strip().lower()
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
            expected_answer=rendered_expected,
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
