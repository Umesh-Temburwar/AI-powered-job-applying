-- ==============================================================================
-- UNIVERSAL JOB APPLY BOT — COMPLETE SCHEMA ON CONNECTED SUPABASE PROJECT
-- Migration: 012_complete_jobbot_supabase_schema.sql
-- Idempotent. Extends existing public.profiles (does not drop GATE tables).
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. UPDATED_AT HELPER (search_path-safe)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;

-- 2. EXTEND EXISTING PROFILES FOR JOB-BOT FIELDS
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS experience JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}'::text[],
    ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS onboarding_step INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS headline TEXT,
    ADD COLUMN IF NOT EXISTS summary TEXT,
    ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
    ADD COLUMN IF NOT EXISTS github_url TEXT,
    ADD COLUMN IF NOT EXISTS portfolio_url TEXT,
    ADD COLUMN IF NOT EXISTS projects JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS additional_info JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_profiles_onboarded ON public.profiles(is_onboarded);

-- 3. CORE JOB-BOT TABLES
CREATE TABLE IF NOT EXISTS public.resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'application/pdf',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    parsed_data JSONB DEFAULT '{}'::jsonb,
    ocr_needed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.job_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    job_titles TEXT[] DEFAULT '{}'::text[],
    locations TEXT[] DEFAULT '{}'::text[],
    experience_level TEXT DEFAULT 'entry_level',
    employment_types TEXT[] DEFAULT '{"full_time"}'::text[],
    min_salary NUMERIC,
    max_salary NUMERIC,
    selected_platforms TEXT[] DEFAULT '{"naukri", "internshala", "indeed"}'::text[],
    daily_application_limit INT NOT NULL DEFAULT 50 CHECK (daily_application_limit > 0),
    require_manual_review BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.automation_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled', 'idle', 'paused', 'review_required', 'error')),
    progress INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    message TEXT NOT NULL DEFAULT 'Task initialized',
    task_type TEXT NOT NULL DEFAULT 'job_apply',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 3,
    error_details TEXT,
    dry_run BOOLEAN NOT NULL DEFAULT TRUE,
    worker_id TEXT,
    locked_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.automation_tasks(id) ON DELETE SET NULL,
    job_title TEXT NOT NULL,
    company TEXT NOT NULL,
    job_url TEXT NOT NULL,
    platform TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'applied'
        CHECK (status IN ('applied', 'review_needed', 'interview', 'rejected', 'saved', 'failed', 'under_review')),
    location TEXT,
    salary TEXT,
    notes TEXT,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_job_url UNIQUE (user_id, job_url)
);

CREATE TABLE IF NOT EXISTS public.application_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    question_text TEXT NOT NULL,
    answer TEXT NOT NULL,
    field_type TEXT DEFAULT 'text',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_connected'
        CHECK (status IN ('not_connected', 'connecting', 'connected', 'login_required', 'error')),
    account_email TEXT,
    last_verified TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_platform UNIQUE (user_id, platform)
);

