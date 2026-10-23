-- ==============================================================================
-- UNIVERSAL JOB APPLY BOT - MIGRATION 008: ADMIN RLS POLICIES
-- Multi-user administrative visibility for candidates, applications, & configs
-- ==============================================================================

DO $$ 
BEGIN
    -- 1. Admin SELECT on profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_admin_select'
    ) THEN
        CREATE POLICY "profiles_admin_select" ON public.profiles
            FOR SELECT TO authenticated
            USING (
                (SELECT (auth.jwt() ->> 'email')) IN ('umeshtemburwar2002@gmail.com')
                OR (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
            );
    END IF;

    -- 2. Admin UPDATE on profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_admin_update'
    ) THEN
        CREATE POLICY "profiles_admin_update" ON public.profiles
            FOR UPDATE TO authenticated
            USING (
                (SELECT (auth.jwt() ->> 'email')) IN ('umeshtemburwar2002@gmail.com')
                OR (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
            )
            WITH CHECK (
                (SELECT (auth.jwt() ->> 'email')) IN ('umeshtemburwar2002@gmail.com')
                OR (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
            );
    END IF;

    -- 3. Admin SELECT on applications
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'applications' AND policyname = 'applications_admin_select'
    ) THEN
        CREATE POLICY "applications_admin_select" ON public.applications
            FOR SELECT TO authenticated
            USING (
                (SELECT (auth.jwt() ->> 'email')) IN ('umeshtemburwar2002@gmail.com')
                OR (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
            );
    END IF;

    -- 4. Admin SELECT on platform_connections
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'platform_connections' AND policyname = 'connections_admin_select'
    ) THEN
        CREATE POLICY "connections_admin_select" ON public.platform_connections
            FOR SELECT TO authenticated
            USING (
                (SELECT (auth.jwt() ->> 'email')) IN ('umeshtemburwar2002@gmail.com')
                OR (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
            );
    END IF;

    -- 5. Admin UPDATE on portal_configs
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'portal_configs' AND policyname = 'portal_configs_admin_update'
    ) THEN
        CREATE POLICY "portal_configs_admin_update" ON public.portal_configs
            FOR UPDATE TO authenticated
            USING (
                (SELECT (auth.jwt() ->> 'email')) IN ('umeshtemburwar2002@gmail.com')
                OR (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
            )
            WITH CHECK (
                (SELECT (auth.jwt() ->> 'email')) IN ('umeshtemburwar2002@gmail.com')
                OR (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
            );
    END IF;
END $$;
