-- Migration: 20261113183000_guard-triggers-service-role.sql
-- Description: Allow service-role / raw SQL server execution in mutation guard triggers while maintaining client RLS guards

-- 1. Guard task update
CREATE OR REPLACE FUNCTION public.guard_task_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Security Violation: Task ID is immutable.';
  END IF;
  IF NEW.creator_id IS DISTINCT FROM OLD.creator_id THEN
    RAISE EXCEPTION 'Security Violation: Task creator cannot be changed.';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Security Violation: created_at is immutable.';
  END IF;

  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF public.has_permission('tasks.edit') THEN
    IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN
      IF NOT (public.has_permission('tasks.assign') OR public.has_permission('tasks.create')) THEN
        RAISE EXCEPTION 'Security Violation: Permission tasks.assign required to assign or reassign tasks.';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.assignee_id THEN
    IF NEW.title IS DISTINCT FROM OLD.title OR
       NEW.description IS DISTINCT FROM OLD.description OR
       NEW.department_id IS DISTINCT FROM OLD.department_id OR
       NEW.assignee_id IS DISTINCT FROM OLD.assignee_id OR
       NEW.priority IS DISTINCT FROM OLD.priority OR
       NEW.due_date IS DISTINCT FROM OLD.due_date THEN
      RAISE EXCEPTION 'Security Violation: Assigned team members may only update task status, blocker notes, completion timestamp, or escalate.';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Security Violation: Permission tasks.edit required to update tasks.';
END;
$$;

-- 2. Guard department update
CREATE OR REPLACE FUNCTION public.guard_department_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Security Violation: Department ID and created_at are immutable.';
  END IF;

  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.head_user_id IS DISTINCT FROM OLD.head_user_id THEN
    IF NOT public.has_permission('departments.assign_head') THEN
      RAISE EXCEPTION 'Security Violation: Permission departments.assign_head required to change department head.';
    END IF;
  END IF;

  IF NOT (public.has_permission('departments.edit') OR public.has_permission('departments.manage')) THEN
    RAISE EXCEPTION 'Security Violation: Permission departments.edit required to update department details.';
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Guard vendor update
CREATE OR REPLACE FUNCTION public.guard_vendor_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status OR
     (NEW.onboarding_stage = 'approved' AND OLD.onboarding_stage != 'approved') THEN
    IF NOT public.has_permission('vendors.approve') THEN
      RAISE EXCEPTION 'Security Violation: Permission vendors.approve required to verify or approve vendors.';
    END IF;
  END IF;

  IF NOT public.has_permission('vendors.edit') THEN
    RAISE EXCEPTION 'Security Violation: Permission vendors.edit required to update vendor details.';
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Guard vendor document mutation
CREATE OR REPLACE FUNCTION public.guard_vendor_document_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.is_verified = TRUE AND NOT public.has_permission('vendors.approve') THEN
      RAISE EXCEPTION 'Security Violation: Permission vendors.approve required to upload pre-verified documents.';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_verified IS DISTINCT FROM OLD.is_verified AND NOT public.has_permission('vendors.approve') THEN
      RAISE EXCEPTION 'Security Violation: Permission vendors.approve required to verify documents.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Guard client onboarding item update
CREATE OR REPLACE FUNCTION public.guard_client_onboarding_item_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
    RAISE EXCEPTION 'Security Violation: Cannot reassign onboarding checklist items to another client.';
  END IF;

  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.is_completed = TRUE AND OLD.is_completed = FALSE THEN
    IF NEW.completed_by_user_id IS NULL THEN
      NEW.completed_by_user_id := auth.uid();
    END IF;
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 6. Guard SOP update
CREATE OR REPLACE FUNCTION public.guard_sop_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'active' AND OLD.status != 'active' THEN
    IF NOT public.has_permission('sops.publish') THEN
      RAISE EXCEPTION 'Security Violation: Permission sops.publish required to publish SOPs to active status.';
    END IF;
  END IF;

  IF NEW.last_reviewed_at IS DISTINCT FROM OLD.last_reviewed_at THEN
    IF NOT public.has_permission('sops.approve') THEN
      RAISE EXCEPTION 'Security Violation: Permission sops.approve required to approve or sign off SOP reviews.';
    END IF;
  END IF;

  IF NOT public.has_permission('sops.edit') THEN
    RAISE EXCEPTION 'Security Violation: Permission sops.edit required to edit SOP content.';
  END IF;

  RETURN NEW;
END;
$$;

-- 7. Guard support ticket update
CREATE OR REPLACE FUNCTION public.guard_support_ticket_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.assigned_user_id IS DISTINCT FROM OLD.assigned_user_id THEN
    IF NOT public.has_permission('support.assign') THEN
      RAISE EXCEPTION 'Security Violation: Permission support.assign required to assign support tickets.';
    END IF;
  END IF;

  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    IF NOT public.has_permission('support.resolve') THEN
      RAISE EXCEPTION 'Security Violation: Permission support.resolve required to resolve support tickets.';
    END IF;
  END IF;

  IF NOT public.has_permission('support.edit') THEN
    RAISE EXCEPTION 'Security Violation: Permission support.edit required to update support tickets.';
  END IF;

  RETURN NEW;
END;
$$;

-- 8. Guard notification update
CREATE OR REPLACE FUNCTION public.guard_notification_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id OR
     NEW.user_id IS DISTINCT FROM OLD.user_id OR
     NEW.title IS DISTINCT FROM OLD.title OR
     NEW.message IS DISTINCT FROM OLD.message OR
     NEW.type IS DISTINCT FROM OLD.type OR
     NEW.link IS DISTINCT FROM OLD.link OR
     NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Security Violation: Only the is_read status of notifications may be updated.';
  END IF;

  RETURN NEW;
END;
$$;
