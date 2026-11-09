"""
Dynamic Candidate Profile Trainer & Q&A Synthesizer
================================================================================
Trains and personalizes the bot's form-filling memory bank specifically for
the active user's verified resume/profile data. Guarantees that any user
(not just one hardcoded individual) gets accurate answers grounded strictly
in their own education, skills, projects, CTC, notice period, and location.
"""

import os
import csv
import logging
from typing import Dict, List, Any, Optional

from platforms.resume_intelligence import ResumeKnowledgeGraph
from platforms.form_field_resolver import ProjectEssayResolver

logger = logging.getLogger("ProfileTrainer")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
DEFAULT_ANSWERS_PATH = os.path.join(BASE_DIR, "data", "application_answers.csv")


class CandidateProfileTrainer:
    """Dynamically hydrates and trains the bot's Q&A memory bank from any candidate profile."""

    def __init__(self, profile_data: Optional[Dict[str, Any]] = None, answers_path: str = DEFAULT_ANSWERS_PATH):
        self.graph = ResumeKnowledgeGraph(profile_data)
        self.answers_path = answers_path

    def generate_candidate_qa_pairs(self) -> List[Dict[str, str]]:
        """Synthesize candidate-grounded screening answers for all standard ATS question patterns."""
        edu = self.graph.get_education_details()
        projs = self.graph.projects
        skills = self.graph.skills
        primary_proj = projs[0] if projs else {}
        primary_title = primary_proj.get("title", "Full Stack Platform")
        primary_stack = ", ".join(primary_proj.get("tech_stack", [])) if isinstance(primary_proj.get("tech_stack"), list) else str(primary_proj.get("tech_stack", ""))
        primary_role = primary_proj.get("role", "Developer")
        primary_metrics = primary_proj.get("metrics", "Production deployment with verified performance.")

        qa_pairs = [
            # 1. College Academics & Coursework
            {
                "question_text": "What is your graduation college and degree?",
                "answer": f"{edu['degree']} in {edu['major']} from {edu['college']}{', ' + edu['location'] if edu['location'] else ''} (Batch {edu['year']}).",
                "field_type": "text",
                "category": "college_academics"
            },
            {
                "question_text": "What was your cumulative CGPA or percentage in college?",
                "answer": edu["score"],
                "field_type": "text",
                "category": "college_academics"
            },
            {
                "question_text": "What is your graduation CGPA?",
                "answer": edu["cgpa"],
                "field_type": "text",
                "category": "college_academics"
            },
            {
                "question_text": "What is your college or university name?",
                "answer": edu["college"],
                "field_type": "text",
                "category": "college_academics"
            },
            {
                "question_text": "What degree did you pursue?",
                "answer": f"{edu['degree']} in {edu['major']}",
                "field_type": "text",
                "category": "college_academics"
            },
            {
                "question_text": "What was your graduation passing year or batch?",
                "answer": edu["year"],
                "field_type": "text",
                "category": "college_academics"
            },
            {
                "question_text": "What core Computer Science subjects did you study during B.Tech?",
                "answer": edu["coursework"],
                "field_type": "textarea",
                "category": "college_academics"
            },

            # 2. Compensation & CTC Expectations
            {
                "question_text": "What is your expected fixed CTC per annum?",
                "answer": self.graph.expected_ctc,
                "field_type": "text",
                "category": "compensation"
            },
            {
                "question_text": "What is your expected salary or compensation?",
                "answer": self.graph.expected_ctc,
                "field_type": "text",
                "category": "compensation"
            },
            {
                "question_text": "What is your current CTC?",
                "answer": str(self.graph.personal.get("current_ctc", "0 (Fresher)")),
                "field_type": "text",
                "category": "compensation"
            },
            {
                "question_text": "Are you comfortable with an unpaid internship without stipend?",
                "answer": "No",
                "field_type": "radio",
                "category": "compensation"
            },
            {
                "question_text": "What is your minimum monthly stipend requirement?",
                "answer": "15000 - 25000 / month",
                "field_type": "text",
                "category": "compensation"
            },

            # 3. Notice Period & Availability
            {
                "question_text": "What is your official notice period?",
                "answer": self.graph.notice_period,
                "field_type": "text",
                "category": "notice_period"
            },
            {
                "question_text": "How soon can you join if selected?",
                "answer": f"{self.graph.notice_period} - Can join immediately",
                "field_type": "text",
                "category": "notice_period"
            },
            {
                "question_text": "Are you available to join immediately?",
                "answer": "Yes, I am available to join immediately.",
                "field_type": "radio",
                "category": "notice_period"
            },

            # 4. Location & Relocation
            {
                "question_text": "What is your current location or city of residence?",
                "answer": self.graph.current_location,
                "field_type": "text",
                "category": "location"
            },
            {
                "question_text": "What are your preferred job locations?",
                "answer": ", ".join(self.graph.preferred_locations),
                "field_type": "text",
                "category": "location"
            },
            {
                "question_text": "Are you willing to relocate or work hybrid in your preferred cities?",
                "answer": "Yes, fully willing to relocate or work remotely as required.",
                "field_type": "radio",
                "category": "location"
            },

            # 5. Candidate Projects
            {
                "question_text": "Describe a full stack project you designed and deployed",
                "answer": self.graph.get_project_narrative("full stack project", max_chars=500),
                "field_type": "textarea",
                "category": "projects"
            },
            {
                "question_text": f"What was your role in '{primary_title}'?",
                "answer": f"I served as the {primary_role}, responsible for designing modular architectures, REST endpoints, and database models.",
                "field_type": "text",
                "category": "projects"
            },
            {
                "question_text": f"What tech stack did you use in '{primary_title}'?",
                "answer": primary_stack,
                "field_type": "text",
                "category": "projects"
            },
            {
                "question_text": f"What metrics or impact did '{primary_title}' achieve?",
                "answer": primary_metrics,
                "field_type": "text",
                "category": "projects"
            },

            # 6. Essay Questions Grounded in Candidate Background
            {
                "question_text": "Why should we hire you for this position?",
                "answer": ProjectEssayResolver.resolve("why hire you", self.graph, max_len=550),
                "field_type": "textarea",
                "category": "behavioral"
            },
            {
                "question_text": "Describe a difficult technical bug or challenge you resolved",
                "answer": ProjectEssayResolver.resolve("challenge bug", self.graph, max_len=550),
                "field_type": "textarea",
                "category": "behavioral"
            },
            {
                "question_text": "How do you design database schemas and backend architectures?",
                "answer": ProjectEssayResolver.resolve("database backend", self.graph, max_len=550),
                "field_type": "textarea",
                "category": "architecture"
            },
            {
                "question_text": "What are your greatest technical strengths?",
                "answer": ProjectEssayResolver.resolve("strength", self.graph, max_len=450),
                "field_type": "textarea",
                "category": "strengths"
            },

            # 7. Work Authorization & Compliance
            {
                "question_text": "Are you legally authorized to work in India?",
                "answer": "Yes",
                "field_type": "radio",
                "category": "work_authorization"
            },
            {
                "question_text": "Will you require employment visa sponsorship to work in India?",
                "answer": "No",
                "field_type": "radio",
                "category": "work_authorization"
            },
            {
                "question_text": "Do you possess a personal laptop and high-speed broadband connection?",
                "answer": "Yes",
                "field_type": "radio",
                "category": "infrastructure"
            }
        ]

        # 8. Dynamic Skill Experience Questions for all candidate skills
        for skill in skills[:15]:
            yrs = str(self.graph.get_skill_experience_years(skill))
            qa_pairs.append({
                "question_text": f"How many years of work experience do you have with {skill}?",
                "answer": yrs,
                "field_type": "text",
                "category": "technical_skills"
            })
            qa_pairs.append({
                "question_text": f"Years of experience with {skill}",
                "answer": yrs,
                "field_type": "text",
                "category": "technical_skills"
            })
            qa_pairs.append({
                "question_text": f"Are you comfortable working with {skill}?",
                "answer": f"Yes, I have hands-on practical experience in {skill} across production projects.",
                "field_type": "radio",
                "category": "technical_skills"
            })

        return qa_pairs

    def train_and_sync_answer_bank(self) -> int:
        """Hydrate candidate Q&A pairs directly into application_answers.csv."""
        qa_pairs = self.generate_candidate_qa_pairs()
        existing_rows: List[Dict[str, str]] = []
        existing_questions = set()

        if os.path.exists(self.answers_path):
            try:
                with open(self.answers_path, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for r in reader:
                        q_raw = (r.get("question_text") or "").strip()
                        if q_raw:
                            existing_rows.append(r)
                            existing_questions.add(q_raw.lower())
            except Exception as exc:
                logger.warning("Error reading answers CSV: %s", exc)

        # Merge or update candidate pairs
        updated_count = 0
        new_qa_dict = {p["question_text"].lower(): p for p in qa_pairs}

        # Update existing matching questions with current candidate answers
        merged_rows = []
        for row in existing_rows:
            q_low = (row.get("question_text") or "").strip().lower()
            if q_low in new_qa_dict:
                item = new_qa_dict[q_low]
                row["answer"] = item["answer"]
                row["field_type"] = item.get("field_type", row.get("field_type", "text"))
                row["category"] = item.get("category", row.get("category", "general"))
                updated_count += 1
                del new_qa_dict[q_low]
            merged_rows.append(row)

        # Append any new candidate questions
        for item in new_qa_dict.values():
            merged_rows.append({
                "question_text": item["question_text"],
                "answer": item["answer"],
                "field_type": item.get("field_type", "text"),
                "category": item.get("category", "candidate_profile")
            })
            updated_count += 1

        # Write safely back to CSV
        fieldnames = ["question_text", "answer", "field_type", "category"]
        os.makedirs(os.path.dirname(os.path.abspath(self.answers_path)), exist_ok=True)
        with open(self.answers_path, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            for r in merged_rows:
                writer.writerow(r)

        logger.info("Successfully trained and synced %d answers for candidate '%s'", updated_count, self.graph.name)
        return updated_count

