import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from core.auth import AuthenticatedUser, get_current_user
from schemas.resume_analysis import (
    JobMatchRequest,
    ResumeAnalysisListResponse,
    ResumeAnalysisRequest,
    ResumeAnalysisResponse,
)
from services.resume_analysis_service import (
    analyze_resume_record,
    delete_user_resume_analysis,
    list_user_resume_analyses,
    match_resume_with_job_description,
)
from services.resume_parser import (
    extract_file_links,
    extract_raw_text,
    extract_structured_data,
)
from services.resume_service import validate_resume_file

logger = logging.getLogger("resume_analysis_api")

router = APIRouter(prefix="/resume", tags=["Resume Analysis"])


@router.post(
    "/upload",
    response_model=ResumeAnalysisResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload resume for analysis",
    description="Upload a PDF, DOCX, or TXT resume document, extract text server-side, and run instant ATS scoring.",
)
async def upload_and_analyze_resume(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    file: UploadFile = File(...),
    job_title: str = Form("Software Engineer"),
) -> ResumeAnalysisResponse:
    """Validate resume document, extract text, and return comprehensive ATS analysis."""
    file_bytes = await file.read()
    clean_name = file.filename or "resume.pdf"
    verified_mime = validate_resume_file(file_bytes, clean_name, file.content_type)

    try:
        raw_text, ocr_needed = extract_raw_text(file_bytes, clean_name, verified_mime)
        links = extract_file_links(file_bytes, clean_name, verified_mime)
        structured = extract_structured_data(raw_text, links=links) if raw_text else {}
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(val_err))
    except Exception as exc:
        logger.error("Failed to extract resume text: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not read document contents: {exc}",
        )

    return await analyze_resume_record(
        user_id=current_user.id,
        resume_name=clean_name,
        resume_text=raw_text,
        structured_data=structured,
        job_title=job_title,
    )


@router.post(
    "/analyze",
    response_model=ResumeAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze resume structure & skills",
    description="Perform deep structural, skill keyword, and section completeness analysis on candidate resume.",
)
async def analyze_resume_endpoint(
    payload: ResumeAnalysisRequest,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> ResumeAnalysisResponse:
    """Analyze provided resume text or previously saved candidate resume."""
    resume_text = payload.resume_text or ""
    resume_name = "resume.pdf"

    if not resume_text:
        # Check if user has an existing resume or profile text
        from services.profile_service import get_user_profile
        try:
            prof = await get_user_profile(current_user.id)
            if prof and prof.summary:
                resume_text = f"{prof.full_name}\n{prof.email} | {prof.phone}\n{prof.headline}\n{prof.summary}"
        except Exception:
            pass

    if not resume_text or len(resume_text.strip()) < 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide resume text or upload a resume file to analyze.",
        )

    structured = extract_structured_data(resume_text)
    return await analyze_resume_record(
        user_id=current_user.id,
        resume_name=resume_name,
        resume_text=resume_text,
        structured_data=structured,
        job_title=payload.job_title or "Software Engineer",
        resume_id=payload.resume_id,
    )


@router.post(
    "/match-job",
    response_model=ResumeAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Match resume against job description",
    description="Compare candidate qualifications directly against job requirements to compute match score and keyword gaps.",
)
async def match_job_endpoint(
    payload: JobMatchRequest,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> ResumeAnalysisResponse:
    """Compare candidate resume against target job description."""
    resume_text = payload.resume_text or ""
    resume_name = "resume.pdf"

    if not resume_text:
        from services.profile_service import get_user_profile
        try:
            prof = await get_user_profile(current_user.id)
            if prof:
                sk_str = ", ".join(prof.skills) if prof.skills else ""
                resume_text = (
                    f"{prof.full_name}\n{prof.email} | {prof.phone}\n"
                    f"SKILLS: {sk_str}\n"
                    f"SUMMARY: {prof.summary}\n"
                    f"HEADLINE: {prof.headline}"
                )
        except Exception:
            pass

    if not resume_text or len(resume_text.strip()) < 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide resume text or upload a resume file to match against job description.",
        )

    structured = extract_structured_data(resume_text)
    return await match_resume_with_job_description(
        user_id=current_user.id,
        resume_name=resume_name,
        resume_text=resume_text,
        job_description=payload.job_description,
        job_title=payload.job_title or "Target Role",
        structured_data=structured,
        resume_id=payload.resume_id,
    )


@router.get(
    "/history",
    response_model=ResumeAnalysisListResponse,
    summary="Get user's previous resume analyses",
    description="Retrieve all previously evaluated resumes and job matches for the authenticated user.",
)
async def get_analysis_history(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> ResumeAnalysisListResponse:
    """Fetch analysis records belonging to current user."""
    items = await list_user_resume_analyses(current_user.id)
    return ResumeAnalysisListResponse(analyses=items, total=len(items))


@router.delete(
    "/{analysis_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete resume analysis",
    description="Permanently delete a previous resume analysis record.",
)
async def delete_analysis_endpoint(
    analysis_id: str,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> dict[str, Any]:
    """Delete analysis under ownership verification."""
    deleted = await delete_user_resume_analysis(current_user.id, analysis_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis record not found or access denied.",
        )
    return {"status": "success", "message": "Resume analysis deleted successfully."}
