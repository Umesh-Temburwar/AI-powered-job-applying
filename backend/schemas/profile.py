from typing import Any
from pydantic import BaseModel, Field


class EducationItem(BaseModel):
    id: str | None = None
    degree: str = ""
    institution: str = ""
    year: str | None = None
    score: str | None = None
    field_of_study: str | None = None
    location: str | None = None


class ExperienceItem(BaseModel):
    id: str | None = None
    company: str = ""
    role: str = ""
    duration: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    description: str | None = None
    location: str | None = None
    is_current: bool = False


class ProjectItem(BaseModel):
    id: str | None = None
    title: str = ""
    description: str | None = None
    technologies: list[str] = Field(default_factory=list)
    url: str | None = None


class CertificationItem(BaseModel):
    id: str | None = None
    name: str = ""
    issuer: str | None = None
    date: str | None = None
    url: str | None = None


class AdditionalInfo(BaseModel):
    notice_period_days: int = 15
    work_authorization: str = "Authorized to work in India"
    willing_to_relocate: bool = True
    expected_salary_lakhs: float | None = None
    is_fresher: bool = False


class ProfileResponse(BaseModel):
    id: str
    full_name: str
    email: str | None = None
    phone: str | None = None
    city: str | None = None
    headline: str | None = None
    summary: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    portfolio_url: str | None = None
    education: list[EducationItem] = Field(default_factory=list)
    experience: list[ExperienceItem] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    projects: list[ProjectItem] = Field(default_factory=list)
    certifications: list[CertificationItem] = Field(default_factory=list)
    additional_info: AdditionalInfo = Field(default_factory=AdditionalInfo)
    is_onboarded: bool = False
    onboarding_step: int = 1
    onboarded_at: str | None = None
    completion_percentage: int = 0
    missing_fields: list[str] = Field(default_factory=list)


class ProfileUpdateRequest(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    city: str | None = None
    headline: str | None = None
    summary: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    portfolio_url: str | None = None
    education: list[EducationItem] | None = None
    experience: list[ExperienceItem] | None = None
    skills: list[str] | None = None
    projects: list[ProjectItem] | None = None
    certifications: list[CertificationItem] | None = None
    additional_info: AdditionalInfo | None = None
    is_onboarded: bool | None = None
    onboarding_step: int | None = None


class OnboardingStatusResponse(BaseModel):
    is_onboarded: bool
    onboarding_step: int
    completion_percentage: int
    missing_fields: list[str]
    has_resume: bool
    has_preferences: bool
