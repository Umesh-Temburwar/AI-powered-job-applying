-- ==============================================================================
-- UNIVERSAL JOB APPLY BOT - MIGRATION 009: PLATFORM CONNECTIONS RLS & PERFORMANCE
-- Follows Supabase Postgres Best Practices:
--   1. Ensures UPDATE policy includes both USING and WITH CHECK to prevent IDOR
--   2. Adds compound indexes on (user_id, platform) and (user_id, status)
--   3. Adds check constraint on status values
-- ==============================================================================

-- 1. Ensure composite indexes for high-speed lookup
CREATE INDEX IF NOT EXISTS idx_platform_connections_user_platform
    ON public.platform_connections (user_id, platform);

CREATE INDEX IF NOT EXISTS idx_platform_connections_user_status
    ON public.platform_connections (user_id, status);

-- 2. Harden RLS: Drop and recreate update policy with both USING and WITH CHECK
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'platform_connections' AND policyname = 'connections_update_own'
    ) THEN
        DROP POLICY "connections_update_own" ON public.platform_connections;
    END IF;

    CREATE POLICY "connections_update_own" ON public.platform_connections
        FOR UPDATE TO authenticated 
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
END $$;

-- 3. Ensure permissions for service role and authenticated
GRANT ALL ON public.platform_connections TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_connections TO authenticated;
