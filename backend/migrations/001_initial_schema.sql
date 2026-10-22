-- ==============================================================================
-- UNIVERSAL JOB APPLY BOT — POSTGRESQL INITIAL SCHEMA & SECURITY MIGRATION
-- Migration: 001_initial_schema.sql
-- Description: Core tables, Row Level Security (RLS), Triggers, & Storage Policies
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. REUSABLE UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 3. CORE TABLES
-- ==============================================================================

-- 3.1 PROFILES TABLE
-- Stores candidate identity and career background linked 1:1 with auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    education JSONB DEFAULT '[]'::jsonb,
    experience JSONB DEFAULT '[]'::jsonb,
    skills TEXT[] DEFAULT '{}'::text[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2 RESUMES METADATA TABLE
-- Tracks candidate resume versions stored in the private Supabase Storage bucket
CREATE TABLE IF NOT EXISTS public.resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'application/pdf',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.3 JOB PREFERENCES TABLE
-- Stores user targeting criteria, platform toggles, and safety interval settings
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

-- 3.4 AUTOMATION TASKS TABLE
-- Records background executor status, progress checkpoints, and lifecycle timestamps
CREATE TABLE IF NOT EXISTS public.automation_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'paused', 'completed', 'review_required', 'error')),
    progress INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    message TEXT NOT NULL DEFAULT 'Task initialized',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.5 APPLICATIONS CRM TABLE
-- Tracks individual job applications per user.
-- User-scoped uniqueness on (user_id, job_url) allows multiple candidates to apply to the same job.
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.automation_tasks(id) ON DELETE SET NULL,
    job_title TEXT NOT NULL,
    company TEXT NOT NULL,
    job_url TEXT NOT NULL,
    platform TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'review_needed', 'interview', 'rejected', 'saved')),
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_job_url UNIQUE (user_id, job_url)
);

-- 3.6 APPLICATION ANSWERS TABLE
-- Reusable responses to standard employer screening questionnaires
CREATE TABLE IF NOT EXISTS public.application_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 4. PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_resumes_user ON public.resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_preferences_user ON public.job_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON public.automation_tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_user ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_platform ON public.applications(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_applications_user_status ON public.applications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_answers_user ON public.application_answers(user_id);

-- ==============================================================================
-- 5. UPDATED_AT TRIGGERS
-- ==============================================================================
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

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

-- ==============================================================================
-- 6. AUTOMATIC USER INITIALIZATION TRIGGER
-- Automatically seeds profile and job preferences on auth.users registration
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_full_name TEXT;
BEGIN
    user_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
    );

    -- 1. Create Profile
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, user_full_name)
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name;

    -- 2. Create Default Job Preferences
    INSERT INTO public.job_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict isolation: Users can access and manipulate ONLY their own data rows.
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_answers ENABLE ROW LEVEL SECURITY;

-- 7.1 PROFILES POLICIES
-- Primary key 'id' equals auth.uid()
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_own" ON public.profiles
    FOR DELETE TO authenticated
    USING (auth.uid() = id);

-- 7.2 RESUMES POLICIES
CREATE POLICY "resumes_select_own" ON public.resumes
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "resumes_insert_own" ON public.resumes
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "resumes_update_own" ON public.resumes
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "resumes_delete_own" ON public.resumes
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- 7.3 JOB PREFERENCES POLICIES
CREATE POLICY "preferences_select_own" ON public.job_preferences
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "preferences_insert_own" ON public.job_preferences
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "preferences_update_own" ON public.job_preferences
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "preferences_delete_own" ON public.job_preferences
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- 7.4 AUTOMATION TASKS POLICIES
CREATE POLICY "tasks_select_own" ON public.automation_tasks
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "tasks_insert_own" ON public.automation_tasks
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_update_own" ON public.automation_tasks
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_delete_own" ON public.automation_tasks
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- 7.5 APPLICATIONS POLICIES
CREATE POLICY "applications_select_own" ON public.applications
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "applications_insert_own" ON public.applications
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "applications_update_own" ON public.applications
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "applications_delete_own" ON public.applications
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- 7.6 APPLICATION ANSWERS POLICIES
CREATE POLICY "answers_select_own" ON public.application_answers
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "answers_insert_own" ON public.application_answers
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "answers_update_own" ON public.application_answers
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "answers_delete_own" ON public.application_answers
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- ==============================================================================
-- 8. PRIVATE STORAGE BUCKET & POLICIES ('resumes')
-- Enforces per-user folder isolation: {user_id}/{filename}
-- ==============================================================================

-- 8.1 Create bucket if not present
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'resumes',
    'resumes',
    false,               -- Strictly private, never public
    10485760,            -- 10 MB limit
    ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf']::text[];

-- 8.2 Storage Object RLS Policies
-- Enforce that folder name matches the authenticated user's ID: auth.uid()::text = (storage.foldername(name))[1]

DROP POLICY IF EXISTS "resumes_bucket_insert" ON storage.objects;
CREATE POLICY "resumes_bucket_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'resumes' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "resumes_bucket_select" ON storage.objects;
CREATE POLICY "resumes_bucket_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'resumes' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "resumes_bucket_update" ON storage.objects;
CREATE POLICY "resumes_bucket_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'resumes' AND
        (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'resumes' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "resumes_bucket_delete" ON storage.objects;
CREATE POLICY "resumes_bucket_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'resumes' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );
