-- ==============================================================================
-- UNIVERSAL JOB APPLY BOT - MIGRATION 005: APPLICATION ANSWERS & ACCESS GRANTS
-- Extends application_answers with field_type, unique question constraint, and grants
-- ==============================================================================

-- 1. Extend application_answers
ALTER TABLE public.application_answers
    ADD COLUMN IF NOT EXISTS field_type TEXT DEFAULT 'text';

-- 2. Add unique constraint on user_id and question for easy upsert
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_answers_user_question'
    ) THEN
        ALTER TABLE public.application_answers
            ADD CONSTRAINT uq_answers_user_question UNIQUE (user_id, question);
    END IF;
END $$;

-- 3. Composite indexes for fast user queries
CREATE INDEX IF NOT EXISTS idx_applications_user_platform
    ON public.applications(user_id, platform);

CREATE INDEX IF NOT EXISTS idx_applications_user_status
    ON public.applications(user_id, status);

CREATE INDEX IF NOT EXISTS idx_answers_user_question
    ON public.application_answers(user_id, question);

-- 4. Explicit grants to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resumes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_answers TO authenticated;
