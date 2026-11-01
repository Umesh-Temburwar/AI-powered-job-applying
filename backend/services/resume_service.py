import io
import logging
import mimetypes
import os
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from core.config import get_settings
from schemas.profile import ProfileUpdateRequest
from schemas.resume import (
    ResumeDownloadResponse,
    ResumeItemResponse,
    ResumeListResponse,
    ResumeUploadResponse,
)
from services.profile_service import sync_local_profile_data
from services.resume_parser import (
    extract_file_links,
    extract_raw_text,
    extract_structured_data,
)

logger = logging.getLogger("resumes")

# In-memory storage for test/mock runs
_MEMORY_RESUMES: dict[str, dict[str, Any]] = {}


from core.supabase import get_supabase_client


def _get_supabase_client():
    """Return shared singleton authenticated Supabase client."""
    return get_supabase_client()


def validate_resume_file(file_bytes: bytes, file_name: str, content_type: str | None) -> str:
    """Validate resume file size, extension, and binary magic bytes.
    
    Returns:
        Verified MIME type ('application/pdf' or 'application/vnd.openxmlformats-officedocument.wordprocessingml.document').
    """
    MAX_BYTES = 10 * 1024 * 1024  # 10 MB limit
    if len(file_bytes) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds the 10 MB limit.",
        )
    if len(file_bytes) < 32:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is empty or corrupted.",
        )

    clean_name = file_name.lower().strip()
    is_pdf = clean_name.endswith(".pdf")
    is_docx = clean_name.endswith(".docx")
    is_txt = clean_name.endswith(".txt")

    if not is_pdf and not is_docx and not is_txt:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file format. Only standard PDF (.pdf), Word (.docx), and Text (.txt) documents are permitted.",
        )

    if is_txt:
        return "text/plain"

    # Magic bytes check
    if is_pdf:
        if not file_bytes.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid PDF file. Header signature mismatch.",
            )
        return "application/pdf"

    if is_docx:
        # DOCX is a zip archive starting with PK\x03\x04
        if not file_bytes.startswith(b"PK\x03\x04"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid DOCX document. Archive signature mismatch.",
            )
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file format.")


async def upload_and_parse_resume(
    user_id: str,
    file_bytes: bytes,
    file_name: str,
    content_type: str | None = None,
    set_as_default: bool = True,
) -> ResumeUploadResponse:
    """Upload resume to private Supabase storage and parse into structured profile."""
    verified_mime = validate_resume_file(file_bytes, file_name, content_type)
    file_size = len(file_bytes)
    resume_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    client = _get_supabase_client() if not user_id.startswith("usr_") else None

    # Determine storage path: {user_id}/{uuid}.{ext}
    ext = ".txt" if verified_mime == "text/plain" or file_name.lower().endswith(".txt") else (".docx" if "word" in verified_mime or file_name.lower().endswith(".docx") else ".pdf")
    storage_path = f"{user_id}/{resume_id}{ext}"

    # 1. Parse resume text & extract structured fields
    try:
        raw_text, ocr_needed = extract_raw_text(file_bytes, file_name, verified_mime)
        links = extract_file_links(file_bytes, file_name, verified_mime)
        structured = extract_structured_data(raw_text, links=links) if raw_text else {}
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(val_err))
    except Exception as parse_err:
        logger.error("Resume parsing exception: %s", parse_err)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Failed to parse resume content.")

    # 2. Upload file to Supabase private storage
    if client:
        try:
            client.storage.from_("resumes").upload(
                path=storage_path,
                file=file_bytes,
                file_options={"content-type": verified_mime, "upsert": "true"},
            )
        except Exception as storage_err:
            logger.warning("Supabase storage upload error: %s", storage_err)

    # 3. If setting as default, clear any existing default flags
    if client and set_as_default:
        try:
            client.table("resumes").update({"is_default": False}).eq("user_id", user_id).execute()
        except Exception as e:
            logger.debug("Could not reset previous default resume: %s", e)

    # 4. Insert resume metadata
    record = {
        "id": resume_id,
        "user_id": user_id,
        "file_name": file_name,
        "storage_path": storage_path,
        "file_size": file_size,
        "mime_type": verified_mime,
        "is_default": set_as_default,
        "parsed_data": structured,
        "ocr_needed": ocr_needed,
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    if client:
        try:
            client.table("resumes").insert(record).execute()
        except Exception as db_err:
            logger.error("Database error saving resume: %s", db_err)
    else:
        _MEMORY_RESUMES[resume_id] = record

    # 5. Automatically populate candidate profile in Supabase & memory
    profile_updates = {
        "full_name": structured.get("full_name"),
        "email": structured.get("email"),
        "phone": structured.get("phone"),
        "city": structured.get("city"),
        "headline": structured.get("headline"),
        "summary": structured.get("summary"),
        "linkedin_url": structured.get("linkedin_url"),
        "github_url": structured.get("github_url"),
        "portfolio_url": structured.get("portfolio_url"),
        "skills": structured.get("skills", []),
        "education": structured.get("education", []),
        "experience": structured.get("experience", []),
        "projects": structured.get("projects", []),
        "certifications": structured.get("certifications", []),
        "additional_info": structured.get("additional_info", {}),
        "updated_at": now_iso,
    }
    clean_prof = {k: v for k, v in profile_updates.items() if v is not None}
    # Explicitly persist portfolio_url so old project URLs do not persist when resume has no portfolio
    clean_prof["portfolio_url"] = structured.get("portfolio_url")
    clean_prof["updated_at"] = now_iso

    if client:
        try:
            client.table("profiles").update(clean_prof).eq("id", user_id).execute()
        except Exception as p_err:
            logger.debug("Could not auto-sync profile from uploaded resume: %s", p_err)

    sync_local_profile_data(clean_prof)
    from services.profile_service import invalidate_profile_cache
    invalidate_profile_cache(user_id)

    # 6. Immediately train the bot screening Q&A answer bank with parsed candidate details
    try:
        from services.config_service import train_bot_with_candidate_details
        edu_list = structured.get("education") or []
        first_edu = edu_list[0] if isinstance(edu_list, list) and edu_list else (edu_list if isinstance(edu_list, dict) else {})
        exp_list = structured.get("experience") or []
        fn_parts = (structured.get("full_name") or "").split()
        fname = fn_parts[0] if fn_parts else ""
        lname = " ".join(fn_parts[1:]) if len(fn_parts) > 1 else ""
        train_bot_with_candidate_details({
            "user_id": user_id,
            "firstname": fname,
            "lastname": lname,
            "email": structured.get("email"),
            "phone": structured.get("phone"),
            "location": structured.get("city") or "Pune",
            "total_experience_years": str(len(exp_list)) if exp_list else "0",
            "education_degree": first_edu.get("degree") or "Bachelor of Technology (B.Tech)",
            "education_college": first_edu.get("institution") or first_edu.get("college") or "",
            "education_passing_year": str(first_edu.get("year") or first_edu.get("passing_year") or "2025"),
            "education_score": str(first_edu.get("score") or first_edu.get("cgpa") or ""),
            "linkedin_url": structured.get("linkedin_url") or "",
            "github_url": structured.get("github_url") or "",
            "portfolio_url": structured.get("portfolio_url") or "",
        })
    except Exception as train_exc:
        logger.debug("Could not auto-train bot on resume upload: %s", train_exc)

    parsed_profile = ProfileUpdateRequest(**structured)
    resume_item = ResumeItemResponse(
        id=resume_id,
        user_id=user_id,
        file_name=file_name,
        file_size=file_size,
        mime_type=verified_mime,
        is_default=set_as_default,
        created_at=now_iso,
        ocr_needed=ocr_needed,
    )

    msg = (
        "Resume uploaded and parsed successfully."
        if not ocr_needed
        else "Document uploaded, but text appears scanned or non-selectable. Please confirm details manually."
    )

    return ResumeUploadResponse(
        resume=resume_item,
        parsed_profile=parsed_profile,
        ocr_needed=ocr_needed,
        message=msg,
        extracted_skills_count=len(structured.get("skills", [])),
    )


async def list_user_resumes(user_id: str) -> ResumeListResponse:
    """List all resumes belonging strictly to the requesting user."""
    client = _get_supabase_client() if not user_id.startswith("usr_") else None
    items: list[ResumeItemResponse] = []
    primary_id: str | None = None

    if client:
        try:
            res = client.table("resumes").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
            for r in res.data or []:
                item = ResumeItemResponse(
                    id=str(r["id"]),
                    user_id=str(r["user_id"]),
                    file_name=str(r["file_name"]),
                    file_size=int(r["file_size"]),
                    mime_type=str(r.get("mime_type", "application/pdf")),
                    is_default=bool(r.get("is_default", False)),
                    created_at=str(r["created_at"]),
                    ocr_needed=bool(r.get("ocr_needed", False)),
                )
                items.append(item)
                if item.is_default:
                    primary_id = item.id
        except Exception as db_err:
            logger.error("Failed to query user resumes: %s", db_err)
    else:
        for r in _MEMORY_RESUMES.values():
            if r["user_id"] == user_id:
                item = ResumeItemResponse(
                    id=r["id"],
                    user_id=r["user_id"],
                    file_name=r["file_name"],
                    file_size=r["file_size"],
                    mime_type=r["mime_type"],
                    is_default=r["is_default"],
                    created_at=r["created_at"],
                    ocr_needed=r.get("ocr_needed", False),
                )
                items.append(item)
                if item.is_default:
                    primary_id = item.id

    return ResumeListResponse(resumes=items, primary_resume_id=primary_id)


async def set_primary_resume(user_id: str, resume_id: str) -> None:
    """Mark a specific resume as the user's primary version."""
    client = _get_supabase_client() if not user_id.startswith("usr_") else None
    if client:
        # Clear others
        client.table("resumes").update({"is_default": False}).eq("user_id", user_id).execute()
        # Set target
        res = client.table("resumes").update({"is_default": True}).eq("id", resume_id).eq("user_id", user_id).execute()
        if not res.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found or access denied.")
    else:
        found = False
        for r in _MEMORY_RESUMES.values():
            if r["user_id"] == user_id:
                r["is_default"] = (r["id"] == resume_id)
                if r["id"] == resume_id:
                    found = True
        if not found:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")


async def delete_user_resume(user_id: str, resume_id: str) -> None:
    """Delete resume record and remove from private storage."""
    client = _get_supabase_client() if not user_id.startswith("usr_") else None
    if client:
        # 1. Fetch storage path
        res = client.table("resumes").select("storage_path").eq("id", resume_id).eq("user_id", user_id).limit(1).execute()
        if not res.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found or access denied.")
        storage_path = res.data[0]["storage_path"]

        # 2. Delete from DB
        client.table("resumes").delete().eq("id", resume_id).eq("user_id", user_id).execute()

        # 3. Delete from Storage
        try:
            client.storage.from_("resumes").remove([storage_path])
        except Exception as e:
            logger.warning("Could not delete file from storage: %s", e)
    else:
        if resume_id in _MEMORY_RESUMES and _MEMORY_RESUMES[resume_id]["user_id"] == user_id:
            del _MEMORY_RESUMES[resume_id]
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")


async def get_resume_download_url(user_id: str, resume_id: str) -> ResumeDownloadResponse:
    """Generate a time-limited signed download URL for private resume access."""
    client = _get_supabase_client() if not user_id.startswith("usr_") else None
    if client:
        res = client.table("resumes").select("storage_path, file_name").eq("id", resume_id).eq("user_id", user_id).limit(1).execute()
        if not res.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found or access denied.")
        storage_path = res.data[0]["storage_path"]
        file_name = res.data[0]["file_name"]

        try:
            signed = client.storage.from_("resumes").create_signed_url(storage_path, 900)
            url = signed.get("signedUrl") or signed.get("signedURL") or ""
            return ResumeDownloadResponse(download_url=url, expires_in_seconds=900, file_name=file_name)
        except Exception as e:
            logger.error("Error creating signed URL: %s", e)
            return ResumeDownloadResponse(download_url=f"/api/v1/resumes/{resume_id}/file", file_name=file_name)
    else:
        if resume_id in _MEMORY_RESUMES and _MEMORY_RESUMES[resume_id]["user_id"] == user_id:
            return ResumeDownloadResponse(
                download_url=f"/api/v1/resumes/{resume_id}/file",
                expires_in_seconds=900,
                file_name=_MEMORY_RESUMES[resume_id]["file_name"],
            )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")
