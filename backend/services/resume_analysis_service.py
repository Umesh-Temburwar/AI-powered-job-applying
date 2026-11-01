import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import requests
from core.supabase import get_supabase_client
from schemas.resume_analysis import (
    EducationAnalysis,
    ExperienceAnalysis,
    JobMatchRequest,
    ResumeAnalysisRequest,
    ResumeAnalysisResponse,
    SectionScores,
    SkillsAnalysis,
)
from services.resume_parser import (
    MAJOR_INDIAN_AND_GLOBAL_CITIES,
    SKILL_ALIASES,
    TECH_SKILLS_DICTIONARY,
    extract_structured_data,
)

logger = logging.getLogger("resume_analysis")

# In-memory store for unit test runs without active Supabase connection
_MEMORY_ANALYSES: Dict[str, Dict[str, Any]] = {}


def _get_client():
    return get_supabase_client()


def extract_skills_from_text(text: str) -> List[str]:
    """Identify technical skills mentioned in arbitrary job description or resume text."""
    found: List[str] = []
    seen: set = set()
    norm = text.lower()

    for skill in TECH_SKILLS_DICTIONARY:
        canon = SKILL_ALIASES.get(skill.lower(), skill)
        canon_key = canon.lower()
        if canon_key in seen:
            continue
        pat = r'(?<![a-zA-Z0-9_])' + re.escape(skill.lower()) + r'(?![a-zA-Z0-9_])'
        if re.search(pat, norm):
            seen.add(canon_key)
            found.append(canon)

    return found


def calculate_section_scores(structured: Dict[str, Any]) -> Tuple[SectionScores, List[str]]:
    """Evaluate candidate sections and produce granular section scores and improvement tips."""
    tips: List[str] = []

    # 1. Contact Score
    c_score = 0
    if structured.get("full_name"):
        c_score += 20
    else:
        tips.append("Ensure your full name is clearly visible at the very top of the resume.")

    if structured.get("email"):
        c_score += 20
    else:
        tips.append("Add a professional email address in the contact header.")

    if structured.get("phone"):
        c_score += 20
    else:
        tips.append("Add an active contact phone number with country code (+91).")

    if structured.get("linkedin_url"):
        c_score += 20
    else:
        tips.append("Include a clickable LinkedIn profile link to increase recruiter response rates.")

    if structured.get("github_url") or structured.get("portfolio_url"):
        c_score += 20
    else:
        tips.append("Add a GitHub profile or live portfolio website link showcasing your code.")

    # 2. Skills Score
    skills = structured.get("skills") or []
    s_count = len(skills)
    if s_count >= 15:
        sk_score = 95
    elif s_count >= 10:
        sk_score = 85
    elif s_count >= 5:
        sk_score = 70
        tips.append("Expand technical skills section to include backend frameworks, databases, and DevOps tools.")
    else:
        sk_score = 50
        tips.append("List at least 10 relevant technical proficiencies (e.g. React.js, Python, PostgreSQL, Docker).")

    # 3. Experience Score
    exp = structured.get("experience") or []
    if len(exp) >= 2:
        exp_score = 90
    elif len(exp) == 1:
        exp_score = 80
    else:
        exp_score = 65
        tips.append("Detail internship experience, freelance projects, or campus tech leadership roles under Work Experience.")

    # Check for quantitative impact metrics in experience bullets
    has_metrics = False
    for item in exp:
        desc = item.get("description") or ""
        if re.search(r'\b(?:\d+[%+]|\d+\s*(?:users|clients|requests|ms|sec|x))\b', desc, re.I):
            has_metrics = True
            break
    if exp and not has_metrics:
        tips.append("Quantify achievements in your experience bullet points (e.g. 'Improved load time by 35%', 'Handled 1500+ attendees').")

    # 4. Education Score
    edu = structured.get("education") or []
    if edu:
        first_edu = edu[0] if isinstance(edu, list) else edu
        ed_score = 70
        if first_edu.get("degree"):
            ed_score += 10
        if first_edu.get("institution") or first_edu.get("college"):
            ed_score += 10
        if first_edu.get("year") or first_edu.get("passing_year"):
            ed_score += 10
    else:
        ed_score = 50
        tips.append("Clearly state your highest degree, college/university name, and graduation passing year.")

    # 5. Projects Score
    projs = structured.get("projects") or []
    if len(projs) >= 3:
        pr_score = 95
    elif len(projs) >= 2:
        pr_score = 85
    elif len(projs) >= 1:
        pr_score = 75
        tips.append("Add a second substantial full-stack project demonstrating database integration and API development.")
    else:
        pr_score = 50
        tips.append("Highlight 2-3 technical projects with live deployment URLs, GitHub repository links, and tech stack tags.")

    scores = SectionScores(
        contact=min(100, c_score),
        skills=sk_score,
        experience=exp_score,
        education=min(100, ed_score),
        projects=pr_score,
    )
    return scores, tips


