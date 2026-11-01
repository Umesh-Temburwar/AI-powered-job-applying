from typing import Any
from pydantic import BaseModel, Field, field_validator


def _coerce_str(v: Any) -> str | None:
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None


def _coerce_req_str(v: Any) -> str:
    if v is None:
        return ""
    return str(v).strip()


class EducationItem(BaseModel):
    id: str | None = None
    degree: str = ""
    institution: str = ""
    year: str | None = None
    score: str | None = None
    field_of_study: str | None = None
    location: str | None = None

    @field_validator("id", "year", "score", "field_of_study", "location", mode="before")
    @classmethod
    def coerce_opt_str(cls, v: Any) -> str | None:
        return _coerce_str(v)

    @field_validator("degree", "institution", mode="before")
    @classmethod
    def coerce_required_str(cls, v: Any) -> str:
        return _coerce_req_str(v)


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

    @field_validator("id", "duration", "start_date", "end_date", "location", mode="before")
    @classmethod
    def coerce_opt_str(cls, v: Any) -> str | None:
        return _coerce_str(v)

    @field_validator("company", "role", mode="before")
    @classmethod
    def coerce_required_str(cls, v: Any) -> str:
        return _coerce_req_str(v)

    @field_validator("description", mode="before")
    @classmethod
    def coerce_desc(cls, v: Any) -> str | None:
        if isinstance(v, list):
            return " ".join([str(item).lstrip("-• ") for item in v if item])
        return _coerce_str(v)

    @field_validator("is_current", mode="before")
    @classmethod
    def coerce_bool(cls, v: Any) -> bool:
        if isinstance(v, str):
            return v.lower() in ("true", "1", "yes")
        return bool(v)


class ProjectItem(BaseModel):
    id: str | None = None
    title: str = ""
    description: str | None = None
    technologies: list[str] = Field(default_factory=list)
    url: str | None = None

    @field_validator("id", "description", "url", mode="before")
    @classmethod
    def coerce_opt_str(cls, v: Any) -> str | None:
        return _coerce_str(v)

    @field_validator("title", mode="before")
    @classmethod
    def coerce_required_str(cls, v: Any) -> str:
        return _coerce_req_str(v)

    @field_validator("technologies", mode="before")
    @classmethod
    def coerce_technologies(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            return [t.strip() for t in v.split(",") if t.strip()]
        if isinstance(v, list):
            return [str(t).strip() for t in v if str(t).strip()]
        return []


class CertificationItem(BaseModel):
    id: str | None = None
    name: str = ""
    issuer: str | None = None
    date: str | None = None
    url: str | None = None

    @field_validator("id", "issuer", "date", "url", mode="before")
    @classmethod
    def coerce_opt_str(cls, v: Any) -> str | None:
        return _coerce_str(v)

    @field_validator("name", mode="before")
    @classmethod
    def coerce_required_str(cls, v: Any) -> str:
        return _coerce_req_str(v)


class AdditionalInfo(BaseModel):
    notice_period_days: int = 15
    work_authorization: str = "Authorized to work in India"
    willing_to_relocate: bool = True
    expected_salary_lakhs: float | None = None
    is_fresher: bool = False

    @field_validator("notice_period_days", mode="before")
    @classmethod
    def coerce_notice(cls, v: Any) -> int:
        if v is None or v == "":
            return 15
        try:
            return int(v)
        except (ValueError, TypeError):
            return 15

    @field_validator("expected_salary_lakhs", mode="before")
    @classmethod
    def coerce_salary(cls, v: Any) -> float | None:
        if v is None or v == "":
            return None
        try:
            return float(v)
        except (ValueError, TypeError):
            return None

    @field_validator("willing_to_relocate", "is_fresher", mode="before")
    @classmethod
    def coerce_bool(cls, v: Any) -> bool:
        if isinstance(v, str):
            return v.lower() in ("true", "1", "yes")
        return bool(v)


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
