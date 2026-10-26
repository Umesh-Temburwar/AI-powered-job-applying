-- ==============================================================================
-- UNIVERSAL JOB APPLY BOT - MIGRATION 010: PORTAL CONFIGS, SYSTEM AUDIT & STORAGE
-- Completes Supabase Schema Setup:
--   1. Master public.portal_configs table & RLS policies
--   2. Master public.system_audit_logs table & RLS policies
--   3. Seeds the 8 core job portals (Naukri, Internshala, Indeed, LinkedIn, etc.)
--   4. Storage policies for private resumes bucket using (select auth.uid())::text
--   5. Grants for authenticated and service_role roles
-- ==============================================================================

-- 1. PORTAL CONFIGS TABLE
CREATE TABLE IF NOT EXISTS public.portal_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    website_url TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    daily_limit INT NOT NULL DEFAULT 50 CHECK (daily_limit > 0),
    delay_seconds INT NOT NULL DEFAULT 25 CHECK (delay_seconds >= 0),
    status TEXT NOT NULL DEFAULT 'operational' CHECK (status IN ('operational', 'degraded', 'offline', 'maintenance')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast status checks
CREATE INDEX IF NOT EXISTS idx_portal_configs_status ON public.portal_configs(status);
CREATE INDEX IF NOT EXISTS idx_portal_configs_enabled ON public.portal_configs(is_enabled);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_portal_configs_updated_at ON public.portal_configs;
CREATE TRIGGER trg_portal_configs_updated_at
BEFORE UPDATE ON public.portal_configs
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. SYSTEM AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.system_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT NOT NULL DEFAULT 'INFO' CHECK (level IN ('INFO', 'WARNING', 'ERROR', 'SUCCESS', 'CRITICAL')),
    portal TEXT NOT NULL DEFAULT 'System',
    action TEXT NOT NULL,
    details TEXT,
    candidate_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.system_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_candidate ON public.system_audit_logs(candidate_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_portal_level ON public.system_audit_logs(portal, level);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.portal_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. PORTAL CONFIGS RLS POLICIES
-- Candidates can read portal availability and throttling limits
DROP POLICY IF EXISTS "portal_configs_select_authenticated" ON public.portal_configs;
CREATE POLICY "portal_configs_select_authenticated" ON public.portal_configs
    FOR SELECT TO authenticated
    USING (true);

-- Only administrators can update portal configurations
DROP POLICY IF EXISTS "portal_configs_admin_update" ON public.portal_configs;
CREATE POLICY "portal_configs_admin_update" ON public.portal_configs
    FOR UPDATE TO authenticated
    USING (
        (SELECT (auth.jwt() ->> 'email')) IN ('umeshtemburwar2002@gmail.com', 'utemburwar2002@gmail.com')
        OR (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
        OR (SELECT public.is_admin())
    )
    WITH CHECK (
        (SELECT (auth.jwt() ->> 'email')) IN ('umeshtemburwar2002@gmail.com', 'utemburwar2002@gmail.com')
        OR (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
        OR (SELECT public.is_admin())
    );

-- 5. SYSTEM AUDIT LOGS RLS POLICIES
-- Admins can view audit logs
DROP POLICY IF EXISTS "audit_logs_admin_select" ON public.system_audit_logs;
CREATE POLICY "audit_logs_admin_select" ON public.system_audit_logs
    FOR SELECT TO authenticated
    USING (
        (SELECT (auth.jwt() ->> 'email')) IN ('umeshtemburwar2002@gmail.com', 'utemburwar2002@gmail.com')
        OR (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
        OR (SELECT public.is_admin())
    );

-- Candidates can insert audit events for their own actions
DROP POLICY IF EXISTS "audit_logs_authenticated_insert" ON public.system_audit_logs;
CREATE POLICY "audit_logs_authenticated_insert" ON public.system_audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (
        candidate_id IS NULL OR candidate_id = (SELECT auth.uid())
    );

-- 6. SEED DEFAULT PORTAL CONFIGS
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

-- 7. EXPLICIT GRANTS
GRANT ALL ON public.portal_configs TO service_role;
GRANT ALL ON public.system_audit_logs TO service_role;

GRANT SELECT, UPDATE ON public.portal_configs TO authenticated;
GRANT SELECT, INSERT ON public.system_audit_logs TO authenticated;

-- 8. REFRESH STORAGE POLICIES WITH (SELECT auth.uid())
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
