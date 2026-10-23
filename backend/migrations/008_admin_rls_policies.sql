-- ==============================================================================
-- UNIVERSAL JOB APPLY BOT - MIGRATION 008: ADMIN RLS POLICIES
-- Multi-user administrative visibility for candidates, applications, & configs
-- ==============================================================================

-- 1. Helper function for verifying admin authority
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email text;
  v_role text;
BEGIN
  -- Check from auth.jwt()
  v_email := LOWER(COALESCE(auth.jwt() ->> 'email', ''));
  v_role := LOWER(COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() ->> 'role', ''));
  
  IF v_email IN ('umeshtemburwar2002@gmail.com', 'utemburwar2002@gmail.com') OR v_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Check from auth.users via auth.uid()
  IF auth.uid() IS NOT NULL THEN
    SELECT LOWER(COALESCE(email, '')), LOWER(COALESCE(raw_app_meta_data->>'role', ''))
    INTO v_email, v_role
    FROM auth.users
    WHERE id = auth.uid();

    IF v_email IN ('umeshtemburwar2002@gmail.com', 'utemburwar2002@gmail.com') OR v_role = 'admin' THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role, anon;

-- 2. Admin policies
DO $$ 
BEGIN
    -- 1. Admin SELECT on profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_admin_select'
    ) THEN
        CREATE POLICY "profiles_admin_select" ON public.profiles
            FOR SELECT TO authenticated
            USING (
                (SELECT (auth.jwt() ->> 'email')) IN ('umeshtemburwar2002@gmail.com', 'utemburwar2002@gmail.com')
                OR (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
                OR (SELECT public.is_admin())
            );
    ELSE
        ALTER POLICY "profiles_admin_select" ON public.profiles
            USING (
                (SELECT (auth.jwt() ->> 'email')) IN ('umeshtemburwar2002@gmail.com', 'utemburwar2002@gmail.com')
                OR (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
                OR (SELECT public.is_admin())
            );
    END IF;

    -- 2. Admin UPDATE on profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_admin_update'
    ) THEN
        CREATE POLICY "profiles_admin_update" ON public.profiles
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
    ELSE
        ALTER POLICY "profiles_admin_update" ON public.profiles
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
    END IF;

    -- 3. Admin SELECT on applications
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'applications' AND policyname = 'applications_admin_select'
    ) THEN
        CREATE POLICY "applications_admin_select" ON public.applications
            FOR SELECT TO authenticated
            USING (
                (SELECT (auth.jwt() ->> 'email')) IN ('umeshtemburwar2002@gmail.com', 'utemburwar2002@gmail.com')
                OR (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
                OR (SELECT public.is_admin())
            );
    ELSE
        ALTER POLICY "applications_admin_select" ON public.applications
            USING (
                (SELECT (auth.jwt() ->> 'email')) IN ('umeshtemburwar2002@gmail.com', 'utemburwar2002@gmail.com')
                OR (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
                OR (SELECT public.is_admin())
            );
    END IF;

    -- 4. Admin SELECT on platform_connections
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'platform_connections' AND policyname = 'connections_admin_select'
    ) THEN
        CREATE POLICY "connections_admin_select" ON public.platform_connections
            FOR SELECT TO authenticated
            USING (
                (SELECT (auth.jwt() ->> 'email')) IN ('umeshtemburwar2002@gmail.com', 'utemburwar2002@gmail.com')
                OR (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
                OR (SELECT public.is_admin())
            );
    ELSE
        ALTER POLICY "connections_admin_select" ON public.platform_connections
            USING (
                (SELECT (auth.jwt() ->> 'email')) IN ('umeshtemburwar2002@gmail.com', 'utemburwar2002@gmail.com')
                OR (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin'
                OR (SELECT public.is_admin())
            );
    END IF;

    -- 5. Admin UPDATE on portal_configs
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'portal_configs' AND policyname = 'portal_configs_admin_update'
    ) THEN
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
    ELSE
        ALTER POLICY "portal_configs_admin_update" ON public.portal_configs
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
    END IF;
END $$;
