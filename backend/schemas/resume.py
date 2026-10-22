from pydantic import BaseModel, Field
from schemas.profile import ProfileUpdateRequest


class ResumeItemResponse(BaseModel):
    id: str
    user_id: str
    file_name: str
    file_size: int
    mime_type: str
    is_default: bool
    created_at: str
    ocr_needed: bool = False


class ResumeUploadResponse(BaseModel):
    resume: ResumeItemResponse
    parsed_profile: ProfileUpdateRequest
    ocr_needed: bool = False
    message: str
    extracted_skills_count: int = 0


class ResumeDownloadResponse(BaseModel):
    download_url: str
    expires_in_seconds: int = 900
    file_name: str


class ResumeListResponse(BaseModel):
    resumes: list[ResumeItemResponse] = Field(default_factory=list)
    primary_resume_id: str | None = None
