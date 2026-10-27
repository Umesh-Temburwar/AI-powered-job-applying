"""
Bot Training & AI Evaluation API Endpoints
================================================================================
Endpoints for evaluating screening questions, running benchmarks, syncing datasets,
and approving active learning submissions.
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status

from core.supabase import get_current_user
from schemas.training import (
    TrainingStatsResponse,
    EvaluateQuestionRequest,
    EvaluateQuestionResponse,
    BenchmarkRunRequest,
    BenchmarkRunResponse,
    ApproveAnswerRequest,
    SyncTrainingResponse,
)
from services.training_service import training_service

router = APIRouter(prefix="/training", tags=["Bot Training & AI Evaluation"])


@router.get("/stats", response_model=TrainingStatsResponse)
async def get_training_stats():
    """Retrieve current bot training statistics, answer bank count, and model health."""
    return training_service.get_stats()


@router.post("/evaluate", response_model=EvaluateQuestionResponse)
async def evaluate_screening_question(req: EvaluateQuestionRequest):
    """Evaluate a screening question against the bot's matching engine and heuristics."""
    return training_service.evaluate_question(
        question=req.question,
        expected_answer=req.expected_answer,
        category=req.category,
        role_context=req.role_context,
    )


@router.post("/benchmark", response_model=BenchmarkRunResponse)
async def run_benchmark_evaluation(req: BenchmarkRunRequest = BenchmarkRunRequest()):
    """Execute evaluation benchmark across domain screening question datasets."""
    return training_service.run_benchmark(include_extended=req.include_extended_categories)


@router.post("/sync", response_model=SyncTrainingResponse)
async def sync_all_datasets():
    """Synchronize domain datasets from JSON files into active answer bank."""
    return training_service.sync_all_datasets_to_bank()


@router.get("/unanswered")
async def get_unanswered_questions():
    """Retrieve list of unseen questions captured during automation runs."""
    return training_service.registry.get_pending_review()


@router.post("/approve")
async def approve_unanswered_question(req: ApproveAnswerRequest):
    """Approve a captured screening question and promote into training answer bank."""
    approved = training_service.registry.approve_and_learn(
        question_id=req.question_id,
        approved_answer=req.approved_answer,
        field_type=req.field_type,
    )
    if not approved:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question ID {req.question_id} not found in learning registry",
        )
    # Promote into CSV
    training_service.promoter.promote_answer(
        question=approved["question"],
        answer=req.approved_answer,
        field_type=req.field_type,
    )
    return {"message": "Question approved and learned into bot memory", "entry": approved}
