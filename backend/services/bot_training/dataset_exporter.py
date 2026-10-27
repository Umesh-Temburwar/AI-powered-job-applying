"""
Dataset Exporter & JSONL Fine-Tuning Serializer
================================================================================
Serializes golden screening answers into JSONL formats (OpenAI / Gemini format)
for instruction tuning, evaluation sets, and CSV backups.
"""

import os
import json
import csv
import logging
from typing import Dict, List, Optional, Any

logger = logging.getLogger("DatasetExporter")


class DatasetExporter:
    """Exports screening answer banks into standardized training and evaluation formats."""

    SYSTEM_PROMPT = (
        "You are an AI assistant answering job application screening questions on behalf of "
        "Umesh Temburwar, a Full Stack Developer (React.js, Node.js, Express.js, PostgreSQL, MongoDB, Supabase). "
        "Provide direct, concise, and professional answers."
    )

    @classmethod
    def export_to_jsonl(cls, answer_bank: Dict[str, Dict[str, str]], output_path: str) -> int:
        """Export answer bank as instruction tuning JSONL dataset."""
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        count = 0
        try:
            with open(output_path, "w", encoding="utf-8") as f:
                for q, data in answer_bank.items():
                    orig_q = data.get("original_question", q)
                    ans = data.get("answer", "")
                    if not orig_q or not ans:
                        continue
                    record = {
                        "messages": [
                            {"role": "system", "content": cls.SYSTEM_PROMPT},
                            {"role": "user", "content": orig_q},
                            {"role": "assistant", "content": ans},
                        ]
                    }
                    f.write(json.dumps(record, ensure_ascii=False) + "\n")
                    count += 1
            return count
        except Exception as exc:
            logger.error("Failed to export JSONL: %s", exc)
            return 0

    @classmethod
    def export_to_csv(cls, answer_bank: Dict[str, Dict[str, str]], output_path: str) -> int:
        """Export answer bank as standardized CSV."""
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        count = 0
        try:
            with open(output_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=["question_text", "answer", "field_type", "created_at"])
                writer.writeheader()
                for q, data in answer_bank.items():
                    orig_q = data.get("original_question", q)
                    ans = data.get("answer", "")
                    ft = data.get("field_type", "text")
                    if orig_q and ans:
                        writer.writerow({
                            "question_text": orig_q,
                            "answer": ans,
                            "field_type": ft,
                            "created_at": "2026-10-27",
                        })
                        count += 1
            return count
        except Exception as exc:
            logger.error("Failed to export CSV: %s", exc)
            return 0
