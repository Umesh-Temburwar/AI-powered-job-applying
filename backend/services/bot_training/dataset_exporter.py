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
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

from .template_renderer import CandidateTemplateRenderer

logger = logging.getLogger("DatasetExporter")


class DatasetExporter:
    """Exports screening answer banks into standardized training and evaluation formats."""

    SYSTEM_PROMPT = (
        "You are an AI assistant answering job application screening questions strictly grounded "
        "in the active candidate's verified resume profile. Provide direct, concise, and professional answers."
    )

    @classmethod
    def build_system_prompt(cls, profile_data: Optional[Dict[str, Any]] = None) -> str:
        """Build a candidate-specific system prompt dynamically from the active resume profile."""
        if not profile_data:
            return cls.SYSTEM_PROMPT
        renderer = CandidateTemplateRenderer(profile_data)
        ctx = renderer.context
        name = ctx.get("candidate_name") or "the candidate"
        skills = ctx.get("primary_skills") or "software engineering"
        return (
            f"You are an AI assistant answering job application screening questions on behalf of "
            f"{name} (Skills: {skills}). Answer accurately, concisely, and strictly from verified resume facts."
        )

    @classmethod
    def export_to_jsonl(
        cls,
        answer_bank: Dict[str, Dict[str, str]],
        output_path: str,
        profile_data: Optional[Dict[str, Any]] = None,
    ) -> int:
        """Export deduplicated answer bank as OpenAI-compatible instruction tuning JSONL dataset."""
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        system_prompt = cls.build_system_prompt(profile_data)
        renderer = CandidateTemplateRenderer(profile_data) if profile_data else None
        seen_questions = set()
        count = 0
        try:
            with open(output_path, "w", encoding="utf-8") as f:
                for q, data in answer_bank.items():
                    orig_q = (data.get("original_question") or q).strip()
                    ans = (data.get("answer") or "").strip()
                    if renderer:
                        ans = renderer.render_text(ans)
                    q_key = orig_q.lower()
                    if not orig_q or not ans or q_key in seen_questions:
                        continue
                    seen_questions.add(q_key)
                    record = {
                        "messages": [
                            {"role": "system", "content": system_prompt},
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
    def export_to_gemini_jsonl(
        cls,
        answer_bank: Dict[str, Dict[str, str]],
        output_path: str,
        profile_data: Optional[Dict[str, Any]] = None,
    ) -> int:
        """Export answer bank in Gemini supervised fine-tuning JSONL schema (contents/parts)."""
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        system_prompt = cls.build_system_prompt(profile_data)
        renderer = CandidateTemplateRenderer(profile_data) if profile_data else None
        seen_questions = set()
        count = 0
        try:
            with open(output_path, "w", encoding="utf-8") as f:
                for q, data in answer_bank.items():
                    orig_q = (data.get("original_question") or q).strip()
                    ans = (data.get("answer") or "").strip()
                    if renderer:
                        ans = renderer.render_text(ans)
                    q_key = orig_q.lower()
                    if not orig_q or not ans or q_key in seen_questions:
                        continue
                    seen_questions.add(q_key)
                    record = {
                        "systemInstruction": {"role": "system", "parts": [{"text": system_prompt}]},
                        "contents": [
                            {"role": "user", "parts": [{"text": orig_q}]},
                            {"role": "model", "parts": [{"text": ans}]},
                        ],
                    }
                    f.write(json.dumps(record, ensure_ascii=False) + "\n")
                    count += 1
            return count
        except Exception as exc:
            logger.error("Failed to export Gemini JSONL: %s", exc)
            return 0

    @classmethod
    def export_to_csv(cls, answer_bank: Dict[str, Dict[str, str]], output_path: str) -> int:
        """Export answer bank as standardized CSV."""
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
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
                            "created_at": today_str,
                        })
                        count += 1
            return count
        except Exception as exc:
            logger.error("Failed to export CSV: %s", exc)
            return 0
