-- ==============================================================================
-- UNIVERSAL JOB APPLY BOT - MIGRATION 007: PLATFORM CONNECTIONS
-- Phase 3 Website Connections & Multi-User Session Isolation
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.platform_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_connected', -- 'not_connected', 'connecting', 'connected', 'login_required', 'error'
    account_email TEXT,
    last_verified TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_platform UNIQUE (user_id, platform)
);

ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'platform_connections' AND policyname = 'connections_select_own'
    ) THEN
        CREATE POLICY "connections_select_own" ON public.platform_connections
            FOR SELECT TO authenticated USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'platform_connections' AND policyname = 'connections_insert_own'
    ) THEN
        CREATE POLICY "connections_insert_own" ON public.platform_connections
            FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'platform_connections' AND policyname = 'connections_update_own'
    ) THEN
        CREATE POLICY "connections_update_own" ON public.platform_connections
            FOR UPDATE TO authenticated USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'platform_connections' AND policyname = 'connections_delete_own'
    ) THEN
        CREATE POLICY "connections_delete_own" ON public.platform_connections
            FOR DELETE TO authenticated USING (auth.uid() = user_id);
    END IF;
END $$;

GRANT ALL ON public.platform_connections TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_connections TO authenticated;