CREATE TABLE IF NOT EXISTS public.portal_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    website_url TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    daily_limit INT NOT NULL DEFAULT 50 CHECK (daily_limit > 0),
    delay_seconds INT NOT NULL DEFAULT 25 CHECK (delay_seconds >= 0),
    status TEXT NOT NULL DEFAULT 'operational'
        CHECK (status IN ('operational', 'degraded', 'offline', 'maintenance')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.system_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT NOT NULL DEFAULT 'INFO' CHECK (level IN ('INFO', 'WARNING', 'ERROR', 'SUCCESS', 'CRITICAL')),
    portal TEXT NOT NULL DEFAULT 'System',
    action TEXT NOT NULL,
    details TEXT,
    candidate_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- Unique indexes for dual upsert keys on screening answers
CREATE UNIQUE INDEX IF NOT EXISTS uq_answers_user_question
    ON public.application_answers(user_id, question);
CREATE UNIQUE INDEX IF NOT EXISTS uq_answers_user_question_text
    ON public.application_answers(user_id, question_text);

-- 4. INDEXES (FK + common filters)
CREATE INDEX IF NOT EXISTS idx_resumes_user ON public.resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_preferences_user ON public.job_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON public.automation_tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_queue ON public.automation_tasks(status, created_at) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_tasks_user_created ON public.automation_tasks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_user ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_platform ON public.applications(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_applications_user_status ON public.applications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_task_id ON public.applications(task_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_created ON public.applications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_answers_user ON public.application_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_connections_user_platform ON public.platform_connections(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_platform_connections_user_status ON public.platform_connections(user_id, status);
CREATE INDEX IF NOT EXISTS idx_portal_configs_status ON public.portal_configs(status);
CREATE INDEX IF NOT EXISTS idx_portal_configs_enabled ON public.portal_configs(is_enabled);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.system_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_candidate ON public.system_audit_logs(candidate_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_portal_level ON public.system_audit_logs(portal, level);
CREATE INDEX IF NOT EXISTS idx_resume_analyses_user ON public.resume_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_analyses_created ON public.resume_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resume_analyses_resume_id ON public.resume_analyses(resume_id);

-- 5. TRIGGERS
DROP TRIGGER IF EXISTS trg_resumes_updated_at ON public.resumes;
CREATE TRIGGER trg_resumes_updated_at
BEFORE UPDATE ON public.resumes
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_preferences_updated_at ON public.job_preferences;
CREATE TRIGGER trg_preferences_updated_at
BEFORE UPDATE ON public.job_preferences
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_applications_updated_at ON public.applications;
CREATE TRIGGER trg_applications_updated_at
BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_answers_updated_at ON public.application_answers;
CREATE TRIGGER trg_answers_updated_at
BEFORE UPDATE ON public.application_answers
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_platform_connections_updated_at ON public.platform_connections;
CREATE TRIGGER trg_platform_connections_updated_at
BEFORE UPDATE ON public.platform_connections
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_portal_configs_updated_at ON public.portal_configs;
CREATE TRIGGER trg_portal_configs_updated_at
BEFORE UPDATE ON public.portal_configs
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_resume_analyses_updated_at ON public.resume_analyses;
CREATE TRIGGER trg_resume_analyses_updated_at
BEFORE UPDATE ON public.resume_analyses
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.sync_application_answer_question()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
    IF NEW.question IS NULL OR btrim(NEW.question) = '' THEN
        NEW.question := NEW.question_text;
    END IF;
    IF NEW.question_text IS NULL OR btrim(NEW.question_text) = '' THEN
        NEW.question_text := NEW.question;
    END IF;
    IF NEW.question IS NULL OR btrim(NEW.question) = '' THEN
        RAISE EXCEPTION 'application_answers.question is required';
    END IF;
    NEW.question_text := NEW.question;
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_application_answer_question() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_answers_sync_question ON public.application_answers;
CREATE TRIGGER trg_answers_sync_question
BEFORE INSERT OR UPDATE ON public.application_answers
FOR EACH ROW EXECUTE FUNCTION public.sync_application_answer_question();

-- 6. ADMIN HELPER (private schema — not Data API exposed)
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, auth
AS $$
DECLARE
    v_email text;
    v_role text;
BEGIN
    v_email := lower(coalesce((select auth.jwt() ->> 'email'), ''));
    v_role := lower(coalesce(
        (select auth.jwt() -> 'app_metadata' ->> 'role'),
        (select auth.jwt() ->> 'role'),
        ''
    ));

    IF v_email IN ('umeshtemburwar2002@gmail.com', 'utemburwar2002@gmail.com') OR v_role = 'admin' THEN
        RETURN true;
    END IF;

    IF (select auth.uid()) IS NOT NULL THEN
        SELECT lower(coalesce(email, '')), lower(coalesce(raw_app_meta_data->>'role', ''))
        INTO v_email, v_role
        FROM auth.users
        WHERE id = (select auth.uid());

        IF v_email IN ('umeshtemburwar2002@gmail.com', 'utemburwar2002@gmail.com') OR v_role = 'admin' THEN
            RETURN true;
        END IF;
    END IF;

    RETURN false;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated, service_role;

-- Public wrapper so PostgREST/RLS policies can call a stable name
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, private
AS $$
    SELECT private.is_admin();
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- 7. SIGNUP: keep GATE profile seed, also seed job_preferences
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, is_onboarded, onboarding_step)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            split_part(COALESCE(NEW.email, ''), '@', 1)
        ),
        COALESCE(
            NEW.raw_user_meta_data->>'avatar_url',
            NEW.raw_user_meta_data->>'picture'
        ),
        false,
        1
    )
    ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
            avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
            updated_at = now();

    INSERT INTO public.job_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.handle_new_user() FROM PUBLIC, anon, authenticated;

INSERT INTO public.job_preferences (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- 8. ATOMIC TASK CLAIM
CREATE OR REPLACE FUNCTION public.claim_next_task(p_worker_id TEXT)
RETURNS SETOF public.automation_tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_task_id UUID;
BEGIN
    SELECT id INTO v_task_id
    FROM public.automation_tasks
    WHERE status = 'queued'
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_task_id IS NOT NULL THEN
        RETURN QUERY
        UPDATE public.automation_tasks
        SET status = 'running',
            started_at = COALESCE(started_at, now()),
            worker_id = p_worker_id,
            locked_at = now(),
            message = 'Task claimed by worker'
        WHERE id = v_task_id
        RETURNING *;
    END IF;
    RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_next_task(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_next_task(TEXT) TO service_role;

-- 9. RLS
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resumes_select_own" ON public.resumes;
CREATE POLICY "resumes_select_own" ON public.resumes FOR SELECT TO authenticated
    USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "resumes_insert_own" ON public.resumes;
CREATE POLICY "resumes_insert_own" ON public.resumes FOR INSERT TO authenticated
    WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "resumes_update_own" ON public.resumes;
CREATE POLICY "resumes_update_own" ON public.resumes FOR UPDATE TO authenticated
    USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "resumes_delete_own" ON public.resumes;
CREATE POLICY "resumes_delete_own" ON public.resumes FOR DELETE TO authenticated
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "preferences_select_own" ON public.job_preferences;
CREATE POLICY "preferences_select_own" ON public.job_preferences FOR SELECT TO authenticated
    USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "preferences_insert_own" ON public.job_preferences;
CREATE POLICY "preferences_insert_own" ON public.job_preferences FOR INSERT TO authenticated
    WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "preferences_update_own" ON public.job_preferences;
CREATE POLICY "preferences_update_own" ON public.job_preferences FOR UPDATE TO authenticated
    USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "preferences_delete_own" ON public.job_preferences;
CREATE POLICY "preferences_delete_own" ON public.job_preferences FOR DELETE TO authenticated
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "tasks_select_own" ON public.automation_tasks;
CREATE POLICY "tasks_select_own" ON public.automation_tasks FOR SELECT TO authenticated
    USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "tasks_insert_own" ON public.automation_tasks;
CREATE POLICY "tasks_insert_own" ON public.automation_tasks FOR INSERT TO authenticated
    WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "tasks_update_own" ON public.automation_tasks;
CREATE POLICY "tasks_update_own" ON public.automation_tasks FOR UPDATE TO authenticated
    USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "tasks_delete_own" ON public.automation_tasks;
CREATE POLICY "tasks_delete_own" ON public.automation_tasks FOR DELETE TO authenticated
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "applications_select_own" ON public.applications;
CREATE POLICY "applications_select_own" ON public.applications FOR SELECT TO authenticated
    USING ((select auth.uid()) = user_id OR (select public.is_admin()));
DROP POLICY IF EXISTS "applications_insert_own" ON public.applications;
CREATE POLICY "applications_insert_own" ON public.applications FOR INSERT TO authenticated
    WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "applications_update_own" ON public.applications;
CREATE POLICY "applications_update_own" ON public.applications FOR UPDATE TO authenticated
    USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "applications_delete_own" ON public.applications;
CREATE POLICY "applications_delete_own" ON public.applications FOR DELETE TO authenticated
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "answers_select_own" ON public.application_answers;
CREATE POLICY "answers_select_own" ON public.application_answers FOR SELECT TO authenticated
    USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "answers_insert_own" ON public.application_answers;
CREATE POLICY "answers_insert_own" ON public.application_answers FOR INSERT TO authenticated
    WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "answers_update_own" ON public.application_answers;
CREATE POLICY "answers_update_own" ON public.application_answers FOR UPDATE TO authenticated
    USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "answers_delete_own" ON public.application_answers;
CREATE POLICY "answers_delete_own" ON public.application_answers FOR DELETE TO authenticated
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "connections_select_own" ON public.platform_connections;
CREATE POLICY "connections_select_own" ON public.platform_connections FOR SELECT TO authenticated
    USING ((select auth.uid()) = user_id OR (select public.is_admin()));
DROP POLICY IF EXISTS "connections_insert_own" ON public.platform_connections;
CREATE POLICY "connections_insert_own" ON public.platform_connections FOR INSERT TO authenticated
    WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "connections_update_own" ON public.platform_connections;
CREATE POLICY "connections_update_own" ON public.platform_connections FOR UPDATE TO authenticated
    USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "connections_delete_own" ON public.platform_connections;
CREATE POLICY "connections_delete_own" ON public.platform_connections FOR DELETE TO authenticated
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "portal_configs_select_authenticated" ON public.portal_configs;
CREATE POLICY "portal_configs_select_authenticated" ON public.portal_configs FOR SELECT TO authenticated
    USING (true);
DROP POLICY IF EXISTS "portal_configs_admin_update" ON public.portal_configs;
CREATE POLICY "portal_configs_admin_update" ON public.portal_configs FOR UPDATE TO authenticated
    USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));

DROP POLICY IF EXISTS "audit_logs_admin_select" ON public.system_audit_logs;
CREATE POLICY "audit_logs_admin_select" ON public.system_audit_logs FOR SELECT TO authenticated
    USING ((select public.is_admin()));
DROP POLICY IF EXISTS "audit_logs_authenticated_insert" ON public.system_audit_logs;
CREATE POLICY "audit_logs_authenticated_insert" ON public.system_audit_logs FOR INSERT TO authenticated
    WITH CHECK (candidate_id IS NULL OR candidate_id = (select auth.uid()));

DROP POLICY IF EXISTS "resume_analyses_select_own" ON public.resume_analyses;
CREATE POLICY "resume_analyses_select_own" ON public.resume_analyses FOR SELECT TO authenticated
    USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "resume_analyses_insert_own" ON public.resume_analyses;
CREATE POLICY "resume_analyses_insert_own" ON public.resume_analyses FOR INSERT TO authenticated
    WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "resume_analyses_update_own" ON public.resume_analyses;
CREATE POLICY "resume_analyses_update_own" ON public.resume_analyses FOR UPDATE TO authenticated
    USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "resume_analyses_delete_own" ON public.resume_analyses;
CREATE POLICY "resume_analyses_delete_own" ON public.resume_analyses FOR DELETE TO authenticated
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
CREATE POLICY "profiles_admin_select" ON public.profiles FOR SELECT TO authenticated
    USING ((select public.is_admin()));
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update" ON public.profiles FOR UPDATE TO authenticated
    USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE TO authenticated
    USING ((select auth.uid()) = id);

-- 10. GRANTS (Data API + service role)
GRANT USAGE ON SCHEMA public TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resumes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_answers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_connections TO authenticated;
GRANT SELECT, UPDATE ON public.portal_configs TO authenticated;
GRANT SELECT, INSERT ON public.system_audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resume_analyses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

GRANT ALL ON public.resumes TO service_role;
GRANT ALL ON public.job_preferences TO service_role;
GRANT ALL ON public.automation_tasks TO service_role;
GRANT ALL ON public.applications TO service_role;
GRANT ALL ON public.application_answers TO service_role;
GRANT ALL ON public.platform_connections TO service_role;
GRANT ALL ON public.portal_configs TO service_role;
GRANT ALL ON public.system_audit_logs TO service_role;
GRANT ALL ON public.resume_analyses TO service_role;
GRANT ALL ON public.profiles TO service_role;

REVOKE ALL ON public.resumes FROM anon;
REVOKE ALL ON public.job_preferences FROM anon;
REVOKE ALL ON public.automation_tasks FROM anon;
REVOKE ALL ON public.applications FROM anon;
REVOKE ALL ON public.application_answers FROM anon;
REVOKE ALL ON public.platform_connections FROM anon;
REVOKE ALL ON public.portal_configs FROM anon;
REVOKE ALL ON public.system_audit_logs FROM anon;
REVOKE ALL ON public.resume_analyses FROM anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

-- 11. PORTAL SEED
INSERT INTO public.portal_configs (id, name, website_url, is_enabled, daily_limit, delay_seconds, status, notes)
VALUES
    ('naukri', 'Naukri.com', 'https://www.naukri.com', true, 50, 25, 'operational', 'Primary Indian tech job portal with high volume Easy Apply.'),
    ('internshala', 'Internshala', 'https://internshala.com', true, 40, 20, 'operational', 'Internships and fresher developer roles with direct questionnaire answering.'),
    ('indeed', 'Indeed', 'https://in.indeed.com', true, 45, 30, 'operational', 'Global job board with Easily Apply multi-step modal workflows.'),
    ('linkedin', 'LinkedIn', 'https://www.linkedin.com', true, 30, 35, 'operational', 'Professional networking portal with Easy Apply quick submission.'),
    ('foundit', 'Foundit (Monster)', 'https://www.foundit.in', true, 40, 20, 'operational', 'Indian enterprise job board with keyword search and direct applications.'),
    ('wellfound', 'Wellfound (AngelList)', 'https://wellfound.com', true, 25, 30, 'operational', 'Startup developer hiring with customized pitch notes.'),
    ('glassdoor', 'Glassdoor', 'https://www.glassdoor.co.in', true, 30, 25, 'operational', 'Employer reviews and Easy Apply jobs for tech roles.'),
    ('cutshort', 'Cutshort', 'https://cutshort.io', true, 25, 25, 'operational', 'AI-driven tech matchmaking with direct recruiter conversations.')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    website_url = EXCLUDED.website_url;

-- 12. PRIVATE RESUMES STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'resumes',
    'resumes',
    false,
    10485760,
    ARRAY[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
    ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
    ]::text[];

DROP POLICY IF EXISTS "resumes_bucket_insert" ON storage.objects;
CREATE POLICY "resumes_bucket_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'resumes' AND
        (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );

DROP POLICY IF EXISTS "resumes_bucket_select" ON storage.objects;
CREATE POLICY "resumes_bucket_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'resumes' AND
        (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );

DROP POLICY IF EXISTS "resumes_bucket_update" ON storage.objects;
CREATE POLICY "resumes_bucket_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'resumes' AND
        (storage.foldername(name))[1] = (SELECT auth.uid())::text
    )
    WITH CHECK (
        bucket_id = 'resumes' AND
        (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );

DROP POLICY IF EXISTS "resumes_bucket_delete" ON storage.objects;
CREATE POLICY "resumes_bucket_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'resumes' AND
        (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );
