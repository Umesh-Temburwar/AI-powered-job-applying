"""
Pydantic Schemas for Bot Training, Screening Evaluation, and Active Learning
================================================================================
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class TrainingStatsResponse(BaseModel):
    total_answers_in_bank: int = Field(..., description="Number of active Q&A pairs in the bank")
    profile_loaded: bool = Field(..., description="Whether profile_data.json was loaded")
    candidate_name: str = Field(..., description="Name of candidate")
    skills_count: int = Field(..., description="Count of candidate key skills")
    historical_runs_count: int = Field(0, description="Number of recorded benchmark evaluations")
    last_accuracy_pct: Optional[float] = Field(None, description="Most recent benchmark accuracy percentage")


class EvaluateQuestionRequest(BaseModel):
    question: str = Field(..., min_length=2, description="Screening question text")
    expected_answer: Optional[str] = Field(None, description="Optional expected golden answer")
    category: str = Field("general", description="Question category")
    role_context: str = Field("Full Stack Developer", description="Role being applied for")


class EvaluateQuestionResponse(BaseModel):
    question: str
    predicted_answer: str
    confidence: float
    match_score: float
    is_correct: bool
    category: str
    latency_ms: float
    source: str
    reasoning: Optional[str] = None


class BenchmarkRunRequest(BaseModel):
    include_extended_categories: bool = Field(True, description="Whether to include domain QA datasets")


class BenchmarkRunResponse(BaseModel):
    total_evaluated: int
    passed: int
    failed: int
    accuracy_percentage: float
    average_latency_ms: float
    categories: Dict[str, Dict[str, Any]]
    delta_from_previous: float = 0.0
    has_regression: bool = False


class ApproveAnswerRequest(BaseModel):
    question_id: str = Field(..., description="ID from unanswered questions registry")
    approved_answer: str = Field(..., min_length=1, description="Human approved answer text")
    field_type: str = Field("text", description="Field type: text, radio, or number")


class SyncTrainingResponse(BaseModel):
    synced_count: int
    total_in_bank: int
    message: str
