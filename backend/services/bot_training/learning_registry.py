"""
Active Learning & Unanswered Questions Registry
================================================================================
Captures unseen or low-confidence questions encountered during live auto-apply runs.
Allows continuous feedback loops and automated answer bank enrichment.
"""

import os
import json
import time
import logging
from typing import Dict, List, Optional, Any

logger = logging.getLogger("LearningRegistry")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
REGISTRY_PATH = os.path.join(BASE_DIR, "unanswered_questions.json")


class LearningRegistry:
    """Manages newly discovered screening questions for bot retraining."""

    def __init__(self, registry_file: str = REGISTRY_PATH):
        self.registry_file = registry_file
        self.entries: List[Dict[str, Any]] = self._load()

    def _load(self) -> List[Dict[str, Any]]:
        if os.path.exists(self.registry_file):
            try:
                with open(self.registry_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as exc:
                logger.warning("Failed to load learning registry: %s", exc)
        return []

    def _save(self) -> None:
        try:
            with open(self.registry_file, "w", encoding="utf-8") as f:
                json.dump(self.entries, f, indent=2, ensure_ascii=False)
        except Exception as exc:
            logger.error("Failed to save learning registry: %s", exc)

    def record_unanswered_question(
        self,
        question: str,
        platform: str = "generic",
        role_context: str = "Software Developer",
        heuristic_prediction: str = "",
        confidence: float = 0.0,
    ) -> Dict[str, Any]:
        """Record a novel question encountered during automation."""
        q_clean = question.strip()
        # Avoid duplicate records
        for item in self.entries:
            if item.get("question", "").strip().lower() == q_clean.lower():
                item["encounter_count"] = item.get("encounter_count", 1) + 1
                item["last_seen"] = time.time()
                self._save()
                return item

        entry = {
            "id": f"q_{int(time.time()*1000)}",
            "question": q_clean,
            "platform": platform,
            "role_context": role_context,
            "heuristic_prediction": heuristic_prediction,
            "confidence": confidence,
            "encounter_count": 1,
            "first_seen": time.time(),
            "last_seen": time.time(),
            "status": "pending_review",
            "human_approved_answer": None,
        }
        self.entries.append(entry)
        self._save()
        return entry

    def get_pending_review(self) -> List[Dict[str, Any]]:
        """Return list of questions awaiting training review."""
        return [e for e in self.entries if e.get("status") == "pending_review"]

    def approve_and_learn(self, question_id: str, approved_answer: str, field_type: str = "text") -> Optional[Dict[str, Any]]:
        """Approve a question and mark ready to integrate into answer bank."""
        for item in self.entries:
            if item.get("id") == question_id:
                item["status"] = "approved"
                item["human_approved_answer"] = approved_answer.strip()
                item["field_type"] = field_type
                item["resolved_at"] = time.time()
                self._save()
                return item
        return None
