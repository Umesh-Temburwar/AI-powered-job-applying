"""
Dynamic Candidate Template Renderer
================================================================================
Renders candidate-agnostic Q&A templates containing {{placeholder}} tokens
strictly against the active user's ResumeKnowledgeGraph so that every user gets
personalized, resume-grounded form answers with zero cross-user data leakage.
"""

import re
from typing import Dict, Any, List, Optional

from platforms.resume_intelligence import ResumeKnowledgeGraph

PLACEHOLDER_PATTERN = re.compile(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}")


class CandidateTemplateRenderer:
    """Hydrates golden training templates dynamically using any candidate's profile."""

    def __init__(self, profile_data: Optional[Dict[str, Any]] = None):
        self.graph = ResumeKnowledgeGraph(profile_data)
        self.context = self.graph.to_template_context()

    def render_text(self, template: str, extra_context: Optional[Dict[str, str]] = None) -> str:
        """Replace all {{key}} placeholders in a string with active candidate values."""
        if not template or "{{" not in template:
            return template

        merged = dict(self.context)
        if extra_context:
            merged.update(extra_context)

        def _replace(match: re.Match) -> str:
            key = match.group(1)
            val = merged.get(key)
            if val is not None and str(val).strip() != "":
                return str(val).strip()
            return ""

        rendered = PLACEHOLDER_PATTERN.sub(_replace, template)
        # Clean up extra whitespace or dangling commas/parentheses left by optional fields
        rendered = re.sub(r"\s{2,}", " ", rendered)
        rendered = re.sub(r"\(\s*\)", "", rendered)
        rendered = re.sub(r"\s+([,\.;:])", r"\1", rendered)
        return rendered.strip()

    def render_dataset(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Render a list of Q&A dataset records for the active candidate."""
        rendered_items: List[Dict[str, Any]] = []
        for item in items:
            copy_item = dict(item)
            if "answer" in copy_item and isinstance(copy_item["answer"], str):
                copy_item["answer"] = self.render_text(copy_item["answer"])
            if "expected" in copy_item and isinstance(copy_item["expected"], str):
                copy_item["expected"] = self.render_text(copy_item["expected"])
            rendered_items.append(copy_item)
        return rendered_items

    @staticmethod
    def has_unresolved_placeholders(text: str) -> bool:
        """Check whether a rendered string still contains raw {{placeholder}} markers."""
        return bool(PLACEHOLDER_PATTERN.search(text or ""))
