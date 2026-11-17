"""
Universal Job Apply Bot - Training & Evaluation CLI
================================================================================
Train the bot's screening Q&A models, evaluate accuracy on golden test suites,
sync datasets from CSV to Supabase, and serialize instruction tuning datasets.

Usage:
    python train_bot.py --stats
    python train_bot.py --benchmark
    python train_bot.py --export-jsonl ./fine_tuning_dataset.jsonl
    python train_bot.py --sync
"""

import os
import sys

# Safe UTF-8 console output on Windows
if sys.platform == 'win32':
    try:
        if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
            sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
import glob
import json
import argparse
from typing import List, Dict, Any

# Ensure project root is on PYTHONPATH
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.bot_training.engine import BotTrainer
from services.bot_training.dataset_exporter import DatasetExporter
from services.bot_training.feedback_promoter import FeedbackPromoter
from services.bot_training.profile_trainer import CandidateProfileTrainer
from services.bot_training.template_renderer import CandidateTemplateRenderer
from services.bot_training.questionnaire_simulator import QuestionnaireSimulator


def load_all_datasets() -> List[Dict[str, str]]:
    """Load all golden dataset JSON files from backend/services/bot_training/datasets."""
    dataset_pattern = os.path.join(BACKEND_DIR, "services", "bot_training", "datasets", "*.json")
    benchmark_items = []
    for file_path in glob.glob(dataset_pattern):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    for item in data:
                        benchmark_items.append({
                            "question": item.get("question_text", ""),
                            "expected": item.get("answer", ""),
                            "category": item.get("category", "general"),
                        })
        except Exception as exc:
            print(f"[!] Warning: failed to load {file_path}: {exc}")
    return benchmark_items


