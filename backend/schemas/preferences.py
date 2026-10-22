from pydantic import BaseModel, Field


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


class PreferenceSuggestionsResponse(BaseModel):
    suggested_titles: list[str] = Field(default_factory=list)
    suggested_keywords: list[str] = Field(default_factory=list)
    source_skills: list[str] = Field(default_factory=list)
