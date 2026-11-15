-- Migration: 20261113175000_guard_admin_user_update_service_role.sql
-- Description: Allow service_role / server raw SQL and session heartbeat in guard_admin_user_update

CREATE OR REPLACE FUNCTION public.guard_admin_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  -- Immutable columns
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Security Violation: User ID is immutable.';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Security Violation: created_at is immutable.';
  END IF;

  -- Service role / raw SQL (backend server) or Super Admin bypasses remaining field guards
  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  -- If only last_login_at or updated_at changed (e.g. login session tracking), allow it
  IF NEW.role IS NOT DISTINCT FROM OLD.role
     AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.department_id IS NOT DISTINCT FROM OLD.department_id
     AND NEW.email IS NOT DISTINCT FROM OLD.email
     AND NEW.full_name IS NOT DISTINCT FROM OLD.full_name
     AND NEW.avatar IS NOT DISTINCT FROM OLD.avatar THEN
    RETURN NEW;
  END IF;

  -- 1. Self-profile update guard
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.id THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Security Violation: You cannot modify your own administrative role.';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Security Violation: You cannot modify your own account status.';
    END IF;
    IF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
      RAISE EXCEPTION 'Security Violation: You cannot modify your own department assignment.';
    END IF;
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Security Violation: Email address cannot be changed via profile update.';
    END IF;
    -- Users may only update full_name and avatar on their own profile
    RETURN NEW;
  END IF;

  -- 2. Non-self updates: check specific capability permissions
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.has_permission('users.assign_roles') THEN
      RAISE EXCEPTION 'Security Violation: Permission users.assign_roles required to change administrative role.';
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'suspended' AND NOT public.has_permission('users.suspend') THEN
      RAISE EXCEPTION 'Security Violation: Permission users.suspend required to suspend team members.';
    END IF;
    IF NEW.status = 'active' AND NOT public.has_permission('users.activate') THEN
      RAISE EXCEPTION 'Security Violation: Permission users.activate required to activate team members.';
    END IF;
  END IF;

  IF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
    IF NOT (public.has_permission('departments.manage_members') OR public.has_permission('users.edit')) THEN
      RAISE EXCEPTION 'Security Violation: Permission departments.manage_members or users.edit required to change department.';
    END IF;
  END IF;

  IF NOT public.has_permission('users.edit') THEN
    RAISE EXCEPTION 'Security Violation: Permission users.edit required to update team member profiles.';
  END IF;

  RETURN NEW;
END;
$$;