def _query_gemini_feedback(prompt: str) -> Optional[str]:
    """Optionally query Gemini API for qualitative ATS analysis."""
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("AI_API_KEY") or ""
    if not api_key:
        return None
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 400},
        }
        res = requests.post(url, json=payload, timeout=8)
        if res.status_code == 200:
            data = res.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        logger.debug("Gemini query note: %s", e)
    return None


async def analyze_resume_record(
    user_id: str,
    resume_name: str,
    resume_text: str,
    structured_data: Optional[Dict[str, Any]] = None,
    job_title: str = "Software Engineer",
    resume_id: Optional[str] = None,
) -> ResumeAnalysisResponse:
    """Perform comprehensive structural ATS analysis and scoring on candidate resume."""
    if not structured_data:
        structured_data = extract_structured_data(resume_text)

    section_scores, suggestions = calculate_section_scores(structured_data)

    # Weighted Overall Score (30% Skills + 25% Experience + 20% Projects + 15% Education + 10% Contact)
    overall_score = round(
        (section_scores.skills * 0.30)
        + (section_scores.experience * 0.25)
        + (section_scores.projects * 0.20)
        + (section_scores.education * 0.15)
        + (section_scores.contact * 0.10)
    )
    overall_score = max(30, min(98, overall_score))

    candidate_skills = structured_data.get("skills") or []
    skills_analysis = SkillsAnalysis(
        matched=candidate_skills[:8],
        missing=[],
        candidate_skills=candidate_skills,
        match_percentage=100.0 if candidate_skills else 0.0,
    )

    exp_list = structured_data.get("experience") or []
    tot_exp = str(len(exp_list)) if exp_list else "0"
    exp_insights = [
        f"Detected {len(exp_list)} professional experience/internship record(s).",
    ]
    if exp_list and exp_list[0].get("role"):
        exp_insights.append(f"Most recent role: {exp_list[0]['role']} at {exp_list[0].get('company', 'Organization')}.")

    experience_analysis = ExperienceAnalysis(
        relevance_score=section_scores.experience,
        detected_years=tot_exp,
        insights=exp_insights,
    )

    edu_list = structured_data.get("education") or []
    first_edu = edu_list[0] if isinstance(edu_list, list) and edu_list else (edu_list if isinstance(edu_list, dict) else {})
    education_analysis = EducationAnalysis(
        matches_criteria=bool(first_edu.get("degree")),
        degree_detected=first_edu.get("degree") or "Degree Not Explicitly Detected",
        institution=first_edu.get("institution") or first_edu.get("college"),
    )

    match_summary = (
        f"Resume displays a strong ATS readiness score of {overall_score}/100. "
        f"Extracted {len(candidate_skills)} core technical proficiencies and {len(structured_data.get('projects', []))} project implementations. "
        f"Following the actionable tips below will optimize keyword density for automated recruitment filters."
    )

    # AI enhancement if available
    llm_prompt = (
        f"Act as a senior technical recruiter reviewing this candidate resume for a {job_title} role:\n"
        f"Candidate: {structured_data.get('full_name', 'Candidate')}\n"
        f"Skills: {', '.join(candidate_skills[:12])}\n"
        f"Experience: {tot_exp} years\n"
        f"Provide 2 concise, high-impact bullet recommendations to optimize ATS ranking."
    )
    ai_recs = _query_gemini_feedback(llm_prompt)
    if ai_recs:
        for line in ai_recs.split("\n"):
            clean_line = re.sub(r'^[•\-\*\d.]+\s*', '', line).strip()
            if len(clean_line) > 15 and clean_line not in suggestions:
                suggestions.append(clean_line)

    analysis_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    record = {
        "id": analysis_id,
        "user_id": user_id,
        "resume_id": resume_id,
        "resume_name": resume_name,
        "job_title": job_title,
        "job_description": None,
        "overall_score": overall_score,
        "match_summary": match_summary,
        "skills_analysis": skills_analysis.model_dump(),
        "experience_analysis": experience_analysis.model_dump(),
        "education_analysis": education_analysis.model_dump(),
        "section_scores": section_scores.model_dump(),
        "actionable_suggestions": suggestions[:8],
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    client = _get_client() if not user_id.startswith("usr_") else None
    if client:
        try:
            client.table("resume_analyses").insert(record).execute()
        except Exception as db_err:
            logger.debug("Database note persisting resume analysis: %s", db_err)
    else:
        _MEMORY_ANALYSES[analysis_id] = record

    return ResumeAnalysisResponse(
        id=analysis_id,
        user_id=user_id,
        resume_name=resume_name,
        job_title=job_title,
        job_description=None,
        overall_score=overall_score,
        match_summary=match_summary,
        skills_analysis=skills_analysis,
        experience_analysis=experience_analysis,
        education_analysis=education_analysis,
        section_scores=section_scores,
        actionable_suggestions=suggestions[:8],
        created_at=now_iso,
    )


async def match_resume_with_job_description(
    user_id: str,
    resume_name: str,
    resume_text: str,
    job_description: str,
    job_title: str = "Target Role",
    structured_data: Optional[Dict[str, Any]] = None,
    resume_id: Optional[str] = None,
) -> ResumeAnalysisResponse:
    """Compare resume text and skills directly against target employer job description."""
    if not structured_data:
        structured_data = extract_structured_data(resume_text)

    candidate_skills = structured_data.get("skills") or []
    jd_skills = extract_skills_from_text(job_description)

    # Calculate matched vs missing skills
    matched_set: List[str] = []
    missing_set: List[str] = []

    cand_skills_lower = {s.lower(): s for s in candidate_skills}

    for js in jd_skills:
        if js.lower() in cand_skills_lower:
            matched_set.append(cand_skills_lower[js.lower()])
        else:
            missing_set.append(js)

    total_target = len(jd_skills)
    matched_count = len(matched_set)
    match_pct = round((matched_count / total_target * 100), 1) if total_target > 0 else 80.0

    # Overall Match Score (60% Skill Match + 20% Section Quality + 20% Target Role Relevance)
    section_scores, suggestions = calculate_section_scores(structured_data)
    overall_score = round((match_pct * 0.60) + (section_scores.skills * 0.20) + (section_scores.experience * 0.20))
    overall_score = max(35, min(99, overall_score))

    # Add specific JD-tailored suggestions
    if missing_set:
        top_missing = missing_set[:5]
        suggestions.insert(
            0,
            f"Add target keywords from job description: {', '.join(top_missing)} to increase ATS match percentage.",
        )

    exp_list = structured_data.get("experience") or []
    tot_exp = str(len(exp_list)) if exp_list else "0"

    # Qualitative AI summary via Gemini if available
    llm_prompt = (
        f"You are an expert technical hiring manager evaluating a candidate resume for: '{job_title}'.\n"
        f"Candidate Skills: {', '.join(candidate_skills[:12])}\n"
        f"Job Description Excerpt: {job_description[:400]}\n"
        f"Matched Skills: {', '.join(matched_set[:6])}\n"
        f"Missing Skills: {', '.join(missing_set[:6])}\n"
        f"Provide a 2-sentence match summary describing candidate alignment and the top priority fix."
    )
    ai_summary = _query_gemini_feedback(llm_prompt)

    if not ai_summary:
        ai_summary = (
            f"Candidate matches {matched_count} out of {total_target or len(candidate_skills)} key technologies mentioned in the job description "
            f"({match_pct}% skill alignment). "
            f"Strengths include hands-on experience with {', '.join(matched_set[:4]) or 'core full-stack skills'}."
        )

    skills_analysis = SkillsAnalysis(
        matched=matched_set,
        missing=missing_set,
        candidate_skills=candidate_skills,
        match_percentage=match_pct,
    )

    experience_analysis = ExperienceAnalysis(
        relevance_score=section_scores.experience,
        detected_years=tot_exp,
        insights=[
            f"Matched {len(matched_set)} tech keywords directly required by employer.",
            f"Missing {len(missing_set)} employer skills that should be added to resume.",
        ],
    )

    edu_list = structured_data.get("education") or []
    first_edu = edu_list[0] if isinstance(edu_list, list) and edu_list else (edu_list if isinstance(edu_list, dict) else {})
    education_analysis = EducationAnalysis(
        matches_criteria=bool(first_edu.get("degree")),
        degree_detected=first_edu.get("degree") or "Degree Not Explicitly Detected",
        institution=first_edu.get("institution") or first_edu.get("college"),
    )

    analysis_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    record = {
        "id": analysis_id,
        "user_id": user_id,
        "resume_id": resume_id,
        "resume_name": resume_name,
        "job_title": job_title,
        "job_description": job_description[:1000],
        "overall_score": overall_score,
        "match_summary": ai_summary,
        "skills_analysis": skills_analysis.model_dump(),
        "experience_analysis": experience_analysis.model_dump(),
        "education_analysis": education_analysis.model_dump(),
        "section_scores": section_scores.model_dump(),
        "actionable_suggestions": suggestions[:8],
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    client = _get_client() if not user_id.startswith("usr_") else None
    if client:
        try:
            client.table("resume_analyses").insert(record).execute()
        except Exception as db_err:
            logger.debug("Database error persisting job match analysis: %s", db_err)
    else:
        _MEMORY_ANALYSES[analysis_id] = record

    return ResumeAnalysisResponse(
        id=analysis_id,
        user_id=user_id,
        resume_name=resume_name,
        job_title=job_title,
        job_description=job_description,
        overall_score=overall_score,
        match_summary=ai_summary,
        skills_analysis=skills_analysis,
        experience_analysis=experience_analysis,
        education_analysis=education_analysis,
        section_scores=section_scores,
        actionable_suggestions=suggestions[:8],
        created_at=now_iso,
    )


async def list_user_resume_analyses(user_id: str) -> List[ResumeAnalysisResponse]:
    """Retrieve history of previous resume analyses belonging to authenticated user."""
    client = _get_client() if not user_id.startswith("usr_") else None
    records: List[Dict[str, Any]] = []

    if client:
        try:
            res = client.table("resume_analyses").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(20).execute()
            records = res.data or []
        except Exception as e:
            logger.debug("Could not fetch analyses from Supabase: %s", e)
    else:
        records = [r for r in _MEMORY_ANALYSES.values() if r.get("user_id") == user_id]
        records.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    items: List[ResumeAnalysisResponse] = []
    for r in records:
        try:
            sk = r.get("skills_analysis") or {}
            exp = r.get("experience_analysis") or {}
            edu = r.get("education_analysis") or {}
            sec = r.get("section_scores") or {}

            items.append(
                ResumeAnalysisResponse(
                    id=str(r["id"]),
                    user_id=str(r["user_id"]),
                    resume_name=r.get("resume_name") or "resume.pdf",
                    job_title=r.get("job_title"),
                    job_description=r.get("job_description"),
                    overall_score=int(r.get("overall_score") or 70),
                    match_summary=r.get("match_summary") or "",
                    skills_analysis=SkillsAnalysis(**sk),
                    experience_analysis=ExperienceAnalysis(**exp),
                    education_analysis=EducationAnalysis(**edu),
                    section_scores=SectionScores(**sec),
                    actionable_suggestions=r.get("actionable_suggestions") or [],
                    created_at=r.get("created_at") or datetime.now(timezone.utc).isoformat(),
                )
            )
        except Exception as parse_err:
            logger.debug("Error mapping analysis record: %s", parse_err)

    return items


async def delete_user_resume_analysis(user_id: str, analysis_id: str) -> bool:
    """Delete specific analysis record ensuring strict ownership verification."""
    client = _get_client() if not user_id.startswith("usr_") else None

    if client:
        try:
            client.table("resume_analyses").delete().eq("id", analysis_id).eq("user_id", user_id).execute()
            return True
        except Exception as e:
            logger.debug("Could not delete analysis from Supabase: %s", e)
            return False
    else:
        if analysis_id in _MEMORY_ANALYSES and _MEMORY_ANALYSES[analysis_id].get("user_id") == user_id:
            del _MEMORY_ANALYSES[analysis_id]
            return True
        return False
