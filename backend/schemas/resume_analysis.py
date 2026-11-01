from typing import Any, List, Optional
from pydantic import BaseModel, Field


class SkillsAnalysis(BaseModel):
    matched: List[str] = Field(default_factory=list, description="Skills present in both resume and job description")
    missing: List[str] = Field(default_factory=list, description="Important target skills missing from candidate resume")
    candidate_skills: List[str] = Field(default_factory=list, description="All skills detected in candidate resume")
    match_percentage: float = Field(default=0.0, description="Percentage of required skills met")


class ExperienceAnalysis(BaseModel):
    relevance_score: int = Field(default=70, description="Relevance rating from 0 to 100")
    detected_years: str = Field(default="0", description="Extracted years of experience")
    insights: List[str] = Field(default_factory=list, description="Qualitative feedback on experience bullets and impact")


class EducationAnalysis(BaseModel):
    matches_criteria: bool = Field(default=True, description="Whether education satisfies common role requirements")
    degree_detected: str = Field(default="", description="Highest extracted degree")
    institution: Optional[str] = Field(default=None, description="Extracted college or university")


class SectionScores(BaseModel):
    contact: int = Field(default=100, description="Contact information completeness (0-100)")
    skills: int = Field(default=80, description="Skills breadth and relevance (0-100)")
    experience: int = Field(default=75, description="Work experience & impact metrics (0-100)")
    education: int = Field(default=90, description="Education clarity and formatting (0-100)")
    projects: int = Field(default=80, description="Technical projects depth (0-100)")


class ResumeAnalysisRequest(BaseModel):
    resume_id: Optional[str] = Field(default=None, description="Optional ID of existing uploaded resume")
    resume_text: Optional[str] = Field(default=None, description="Optional raw or pasted resume text")
    job_title: Optional[str] = Field(default="Software Engineer", description="Target job title")


class JobMatchRequest(BaseModel):
    resume_id: Optional[str] = Field(default=None, description="Optional ID of existing uploaded resume")
    resume_text: Optional[str] = Field(default=None, description="Optional raw or pasted resume text")
    job_title: Optional[str] = Field(default="Target Role", description="Target job title")
    job_description: str = Field(..., min_length=20, description="Full job description text to match against")


class ResumeAnalysisResponse(BaseModel):
    id: str
    user_id: str
    resume_name: str
    job_title: Optional[str] = None
    job_description: Optional[str] = None
    overall_score: int
    match_summary: str
    skills_analysis: SkillsAnalysis
    experience_analysis: ExperienceAnalysis
    education_analysis: EducationAnalysis
    section_scores: SectionScores
    actionable_suggestions: List[str]
    created_at: str


class ResumeAnalysisListResponse(BaseModel):
    analyses: List[ResumeAnalysisResponse]
    total: int