def main():
    parser = argparse.ArgumentParser(description="Universal Job Apply Bot Trainer CLI")
    parser.add_argument("--stats", action="store_true", help="Display training dataset stats")
    parser.add_argument("--benchmark", action="store_true", help="Run benchmark suite across all datasets")
    parser.add_argument("--export-jsonl", type=str, help="Export training dataset to OpenAI JSONL file")
    parser.add_argument("--export-gemini-jsonl", type=str, help="Export training dataset to Gemini JSONL file")
    parser.add_argument("--sync", action="store_true", help="Sync all domain datasets into application_answers.csv")
    parser.add_argument("--train-for-user", action="store_true", help="Dynamically train & ground all form questions strictly on active candidate resume")
    parser.add_argument("--validate-datasets", action="store_true", help="Validate all golden dataset JSON files and template rendering")
    parser.add_argument("--multi-user-check", action="store_true", help="Verify zero cross-user PII leakage across distinct candidate profiles")

    args = parser.parse_args()
    trainer = BotTrainer()
    renderer = CandidateTemplateRenderer(trainer.profile_data or None)

    if args.train_for_user or args.sync:
        print("[*] Personalizing & training screening Q&A for candidate resume...")
        profile_trainer = CandidateProfileTrainer()
        updated = profile_trainer.train_and_sync_answer_bank()
        print(f"[OK] Trained {updated} candidate-specific questions into master CSV answer bank.")

    if args.validate_datasets:
        print("[*] Validating all golden JSON datasets...")
        dataset_pattern = os.path.join(BACKEND_DIR, "services", "bot_training", "datasets", "*.json")
        files = sorted(glob.glob(dataset_pattern))
        total_q = 0
        errors = 0
        for fp in files:
            try:
                with open(fp, "r", encoding="utf-8") as f:
                    data = json.load(f)
                assert isinstance(data, list) and len(data) > 0
                for row in data:
                    q = row.get("question_text", "").strip()
                    a = renderer.render_text(row.get("answer", ""))
                    if not q or not a or CandidateTemplateRenderer.has_unresolved_placeholders(a):
                        errors += 1
                    total_q += 1
            except Exception as exc:
                print(f"[ERROR] {os.path.basename(fp)}: {exc}")
                errors += 1
        print(f"[OK] Validated {len(files)} dataset files ({total_q} questions, {errors} errors).")

    if args.multi_user_check:
        print("[*] Running multi-candidate isolation verification...")
        sample_profiles = [
            {
                "personal": {"name": "Aarav Kulkarni", "expected_ctc": "7 LPA", "notice_period": "Immediate"},
                "education": {"degree": "B.Tech", "field_of_study": "CSE", "college": "COEP Pune", "cgpa": "8.7"},
                "key_skills": ["React.js", "TypeScript", "Node.js"],
            },
            {
                "personal": {"name": "Meera Iyer", "expected_ctc": "12 LPA", "notice_period": "30 Days"},
                "education": {"degree": "M.Tech", "field_of_study": "AI", "college": "IIT Madras", "cgpa": "9.4"},
                "key_skills": ["Python", "FastAPI", "PyTorch"],
            },
        ]
        report = QuestionnaireSimulator.verify_multi_user_isolation(sample_profiles)
        print(f"[OK] Candidates tested: {report['candidates_tested']} | Isolated: {report['isolated']} | Leaks: {len(report['leaks'])}")

    if args.stats or (
        not args.benchmark
        and not args.export_jsonl
        and not args.export_gemini_jsonl
        and not args.sync
        and not args.train_for_user
        and not args.validate_datasets
        and not args.multi_user_check
    ):
        stats = trainer.get_stats()
        all_items = load_all_datasets()
        categories = set(it.get("category", "general") for it in all_items)
        print("=" * 60)
        print("🤖 UNIVERSAL BOT TRAINING HEALTH & STATS")
        print("=" * 60)
        print(f"Candidate:           {stats.get('candidate_name')}")
        print(f"Skills Profiled:     {stats.get('skills_count')}")
        print(f"Golden Q&A Items:    {len(all_items)} questions across {len(categories)} domains")
        print(f"Answer Bank Entries: {stats.get('total_answers_in_bank')}")
        print(f"Profile Loaded:      {'YES' if stats.get('profile_loaded') else 'NO'}")
        print("=" * 60)

    if args.sync:
        print("[*] Synchronizing domain training datasets into application_answers.csv...")
        promoter = FeedbackPromoter()
        items = load_all_datasets()
        promoted = 0
        for item in items:
            q = item.get("question")
            a = renderer.render_text(item.get("expected") or "")
            if q and a:
                if promoter.promote_answer(q, a):
                    promoted += 1
        print(f"[OK] Synced {promoted} questions into master CSV answer bank.")

    if args.benchmark:
        print("[*] Running Golden Evaluation Benchmark...")
        benchmark_items = load_all_datasets()
        if not benchmark_items:
            print("[!] No benchmark items found in datasets folder.")
            return

        summary = trainer.run_benchmark(benchmark_items)
        print("-" * 60)
        print("📊 BENCHMARK EVALUATION RESULTS")
        print("-" * 60)
        print(f"Total Evaluated:    {summary.total_evaluated}")
        print(f"Passed:             {summary.passed}")
        print(f"Failed:             {summary.failed}")
        print(f"Accuracy Rate:      {summary.accuracy_percentage}%")
        print(f"Average Latency:    {summary.average_latency_ms} ms")
        print("\nCategory Breakdown:")
        for cat, c_data in summary.categories.items():
            print(f"  • {cat.capitalize():<15}: {c_data['passed']}/{c_data['total']} ({c_data['accuracy']}%)")
        print("=" * 60)

    if args.export_jsonl:
        out_file = args.export_jsonl
        print(f"[*] Exporting dataset to OpenAI JSONL at {out_file}...")
        count = DatasetExporter.export_to_jsonl(trainer.answer_bank, out_file, trainer.profile_data)
        print(f"[OK] Successfully exported {count} training records.")

    if args.export_gemini_jsonl:
        out_file = args.export_gemini_jsonl
        print(f"[*] Exporting dataset to Gemini JSONL at {out_file}...")
        count = DatasetExporter.export_to_gemini_jsonl(trainer.answer_bank, out_file, trainer.profile_data)
        print(f"[OK] Successfully exported {count} Gemini fine-tuning records.")


if __name__ == "__main__":
    main()
