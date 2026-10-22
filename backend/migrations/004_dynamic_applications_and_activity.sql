-- ==============================================================================
-- UNIVERSAL JOB APPLY BOT - MIGRATION 004: DYNAMIC APPLICATIONS & ACTIVITY
-- Add missing metadata columns to public.applications and optimize activity queries
-- ==============================================================================

-- 1. ADD METADATA COLUMNS TO public.applications
ALTER TABLE public.applications
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS salary TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. EXPAND STATUS CHECK CONSTRAINT ON public.applications
ALTER TABLE public.applications
    DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE public.applications
    ADD CONSTRAINT applications_status_check
    CHECK (status IN ('applied', 'review_needed', 'interview', 'rejected', 'saved', 'failed', 'under_review'));

-- 3. INDEX FOR FAST USER ACTIVITY & RECENT LOGS TIMELINE
CREATE INDEX IF NOT EXISTS idx_applications_user_created
    ON public.applications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_user_created
    ON public.automation_tasks(user_id, created_at DESC);
