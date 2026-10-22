-- ==============================================================================
-- UNIVERSAL JOB APPLY BOT - MIGRATION 002: TASK QUEUE & SECURITY/PERF HARDENING
-- Phase 6 Background Task Queue, Atomic Worker Claiming, and Supabase Best Practices
-- ==============================================================================

-- 1. EXTEND AUTOMATION_TASKS TABLE SCHEMA
ALTER TABLE public.automation_tasks
    DROP CONSTRAINT IF EXISTS automation_tasks_status_check;

ALTER TABLE public.automation_tasks
    ADD CONSTRAINT automation_tasks_status_check
    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled', 'idle', 'paused', 'review_required', 'error'));

ALTER TABLE public.automation_tasks
    ALTER COLUMN status SET DEFAULT 'queued';

ALTER TABLE public.automation_tasks
    ADD COLUMN IF NOT EXISTS task_type TEXT NOT NULL DEFAULT 'job_apply',
    ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_retries INT NOT NULL DEFAULT 3,
    ADD COLUMN IF NOT EXISTS error_details TEXT,
    ADD COLUMN IF NOT EXISTS dry_run BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS worker_id TEXT,
    ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- 2. COVERING INDEXES (Performance Advisor Remediations)
CREATE INDEX IF NOT EXISTS idx_tasks_queue
    ON public.automation_tasks(status, created_at)
    WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS idx_tasks_user_active
    ON public.automation_tasks(user_id, status);

CREATE INDEX IF NOT EXISTS idx_applications_task_id
    ON public.applications(task_id);

-- 3. HARDEN TRIGGER FUNCTIONS (Security Advisor Remediations)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    user_full_name TEXT;
BEGIN
    user_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
    );

    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, user_full_name)
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name;

    INSERT INTO public.job_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'rls_auto_enable' AND n.nspname = 'public'
    ) THEN
        EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated';
    END IF;
END $$;

-- 4. ATOMIC TASK CLAIMING STORED PROCEDURE (FOR UPDATE SKIP LOCKED)
CREATE OR REPLACE FUNCTION public.claim_next_task(p_worker_id TEXT)
RETURNS SETOF public.automation_tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
            started_at = COALESCE(started_at, NOW()),
            worker_id = p_worker_id,
            locked_at = NOW(),
            message = 'Task claimed by worker'
        WHERE id = v_task_id
        RETURNING *;
    END IF;
    RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_next_task(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_next_task(TEXT) TO service_role;

-- 5. OPTIMIZE RLS POLICIES WITH (SELECT auth.uid()) (Auth Initplan Performance Fix)
-- 5.1 Profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT TO authenticated
    USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE TO authenticated
    USING ((select auth.uid()) = id)
    WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own" ON public.profiles
    FOR DELETE TO authenticated
    USING ((select auth.uid()) = id);

-- 5.2 Resumes
DROP POLICY IF EXISTS "resumes_select_own" ON public.resumes;
CREATE POLICY "resumes_select_own" ON public.resumes
    FOR SELECT TO authenticated
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "resumes_insert_own" ON public.resumes;
CREATE POLICY "resumes_insert_own" ON public.resumes
    FOR INSERT TO authenticated
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "resumes_update_own" ON public.resumes;
CREATE POLICY "resumes_update_own" ON public.resumes
    FOR UPDATE TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "resumes_delete_own" ON public.resumes;
CREATE POLICY "resumes_delete_own" ON public.resumes
    FOR DELETE TO authenticated
    USING ((select auth.uid()) = user_id);

-- 5.3 Job Preferences
DROP POLICY IF EXISTS "preferences_select_own" ON public.job_preferences;
CREATE POLICY "preferences_select_own" ON public.job_preferences
    FOR SELECT TO authenticated
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "preferences_insert_own" ON public.job_preferences;
CREATE POLICY "preferences_insert_own" ON public.job_preferences
    FOR INSERT TO authenticated
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "preferences_update_own" ON public.job_preferences;
CREATE POLICY "preferences_update_own" ON public.job_preferences
    FOR UPDATE TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "preferences_delete_own" ON public.job_preferences;
CREATE POLICY "preferences_delete_own" ON public.job_preferences
    FOR DELETE TO authenticated
    USING ((select auth.uid()) = user_id);

-- 5.4 Automation Tasks
DROP POLICY IF EXISTS "tasks_select_own" ON public.automation_tasks;
CREATE POLICY "tasks_select_own" ON public.automation_tasks
    FOR SELECT TO authenticated
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "tasks_insert_own" ON public.automation_tasks;
CREATE POLICY "tasks_insert_own" ON public.automation_tasks
    FOR INSERT TO authenticated
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "tasks_update_own" ON public.automation_tasks;
CREATE POLICY "tasks_update_own" ON public.automation_tasks
    FOR UPDATE TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "tasks_delete_own" ON public.automation_tasks;
CREATE POLICY "tasks_delete_own" ON public.automation_tasks
    FOR DELETE TO authenticated
    USING ((select auth.uid()) = user_id);

-- 5.5 Applications
DROP POLICY IF EXISTS "applications_select_own" ON public.applications;
CREATE POLICY "applications_select_own" ON public.applications
    FOR SELECT TO authenticated
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "applications_insert_own" ON public.applications;
CREATE POLICY "applications_insert_own" ON public.applications
    FOR INSERT TO authenticated
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "applications_update_own" ON public.applications;
CREATE POLICY "applications_update_own" ON public.applications
    FOR UPDATE TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "applications_delete_own" ON public.applications;
CREATE POLICY "applications_delete_own" ON public.applications
    FOR DELETE TO authenticated
    USING ((select auth.uid()) = user_id);

-- 5.6 Application Answers
DROP POLICY IF EXISTS "answers_select_own" ON public.application_answers;
CREATE POLICY "answers_select_own" ON public.application_answers
    FOR SELECT TO authenticated
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "answers_insert_own" ON public.application_answers;
CREATE POLICY "answers_insert_own" ON public.application_answers
    FOR INSERT TO authenticated
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "answers_update_own" ON public.application_answers;
CREATE POLICY "answers_update_own" ON public.application_answers
    FOR UPDATE TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "answers_delete_own" ON public.application_answers;
CREATE POLICY "answers_delete_own" ON public.application_answers
    FOR DELETE TO authenticated
    USING ((select auth.uid()) = user_id);
