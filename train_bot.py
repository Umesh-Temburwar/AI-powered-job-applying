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
    parser.add_argument("--export-jsonl", type=str, help="Export training dataset to JSONL file")
    parser.add_argument("--sync", action="store_true", help="Sync all domain datasets into application_answers.csv")

    args = parser.parse_args()
    trainer = BotTrainer()

    if args.stats or (not args.benchmark and not args.export_jsonl and not args.sync):
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
            a = item.get("expected")
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
        print(f"[*] Exporting dataset to JSONL at {out_file}...")
        count = DatasetExporter.export_to_jsonl(trainer.answer_bank, out_file)
        print(f"[OK] Successfully exported {count} training records.")


if __name__ == "__main__":
    main()
