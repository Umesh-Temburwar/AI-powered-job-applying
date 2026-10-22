-- ==============================================================================
-- UNIVERSAL JOB APPLY BOT — SMART ONBOARDING & PROFILE BUILDER SCHEMA
-- Migration: 003_smart_onboarding_schema.sql
-- Description: Extends profiles, resumes, and storage buckets for smart onboarding
-- ==============================================================================

-- 1. EXTEND PROFILES FOR FULL ONBOARDING & CAREER DATA
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS onboarding_step INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS headline TEXT,
    ADD COLUMN IF NOT EXISTS summary TEXT,
    ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
    ADD COLUMN IF NOT EXISTS github_url TEXT,
    ADD COLUMN IF NOT EXISTS portfolio_url TEXT,
    ADD COLUMN IF NOT EXISTS projects JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS additional_info JSONB DEFAULT '{}'::jsonb;

-- Performance index for onboarding status checks
CREATE INDEX IF NOT EXISTS idx_profiles_onboarded ON public.profiles(is_onboarded);

-- 2. EXTEND RESUMES FOR PARSED EXTRACTIONS & MULTI-FORMAT SUPPORT
ALTER TABLE public.resumes
    ADD COLUMN IF NOT EXISTS parsed_data JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS ocr_needed BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. UPDATE STORAGE BUCKET TO ALLOW DOCX AS WELL AS PDF
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

-- 4. Update automatic user handler
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SET search_path = public
AS $$
DECLARE
    user_full_name TEXT;
BEGIN
    user_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
    );

    -- 1. Create Profile with email and onboarding_step 1
    INSERT INTO public.profiles (id, full_name, email, is_onboarded, onboarding_step)
    VALUES (NEW.id, user_full_name, NEW.email, false, 1)
    ON CONFLICT (id) DO UPDATE
    SET 
        full_name = EXCLUDED.full_name,
        email = COALESCE(public.profiles.email, EXCLUDED.email);

    -- 2. Create Default Job Preferences
    INSERT INTO public.job_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
