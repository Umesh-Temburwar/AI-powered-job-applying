"""
Feedback Loop & Auto-Promotion Engine
================================================================================
Promotes approved screening answers and high-confidence predictions directly
into application_answers.csv and refreshes the live matcher cache.
"""

import os
import csv
import logging
from typing import Dict, List, Optional, Any
from .similarity import normalize_text

logger = logging.getLogger("FeedbackPromoter")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
CSV_PATH = os.path.join(BASE_DIR, "data", "application_answers.csv") if os.path.exists(os.path.join(BASE_DIR, "data", "application_answers.csv")) else os.path.join(BASE_DIR, "application_answers.csv")


class FeedbackPromoter:
    """Manages appending approved Q&A entries and maintaining file integrity."""

    def __init__(self, csv_path: str = CSV_PATH):
        self.csv_path = csv_path

    def promote_answer(
        self,
        question: str,
        answer: str,
        field_type: str = "text",
        created_date: str = "2026-10-27"
    ) -> bool:
        """Add or update an answer in the canonical CSV bank."""
        q_norm = normalize_text(question)
        if not q_norm or not answer:
            return False

        existing_rows: List[Dict[str, str]] = []
        is_updated = False

        if os.path.exists(self.csv_path):
            try:
                with open(self.csv_path, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        cur_q = row.get("question_text", "").strip()
                        if normalize_text(cur_q) == q_norm:
                            row["answer"] = answer.strip()
                            row["field_type"] = field_type.strip()
                            is_updated = True
                        existing_rows.append(row)
            except Exception as exc:
                logger.error("Failed to read CSV for promotion: %s", exc)
                return False

        if not is_updated:
            existing_rows.append({
                "question_text": question.strip(),
                "answer": answer.strip(),
                "field_type": field_type.strip(),
                "created_at": created_date,
            })

        try:
            with open(self.csv_path, "w", newline="", encoding="utf-8") as f:
                fieldnames = ["question_text", "answer", "field_type", "created_at"]
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                for r in existing_rows:
                    writer.writerow({
                        "question_text": r.get("question_text", ""),
                        "answer": r.get("answer", ""),
                        "field_type": r.get("field_type", "text"),
                        "created_at": r.get("created_at", created_date),
                    })
            return True
        except Exception as exc:
            logger.error("Failed to write CSV after promotion: %s", exc)
            return False
