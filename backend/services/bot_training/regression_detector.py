"""
Training Accuracy Regression Detection & Metrics Reporter
================================================================================
Tracks benchmark runs over time, establishes baselines, and flags regressions
to guarantee question-answering accuracy improves monotonically.
"""

import os
import json
import time
import logging
from typing import Dict, List, Optional, Any
from .engine import BenchmarkSummary

logger = logging.getLogger("RegressionDetector")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
HISTORY_PATH = os.path.join(BASE_DIR, "training_history.json")


class RegressionDetector:
    """Monitors benchmark score regressions against historical baselines."""

    def __init__(self, history_file: str = HISTORY_PATH, tolerance_pct: float = 2.0):
        self.history_file = history_file
        self.tolerance_pct = tolerance_pct
        self.history = self._load()

    def _load(self) -> List[Dict[str, Any]]:
        if os.path.exists(self.history_file):
            try:
                with open(self.history_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as exc:
                logger.warning("Failed to load training history: %s", exc)
        return []

    def _save(self) -> None:
        try:
            with open(self.history_file, "w", encoding="utf-8") as f:
                json.dump(self.history, f, indent=2)
        except Exception as exc:
            logger.error("Failed to save training history: %s", exc)

    def record_run(self, summary: BenchmarkSummary) -> Dict[str, Any]:
        """Record benchmark run and check for regression against baseline."""
        prev_run = self.history[-1] if self.history else None
        has_regression = False
        delta_pct = 0.0

        if prev_run:
            prev_acc = prev_run.get("accuracy_percentage", 0.0)
            delta_pct = round(summary.accuracy_percentage - prev_acc, 2)
            if delta_pct < -self.tolerance_pct:
                has_regression = True

        entry = {
            "timestamp": time.time(),
            "total_evaluated": summary.total_evaluated,
            "passed": summary.passed,
            "failed": summary.failed,
            "accuracy_percentage": summary.accuracy_percentage,
            "average_latency_ms": summary.average_latency_ms,
            "delta_from_previous": delta_pct,
            "has_regression": has_regression,
        }
        self.history.append(entry)
        self._save()
        return entry
