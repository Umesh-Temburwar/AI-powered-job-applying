-- ==============================================================================
-- UNIVERSAL JOB APPLY BOT - MIGRATION 011: RESUME ANALYSIS & JD MATCHING SCHEMA
-- Description: Creates resume_analyses table, security indexes, and RLS policies
-- ==============================================================================

-- 1. CREATE RESUME ANALYSES TABLE
CREATE TABLE IF NOT EXISTS public.resume_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
    resume_name TEXT NOT NULL DEFAULT 'resume.pdf',
    job_title TEXT DEFAULT 'Target Role',
    job_description TEXT,
    overall_score INT NOT NULL DEFAULT 70 CHECK (overall_score >= 0 AND overall_score <= 100),
    match_summary TEXT,
    skills_analysis JSONB DEFAULT '{"matched": [], "missing": [], "candidate_skills": []}'::jsonb,
    experience_analysis JSONB DEFAULT '{"relevance_score": 75, "insights": []}'::jsonb,
    education_analysis JSONB DEFAULT '{"matches_criteria": true, "degree_detected": ""}'::jsonb,
    section_scores JSONB DEFAULT '{"contact": 100, "skills": 80, "experience": 75, "education": 90, "projects": 80}'::jsonb,
    actionable_suggestions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CREATE INDEXES FOR FAST USER QUERIES
CREATE INDEX IF NOT EXISTS idx_resume_analyses_user ON public.resume_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_analyses_created ON public.resume_analyses(created_at DESC);

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.resume_analyses ENABLE ROW LEVEL SECURITY;

-- 4. CONFIGURE ISOLATED USER-SPECIFIC RLS POLICIES
DROP POLICY IF EXISTS "resume_analyses_select_own" ON public.resume_analyses;
CREATE POLICY "resume_analyses_select_own" ON public.resume_analyses
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "resume_analyses_insert_own" ON public.resume_analyses;
CREATE POLICY "resume_analyses_insert_own" ON public.resume_analyses
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "resume_analyses_update_own" ON public.resume_analyses;
CREATE POLICY "resume_analyses_update_own" ON public.resume_analyses
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "resume_analyses_delete_own" ON public.resume_analyses;
CREATE POLICY "resume_analyses_delete_own" ON public.resume_analyses
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- 5. GRANT PERMISSIONS TO AUTHENTICATED AND SERVICE ROLE
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resume_analyses TO authenticated;
GRANT ALL ON public.resume_analyses TO service_role;
