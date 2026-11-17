"""
Mock Screening Questionnaire Simulator
================================================================================
Simulates realistic employer screening tests and application questionnaires
from Naukri, Internshala, LinkedIn, and Indeed to test end-to-end bot performance.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Any
from .engine import BotTrainer
from .formatters import adapt_answer_for_field
from .profile_trainer import CandidateProfileTrainer


@dataclass
class QuestionItem:
    id: str
    prompt: str
    field_type: str  # text, radio, number
    options: Optional[List[str]] = None
    expected_answer: Optional[str] = None


@dataclass
class SimulationReport:
    portal: str
    total_questions: int
    answered: int
    completion_rate: float
    accuracy_rate: float
    responses: List[Dict[str, Any]]


class QuestionnaireSimulator:
    """Simulates portal questionnaires and measures bot compliance."""

    def __init__(self, trainer: Optional[BotTrainer] = None):
        self.trainer = trainer or BotTrainer()

    def run_simulation(self, portal: str, questions: List[QuestionItem]) -> SimulationReport:
        """Run questionnaire simulation across supplied questions."""
        responses = []
        correct_count = 0

        for q in questions:
            eval_res = self.trainer.evaluate_question(q.prompt, q.expected_answer)
            adapted = adapt_answer_for_field(eval_res.predicted_answer, q.field_type)

            # Option selection validation if options provided
            selected_option = adapted
            if q.options and q.field_type == "radio":
                # Find closest option
                for opt in q.options:
                    if adapted.lower() in opt.lower() or opt.lower() in adapted.lower():
                        selected_option = opt
                        break

            if eval_res.is_correct:
                correct_count += 1

            responses.append({
                "id": q.id,
                "prompt": q.prompt,
                "field_type": q.field_type,
                "raw_prediction": eval_res.predicted_answer,
                "adapted_answer": selected_option,
                "is_correct": eval_res.is_correct,
                "confidence": eval_res.confidence,
            })

        total = len(questions)
        answered = len([r for r in responses if r.get("adapted_answer")])
        comp_rate = round(answered / max(total, 1) * 100, 2)
        acc_rate = round(correct_count / max(total, 1) * 100, 2)

        return SimulationReport(
            portal=portal,
            total_questions=total,
            answered=answered,
            completion_rate=comp_rate,
            accuracy_rate=acc_rate,
            responses=responses,
        )

    @staticmethod
    def verify_multi_user_isolation(profiles: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Verify that training Q&A synthesized for multiple distinct candidates
        remains strictly isolated with zero cross-user PII or academic leakage.
        """
        per_user_answers: List[Dict[str, Any]] = []
        for idx, prof in enumerate(profiles):
            trainer = CandidateProfileTrainer(prof)
            qa_pairs = trainer.generate_candidate_qa_pairs()
            combined = " ".join(str(item.get("answer", "")) for item in qa_pairs).lower()
            personal = prof.get("personal", {})
            edu = prof.get("education", {}) if isinstance(prof.get("education"), dict) else {}
            per_user_answers.append({
                "index": idx,
                "name": str(personal.get("name", f"User_{idx}")).strip(),
                "college": str(edu.get("college") or edu.get("institution") or "").strip(),
                "combined_lower": combined,
                "qa_count": len(qa_pairs),
            })

        leaks: List[str] = []
        for i, ua in enumerate(per_user_answers):
            for j, ub in enumerate(per_user_answers):
                if i == j:
                    continue
                if ua["name"] and len(ua["name"]) > 3 and ua["name"].lower() in ub["combined_lower"]:
                    leaks.append(f"Name '{ua['name']}' leaked into candidate '{ub['name']}'")
                if ua["college"] and len(ua["college"]) > 3 and ua["college"].lower() in ub["combined_lower"]:
                    leaks.append(f"College '{ua['college']}' leaked into candidate '{ub['name']}'")

        return {
            "candidates_tested": len(profiles),
            "isolated": len(leaks) == 0,
            "leaks": leaks,
            "qa_counts": {u["name"]: u["qa_count"] for u in per_user_answers},
        }
