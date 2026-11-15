-- ====================================================================
-- RICOZ — Public Authentication & Admin Trigger Security Hardening
-- Migration: 20261114200000_public_auth_security_hardening.sql
-- ====================================================================

-- --------------------------------------------------------------------
-- PHASE 1: Public User Account Status & Granular Authorization
-- --------------------------------------------------------------------

-- 1. Add status column to public.user_profiles with default 'active'
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_status_check'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_status_check
      CHECK (status IN ('active', 'suspended', 'deactivated'));
  END IF;
END $$;

-- 2. Index for status-filtered lookups and fast session validation
CREATE INDEX IF NOT EXISTS idx_user_profiles_status
  ON public.user_profiles(status);

-- 3. Seed explicit 'users.deactivate' permission if missing
INSERT INTO public.admin_permissions (slug, name, module, action)
VALUES ('users.deactivate', 'Deactivate Public User', 'users', 'deactivate')
ON CONFLICT (slug) DO NOTHING;

-- Grant users.deactivate to super_admin role
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r
CROSS JOIN public.admin_permissions p
WHERE r.slug = 'super_admin' AND p.slug = 'users.deactivate'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. Trigger Function: Strict status-change authorization
-- - users.edit ALONE does NOT authorize status changes
-- - status -> 'suspended' strictly requires users.suspend
-- - status -> 'active' strictly requires users.activate
-- - status -> 'deactivated' strictly requires users.deactivate
-- - super_admins retain full status-management authority across all transitions
-- - public users can NEVER change their own status
CREATE OR REPLACE FUNCTION public.guard_user_profile_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- If called within an authenticated user context (client JWT)
    IF auth.uid() IS NOT NULL THEN
      -- Super Admin has full status authority
      IF public.is_super_admin() THEN
        RETURN NEW;
      END IF;

      -- Transition to 'suspended': requires explicit users.suspend
      IF NEW.status = 'suspended' THEN
        IF NOT public.has_permission('users.suspend') THEN
          RAISE EXCEPTION 'Security Violation: Permission users.suspend required to suspend accounts.';
        END IF;

      -- Transition to 'active': requires explicit users.activate
      ELSIF NEW.status = 'active' THEN
        IF NOT public.has_permission('users.activate') THEN
          RAISE EXCEPTION 'Security Violation: Permission users.activate required to activate accounts.';
        END IF;

      -- Transition to 'deactivated': requires explicit users.deactivate
      ELSIF NEW.status = 'deactivated' THEN
        IF NOT public.has_permission('users.deactivate') THEN
          RAISE EXCEPTION 'Security Violation: Permission users.deactivate required to deactivate accounts.';
        END IF;

      ELSE
        RAISE EXCEPTION 'Security Violation: Invalid account status %.', NEW.status;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_user_profile_status ON public.user_profiles;
CREATE TRIGGER trg_guard_user_profile_status
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_user_profile_status();

-- --------------------------------------------------------------------
-- PHASE 2: Admin Insertion Trigger Hardening (All Admin Roles)
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_admin_user_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  -- 1. Master service role / raw SQL backend execution (auth.uid() IS NULL) bypasses client checks
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- 2. Reject unauthorized insertion of ANY administrative role
  IF NOT (public.is_super_admin() OR public.has_permission('users.create')) THEN
    RAISE EXCEPTION 'Security Violation: You do not have permission to provision administrative accounts.';
  END IF;

  -- 3. Super Admin role restriction: Only an active Super Admin can provision another Super Admin
  IF NEW.role = 'super_admin' AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Security Violation: Only Super Admins can provision Super Admin accounts.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_admin_user_insert ON public.admin_users;
CREATE TRIGGER trg_guard_admin_user_insert
  BEFORE INSERT ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_admin_user_insert();

-- --------------------------------------------------------------------
-- PHASE 3: Unused Function Hardening
-- --------------------------------------------------------------------

ALTER FUNCTION public.guard_prevent_admin_creation_from_public()
  SET search_path TO 'pg_catalog', 'public', 'pg_temp';
