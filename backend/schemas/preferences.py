from typing import Any
from pydantic import BaseModel, Field, field_validator


class JobPreferencesResponse(BaseModel):
    id: str
    user_id: str
    job_titles: list[str] = Field(default_factory=list)
    locations: list[str] = Field(default_factory=list)
    experience_level: str = "entry_level"
    employment_types: list[str] = Field(default_factory=lambda: ["full_time"])
    min_salary: float | None = None
    max_salary: float | None = None
    selected_platforms: list[str] = Field(default_factory=lambda: ["naukri", "internshala", "indeed"])
    daily_application_limit: int = 25
    require_manual_review: bool = True
    updated_at: str | None = None


class JobPreferencesUpdateRequest(BaseModel):
    job_titles: list[str] | None = None
    locations: list[str] | None = None
    experience_level: str | None = None
    employment_types: list[str] | None = None
    min_salary: float | None = None
    max_salary: float | None = None
    selected_platforms: list[str] | None = None
    daily_application_limit: int | None = None
    require_manual_review: bool | None = None

    @field_validator("daily_application_limit", mode="before")
    @classmethod
    def coerce_limit(cls, v: Any) -> int | None:
        if v is None or v == "":
            return None
        try:
            return int(v)
        except (ValueError, TypeError):
            return 25

    @field_validator("min_salary", "max_salary", mode="before")
    @classmethod
    def coerce_salary(cls, v: Any) -> float | None:
        if v is None or v == "":
            return None
        try:
            return float(v)
        except (ValueError, TypeError):
            return None

    @field_validator("job_titles", "locations", "selected_platforms", "employment_types", mode="before")
    @classmethod
    def coerce_list(cls, v: Any) -> list[str] | None:
        if v is None:
            return None
        if isinstance(v, str):
            return [x.strip() for x in v.split(",") if x.strip()]
        if isinstance(v, list):
            return [str(x).strip() for x in v if str(x).strip()]
        return None


class PreferenceSuggestionsResponse(BaseModel):
    suggested_titles: list[str] = Field(default_factory=list)
    suggested_keywords: list[str] = Field(default_factory=list)
    source_skills: list[str] = Field(default_factory=list)
