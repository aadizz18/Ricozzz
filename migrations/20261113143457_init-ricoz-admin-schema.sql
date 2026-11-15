-- ==============================================================================
-- RICOZ ENTERPRISE ADMIN OPERATIONS PLATFORM — DATABASE MIGRATION
-- Migration: 20261113143457_init-ricoz-admin-schema.sql
-- Revision: Step 1.2 Enterprise Security Hardened
-- Target: InsForge PostgreSQL Backend (Project: Ricoz)
-- Description: Creates 19 operational tables, RBAC functions, RLS policies with
--              FORCE ROW LEVEL SECURITY, comprehensive column-level guards,
--              trusted audit logging, automated timestamp triggers, and seeds
--              departments, roles, permissions, and role-permission mappings.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- SECTION 1: EXTENSIONS & UTILITY FUNCTIONS
-- ------------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Generic updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Immutability guard for audit logs (Blocks UPDATE and DELETE)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'Security Violation: Audit logs are immutable and cannot be modified or deleted.';
END;
$$;

-- ------------------------------------------------------------------------------
-- SECTION 2: 19 CORE APPLICATION TABLES
-- ------------------------------------------------------------------------------

-- 1. Departments
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  head_user_id UUID, -- References auth.users(id) / admin_users(id)
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Admin Roles (14-Tier Enterprise Hierarchy)
CREATE TABLE IF NOT EXISTS public.admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  hierarchy_level INTEGER NOT NULL,
  is_system_role BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Admin Users (Profiles tied directly to InsForge Auth)
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'team_member' REFERENCES public.admin_roles(slug) ON UPDATE CASCADE ON DELETE RESTRICT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
  avatar TEXT NOT NULL DEFAULT '',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Foreign key constraint from departments.head_user_id to admin_users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_departments_head_user'
  ) THEN
    ALTER TABLE public.departments
      ADD CONSTRAINT fk_departments_head_user
      FOREIGN KEY (head_user_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Admin Permissions (56 Catalogued Granular Actions)
CREATE TABLE IF NOT EXISTS public.admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Admin Role Permissions (Role-to-Permission Mapping)
CREATE TABLE IF NOT EXISTS public.admin_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.admin_permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- 6. Admin User Permissions (Granular Per-User Allow/Deny Overrides)
CREATE TABLE IF NOT EXISTS public.admin_user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.admin_permissions(id) ON DELETE CASCADE,
  effect TEXT NOT NULL CHECK (effect IN ('allow', 'deny')),
  granted_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL DEFAULT '',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(admin_user_id, permission_id)
);

-- 7. Department Members (Multi-Department Matrix Assignment)
CREATE TABLE IF NOT EXISTS public.admin_department_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  membership_role TEXT NOT NULL DEFAULT 'member' CHECK (membership_role IN ('head', 'manager', 'member', 'observer')),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(admin_user_id, department_id)
);

-- 8. Admin Sessions (Audit & Device Tracking with Hashed Tokens)
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL CHECK (token_hash ~ '^[a-f0-9]{64}$'), -- Enforces 64-char SHA-256 hex digest
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Tasks (Operations Workflows)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  assignee_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  creator_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE RESTRICT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'in_review', 'completed')),
  blocker_note TEXT,
  is_escalated BOOLEAN NOT NULL DEFAULT FALSE,
  due_date TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Task Comments
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  is_blocker_update BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Clients (Enterprise CRM)
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  company_size TEXT NOT NULL DEFAULT '1-10',
  onboarding_stage TEXT NOT NULL DEFAULT 'inquiry' CHECK (onboarding_stage IN ('inquiry', 'contract_review', 'kickoff', 'active', 'churned')),
  assigned_owner_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  notes TEXT NOT NULL DEFAULT '',
  next_follow_up TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Client Onboarding Checklists
CREATE TABLE IF NOT EXISTS public.client_onboarding_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by_user_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Vendors (Creative Partner Directory)
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  service_category TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  onboarding_stage TEXT NOT NULL DEFAULT 'application' CHECK (onboarding_stage IN ('application', 'document_review', 'vetting', 'approved', 'rejected')),
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending_review', 'verified')),
  assigned_coordinator_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Vendor Documents
CREATE TABLE IF NOT EXISTS public.vendor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by_user_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Support Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_ref TEXT UNIQUE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('onboarding', 'billing', 'talent_matching', 'platform_bug', 'service_quality', 'general')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'escalated', 'resolved')),
  assigned_user_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Ticket Responses
CREATE TABLE IF NOT EXISTS public.ticket_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_internal_note BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. SOPs (Standard Operating Procedures)
CREATE TABLE IF NOT EXISTS public.sops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  category TEXT NOT NULL DEFAULT 'general',
  summary TEXT NOT NULL DEFAULT '',
  content_markdown TEXT NOT NULL DEFAULT '',
  version TEXT NOT NULL DEFAULT '1.0',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  owner_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('task_assigned', 'task_overdue', 'ticket_escalated', 'vendor_pending', 'system')),
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. Audit Logs (Append-Only Immutable Event Trail)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  change_summary TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- SECTION 3: AUTOMATED TIMESTAMP & IMMUTABILITY TRIGGERS
-- ------------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_departments_updated_at ON public.departments;
CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER trg_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_admin_roles_updated_at ON public.admin_roles;
CREATE TRIGGER trg_admin_roles_updated_at
  BEFORE UPDATE ON public.admin_roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_clients_updated_at ON public.clients;
CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_vendors_updated_at ON public.vendors;
CREATE TRIGGER trg_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_sops_updated_at ON public.sops;
CREATE TRIGGER trg_sops_updated_at
  BEFORE UPDATE ON public.sops
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enforce append-only immutability on audit_logs
DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- ------------------------------------------------------------------------------
-- SECTION 4: PERFORMANCE & LOOKUP INDEXES
-- ------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_dept ON public.admin_users(department_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_status ON public.admin_users(status);

CREATE INDEX IF NOT EXISTS idx_role_perms_role ON public.admin_role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_perms_perm ON public.admin_role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_perms_user ON public.admin_user_permissions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_dept_members_user ON public.admin_department_members(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_dept_members_dept ON public.admin_department_members(department_id);

CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON public.admin_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON public.admin_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_dept ON public.tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_clients_stage ON public.clients(onboarding_stage);
CREATE INDEX IF NOT EXISTS idx_vendors_stage ON public.vendors(onboarding_stage);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON public.vendors(verification_status);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_ticket_resp_ticket ON public.ticket_responses(ticket_id);

CREATE INDEX IF NOT EXISTS idx_sops_dept ON public.sops(department_id);
CREATE INDEX IF NOT EXISTS idx_sops_status ON public.sops(status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_logs(entity_type, entity_id);

-- ------------------------------------------------------------------------------
-- SECTION 5: RBAC EVALUATION FUNCTIONS (SECURITY DEFINER)
-- ------------------------------------------------------------------------------

-- 1. Check if caller is an active admin user
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid() AND status = 'active'
  );
END;
$$;

-- 2. Check if caller has super_admin role
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  current_user_id UUID;
  user_role TEXT;
  user_status TEXT;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT role, status INTO user_role, user_status
  FROM public.admin_users
  WHERE id = current_user_id;

  RETURN (user_status = 'active' AND user_role = 'super_admin');
END;
$$;

-- 3. Granular capability evaluation (handles super_admin, overrides, and role matrix)
CREATE OR REPLACE FUNCTION public.has_permission(required_perm TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  current_user_id UUID;
  user_role_slug TEXT;
  user_status TEXT;
  override_effect TEXT;
  has_role_perm BOOLEAN;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 1. Lookup user role and operational status
  SELECT status, role INTO user_status, user_role_slug
  FROM public.admin_users
  WHERE id = current_user_id;

  IF user_status IS NULL OR user_status != 'active' THEN
    RETURN FALSE;
  END IF;

  -- Super Admin possesses absolute bypass
  IF user_role_slug = 'super_admin' THEN
    RETURN TRUE;
  END IF;

  -- 2. Check explicit user-level permission override (active only)
  SELECT effect INTO override_effect
  FROM public.admin_user_permissions aup
  JOIN public.admin_permissions ap ON ap.id = aup.permission_id
  WHERE aup.admin_user_id = current_user_id
    AND ap.slug = required_perm
    AND (aup.expires_at IS NULL OR aup.expires_at > NOW())
  LIMIT 1;

  IF override_effect = 'deny' THEN
    RETURN FALSE;
  ELSIF override_effect = 'allow' THEN
    RETURN TRUE;
  END IF;

  -- 3. Fallback to role-based permission matrix
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_roles ar
    JOIN public.admin_role_permissions arp ON arp.role_id = ar.id
    JOIN public.admin_permissions ap ON ap.id = arp.permission_id
    WHERE ar.slug = user_role_slug
      AND ar.is_active = TRUE
      AND ap.slug = required_perm
  ) INTO has_role_perm;

  RETURN COALESCE(has_role_perm, FALSE);
END;
$$;

-- ------------------------------------------------------------------------------
-- SECTION 6: SENSITIVE COLUMN GUARDS & TRUSTED FUNCTIONS
-- ------------------------------------------------------------------------------

-- Guard 1: Prevent unauthorized super_admin provisioning on admin_users INSERT
CREATE OR REPLACE FUNCTION public.guard_admin_user_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.role = 'super_admin' AND NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Security Violation: Only Super Admins can provision Super Admin accounts.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_admin_user_insert ON public.admin_users;
CREATE TRIGGER trg_guard_admin_user_insert
  BEFORE INSERT ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.guard_admin_user_insert();

-- Guard 2: Protect sensitive admin_users columns (role, status, email, department) on UPDATE
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

  -- Super admin bypasses remaining field guards
  IF public.is_super_admin() THEN
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

DROP TRIGGER IF EXISTS trg_guard_admin_user_update ON public.admin_users;
CREATE TRIGGER trg_guard_admin_user_update
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.guard_admin_user_update();

-- Guard 3: Prevent self permission override tampering on INSERT, UPDATE, DELETE
CREATE OR REPLACE FUNCTION public.prevent_self_permission_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_target_user_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_target_user_id := OLD.admin_user_id;
  ELSE
    v_target_user_id := NEW.admin_user_id;
  END IF;

  IF auth.uid() IS NOT NULL AND (auth.uid() = v_target_user_id OR (TG_OP = 'UPDATE' AND auth.uid() = OLD.admin_user_id)) THEN
    IF NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Security Violation: You cannot create, modify, or delete your own permission overrides.';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_permission_tampering ON public.admin_user_permissions;
CREATE TRIGGER trg_prevent_self_permission_tampering
  BEFORE INSERT OR UPDATE OR DELETE ON public.admin_user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_permission_tampering();

-- Guard 4: Restrict task updates (team member field limits & tasks.assign permission)
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

  IF public.is_super_admin() THEN
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

  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.assignee_id THEN
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

DROP TRIGGER IF EXISTS trg_guard_task_update ON public.tasks;
CREATE TRIGGER trg_guard_task_update
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.guard_task_update();

-- Guard 5: Enforce departments.assign_head
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

  IF public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.head_user_id IS DISTINCT FROM OLD.head_user_id THEN
    IF NOT public.has_permission('departments.assign_head') THEN
      RAISE EXCEPTION 'Security Violation: Permission departments.assign_head required to assign or change department head.';
    END IF;
  END IF;

  IF NOT public.has_permission('departments.edit') THEN
    RAISE EXCEPTION 'Security Violation: Permission departments.edit required to update departments.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_department_update ON public.departments;
CREATE TRIGGER trg_guard_department_update
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.guard_department_update();

-- Guard 6: Enforce vendors.approve on verification status and approval stage
CREATE OR REPLACE FUNCTION public.guard_vendor_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF public.is_super_admin() THEN
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

DROP TRIGGER IF EXISTS trg_guard_vendor_update ON public.vendors;
CREATE TRIGGER trg_guard_vendor_update
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.guard_vendor_update();

-- Guard 7: Enforce vendors.approve on vendor_documents insertion and verification
CREATE OR REPLACE FUNCTION public.guard_vendor_document_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF public.is_super_admin() THEN
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

DROP TRIGGER IF EXISTS trg_guard_vendor_document_mutation ON public.vendor_documents;
CREATE TRIGGER trg_guard_vendor_document_mutation
  BEFORE INSERT OR UPDATE ON public.vendor_documents
  FOR EACH ROW EXECUTE FUNCTION public.guard_vendor_document_mutation();

-- Guard 8: Enforce client_onboarding_items relationship and completion audit
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

  IF public.is_super_admin() THEN
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

DROP TRIGGER IF EXISTS trg_guard_client_onboarding_item_update ON public.client_onboarding_items;
CREATE TRIGGER trg_guard_client_onboarding_item_update
  BEFORE UPDATE ON public.client_onboarding_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_client_onboarding_item_update();

-- Guard 9: Enforce sops.approve and sops.publish
CREATE OR REPLACE FUNCTION public.guard_sop_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF public.is_super_admin() THEN
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

DROP TRIGGER IF EXISTS trg_guard_sop_update ON public.sops;
CREATE TRIGGER trg_guard_sop_update
  BEFORE UPDATE ON public.sops
  FOR EACH ROW EXECUTE FUNCTION public.guard_sop_update();

-- Guard 10: Enforce support.assign and support.resolve
CREATE OR REPLACE FUNCTION public.guard_support_ticket_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF public.is_super_admin() THEN
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

DROP TRIGGER IF EXISTS trg_guard_support_ticket_update ON public.support_tickets;
CREATE TRIGGER trg_guard_support_ticket_update
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.guard_support_ticket_update();

-- Guard 11: Task Comments Authorship and Association Integrity
CREATE OR REPLACE FUNCTION public.guard_task_comment_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW.task_id IS DISTINCT FROM OLD.task_id THEN
    RAISE EXCEPTION 'Security Violation: Task comments cannot be reassociated with a different task.';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Security Violation: Task comment author cannot be altered.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_task_comment_update ON public.task_comments;
CREATE TRIGGER trg_guard_task_comment_update
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.guard_task_comment_update();

-- Guard 12: Notification Recipient and Message Integrity
CREATE OR REPLACE FUNCTION public.guard_notification_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF public.is_super_admin() THEN
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

DROP TRIGGER IF EXISTS trg_guard_notification_update ON public.notifications;
CREATE TRIGGER trg_guard_notification_update
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.guard_notification_update();

-- Guard 13: Trusted Server-Side Audit Log Insertion Function
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_change_summary TEXT,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_actor_name TEXT;
  v_actor_role TEXT;
  v_actor_status TEXT;
  v_audit_id UUID;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Security Violation: Audit log events require an authenticated session.';
  END IF;

  -- Derive authentic actor name, role, and status directly from database
  SELECT full_name, role, status INTO v_actor_name, v_actor_role, v_actor_status
  FROM public.admin_users
  WHERE id = v_caller_id;

  IF v_actor_status IS NULL OR v_actor_status != 'active' THEN
    RAISE EXCEPTION 'Security Violation: Inactive or suspended accounts cannot submit audit events.';
  END IF;

  INSERT INTO public.audit_logs (
    actor_id,
    actor_name,
    actor_role,
    action,
    entity_type,
    entity_id,
    change_summary,
    ip_address,
    created_at
  ) VALUES (
    v_caller_id,
    v_actor_name,
    v_actor_role,
    p_action,
    p_entity_type,
    p_entity_id,
    p_change_summary,
    p_ip_address,
    NOW()
  ) RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

-- ------------------------------------------------------------------------------
-- SECTION 7: SQL PRIVILEGES & EXPLICIT TABLE GRANTS
-- ------------------------------------------------------------------------------

-- Schema access: Usage allowed for authenticated; Schema mutation strictly revoked
GRANT USAGE ON SCHEMA public TO anon, authenticated;
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;

-- Revoke all privileges from anon explicitly on all 19 RICOZ tables
REVOKE ALL ON TABLE public.departments FROM anon;
REVOKE ALL ON TABLE public.admin_users FROM anon;
REVOKE ALL ON TABLE public.admin_roles FROM anon;
REVOKE ALL ON TABLE public.admin_permissions FROM anon;
REVOKE ALL ON TABLE public.admin_role_permissions FROM anon;
REVOKE ALL ON TABLE public.admin_user_permissions FROM anon;
REVOKE ALL ON TABLE public.admin_department_members FROM anon;
REVOKE ALL ON TABLE public.admin_sessions FROM anon;
REVOKE ALL ON TABLE public.tasks FROM anon;
REVOKE ALL ON TABLE public.task_comments FROM anon;
REVOKE ALL ON TABLE public.clients FROM anon;
REVOKE ALL ON TABLE public.client_onboarding_items FROM anon;
REVOKE ALL ON TABLE public.vendors FROM anon;
REVOKE ALL ON TABLE public.vendor_documents FROM anon;
REVOKE ALL ON TABLE public.support_tickets FROM anon;
REVOKE ALL ON TABLE public.ticket_responses FROM anon;
REVOKE ALL ON TABLE public.sops FROM anon;
REVOKE ALL ON TABLE public.notifications FROM anon;
REVOKE ALL ON TABLE public.audit_logs FROM anon;

-- Revoke direct write privileges on audit_logs from all runtime roles
REVOKE ALL ON TABLE public.audit_logs FROM authenticated;
GRANT SELECT ON TABLE public.audit_logs TO authenticated;

-- Read-only access for authenticated users to RBAC definitions
REVOKE ALL ON TABLE public.admin_roles FROM authenticated;
REVOKE ALL ON TABLE public.admin_permissions FROM authenticated;
REVOKE ALL ON TABLE public.admin_role_permissions FROM authenticated;
GRANT SELECT ON TABLE public.admin_roles TO authenticated;
GRANT SELECT ON TABLE public.admin_permissions TO authenticated;
GRANT SELECT ON TABLE public.admin_role_permissions TO authenticated;

-- Explicit grants for operational tables to authenticated users (RLS governs row access)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.departments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_user_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_department_members TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.admin_sessions TO authenticated; -- Sessions deleted/revoked, not updated
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.task_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.client_onboarding_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.vendors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.vendor_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.support_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ticket_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sops TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notifications TO authenticated;

-- Explicit function execution privileges: Revoke all from PUBLIC and anon
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;

-- Grant execution strictly to authenticated for callable API/RPC functions
GRANT EXECUTE ON FUNCTION public.has_permission(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit_event(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- SECTION 8: ROW-LEVEL SECURITY (RLS) & FORCE ROW LEVEL SECURITY
-- ------------------------------------------------------------------------------

-- Enable RLS and FORCE RLS on all 19 application tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users FORCE ROW LEVEL SECURITY;

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.admin_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_permissions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.admin_user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_permissions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.admin_department_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_department_members FORCE ROW LEVEL SECURITY;

ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks FORCE ROW LEVEL SECURITY;

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;

ALTER TABLE public.client_onboarding_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_onboarding_items FORCE ROW LEVEL SECURITY;

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors FORCE ROW LEVEL SECURITY;

ALTER TABLE public.vendor_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_documents FORCE ROW LEVEL SECURITY;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets FORCE ROW LEVEL SECURITY;

ALTER TABLE public.ticket_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_responses FORCE ROW LEVEL SECURITY;

ALTER TABLE public.sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sops FORCE ROW LEVEL SECURITY;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- 1. Departments Policies
DROP POLICY IF EXISTS "departments_select" ON public.departments;
CREATE POLICY "departments_select" ON public.departments
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "departments_insert" ON public.departments;
CREATE POLICY "departments_insert" ON public.departments
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('departments.create'));

DROP POLICY IF EXISTS "departments_update" ON public.departments;
CREATE POLICY "departments_update" ON public.departments
  FOR UPDATE TO authenticated
  USING (public.has_permission('departments.edit') OR public.has_permission('departments.assign_head'))
  WITH CHECK (public.has_permission('departments.edit') OR public.has_permission('departments.assign_head'));

DROP POLICY IF EXISTS "departments_delete" ON public.departments;
CREATE POLICY "departments_delete" ON public.departments
  FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- 2. Admin Users Policies
DROP POLICY IF EXISTS "admin_users_select" ON public.admin_users;
CREATE POLICY "admin_users_select" ON public.admin_users
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_permission('users.view'));

DROP POLICY IF EXISTS "admin_users_insert" ON public.admin_users;
CREATE POLICY "admin_users_insert" ON public.admin_users
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('users.create') OR public.is_super_admin());

DROP POLICY IF EXISTS "admin_users_update" ON public.admin_users;
CREATE POLICY "admin_users_update" ON public.admin_users
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_permission('users.edit') OR public.has_permission('users.suspend') OR public.has_permission('users.activate') OR public.has_permission('users.assign_roles'))
  WITH CHECK (id = auth.uid() OR public.has_permission('users.edit') OR public.has_permission('users.suspend') OR public.has_permission('users.activate') OR public.has_permission('users.assign_roles'));

DROP POLICY IF EXISTS "admin_users_delete" ON public.admin_users;
CREATE POLICY "admin_users_delete" ON public.admin_users
  FOR DELETE TO authenticated
  USING (public.is_super_admin() AND id != auth.uid());

-- 3. Admin Roles Policies
DROP POLICY IF EXISTS "admin_roles_select" ON public.admin_roles;
CREATE POLICY "admin_roles_select" ON public.admin_roles
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- 4. Admin Permissions Policies
DROP POLICY IF EXISTS "admin_permissions_select" ON public.admin_permissions;
CREATE POLICY "admin_permissions_select" ON public.admin_permissions
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- 5. Admin Role Permissions Policies
DROP POLICY IF EXISTS "admin_role_permissions_select" ON public.admin_role_permissions;
CREATE POLICY "admin_role_permissions_select" ON public.admin_role_permissions
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- 6. Admin User Permissions Policies
DROP POLICY IF EXISTS "admin_user_permissions_select" ON public.admin_user_permissions;
CREATE POLICY "admin_user_permissions_select" ON public.admin_user_permissions
  FOR SELECT TO authenticated
  USING (admin_user_id = auth.uid() OR public.has_permission('users.view'));

DROP POLICY IF EXISTS "admin_user_permissions_write" ON public.admin_user_permissions;
CREATE POLICY "admin_user_permissions_write" ON public.admin_user_permissions
  FOR ALL TO authenticated
  USING (public.has_permission('users.manage_permissions'))
  WITH CHECK (public.has_permission('users.manage_permissions'));

-- 7. Admin Department Members Policies
DROP POLICY IF EXISTS "admin_department_members_select" ON public.admin_department_members;
CREATE POLICY "admin_department_members_select" ON public.admin_department_members
  FOR SELECT TO authenticated
  USING (admin_user_id = auth.uid() OR public.has_permission('departments.view'));

DROP POLICY IF EXISTS "admin_department_members_write" ON public.admin_department_members;
CREATE POLICY "admin_department_members_write" ON public.admin_department_members
  FOR ALL TO authenticated
  USING (public.has_permission('departments.manage_members'))
  WITH CHECK (public.has_permission('departments.manage_members'));

-- 8. Admin Sessions Policies
DROP POLICY IF EXISTS "admin_sessions_select" ON public.admin_sessions;
CREATE POLICY "admin_sessions_select" ON public.admin_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_permission('users.view'));

DROP POLICY IF EXISTS "admin_sessions_insert" ON public.admin_sessions;
CREATE POLICY "admin_sessions_insert" ON public.admin_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_sessions_delete" ON public.admin_sessions;
CREATE POLICY "admin_sessions_delete" ON public.admin_sessions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_permission('users.revoke_sessions') OR public.is_super_admin());

-- 9. Tasks Policies
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT TO authenticated
  USING (public.has_permission('tasks.view'));

DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
CREATE POLICY "tasks_insert" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('tasks.create') AND creator_id = auth.uid());

DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
CREATE POLICY "tasks_update" ON public.tasks
  FOR UPDATE TO authenticated
  USING (public.has_permission('tasks.edit') OR assignee_id = auth.uid())
  WITH CHECK (public.has_permission('tasks.edit') OR assignee_id = auth.uid());

DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;
CREATE POLICY "tasks_delete" ON public.tasks
  FOR DELETE TO authenticated
  USING (public.has_permission('tasks.delete'));

-- 10. Task Comments Policies
DROP POLICY IF EXISTS "task_comments_select" ON public.task_comments;
CREATE POLICY "task_comments_select" ON public.task_comments
  FOR SELECT TO authenticated
  USING (public.has_permission('tasks.view'));

DROP POLICY IF EXISTS "task_comments_insert" ON public.task_comments;
CREATE POLICY "task_comments_insert" ON public.task_comments
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('tasks.edit') AND user_id = auth.uid());

DROP POLICY IF EXISTS "task_comments_update" ON public.task_comments;
CREATE POLICY "task_comments_update" ON public.task_comments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "task_comments_delete" ON public.task_comments;
CREATE POLICY "task_comments_delete" ON public.task_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin());

-- 11. Clients Policies
DROP POLICY IF EXISTS "clients_select" ON public.clients;
CREATE POLICY "clients_select" ON public.clients
  FOR SELECT TO authenticated
  USING (public.has_permission('clients.view'));

DROP POLICY IF EXISTS "clients_insert" ON public.clients;
CREATE POLICY "clients_insert" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('clients.create'));

DROP POLICY IF EXISTS "clients_update" ON public.clients;
CREATE POLICY "clients_update" ON public.clients
  FOR UPDATE TO authenticated
  USING (public.has_permission('clients.edit'))
  WITH CHECK (public.has_permission('clients.edit'));

DROP POLICY IF EXISTS "clients_delete" ON public.clients;
CREATE POLICY "clients_delete" ON public.clients
  FOR DELETE TO authenticated
  USING (public.has_permission('clients.delete'));

-- 12. Client Onboarding Items Policies
DROP POLICY IF EXISTS "client_onboarding_items_select" ON public.client_onboarding_items;
CREATE POLICY "client_onboarding_items_select" ON public.client_onboarding_items
  FOR SELECT TO authenticated
  USING (public.has_permission('clients.view'));

DROP POLICY IF EXISTS "client_onboarding_items_insert" ON public.client_onboarding_items;
CREATE POLICY "client_onboarding_items_insert" ON public.client_onboarding_items
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('clients.edit') OR public.has_permission('clients.create'));

DROP POLICY IF EXISTS "client_onboarding_items_update" ON public.client_onboarding_items;
CREATE POLICY "client_onboarding_items_update" ON public.client_onboarding_items
  FOR UPDATE TO authenticated
  USING (public.has_permission('clients.edit'))
  WITH CHECK (public.has_permission('clients.edit'));

DROP POLICY IF EXISTS "client_onboarding_items_delete" ON public.client_onboarding_items;
CREATE POLICY "client_onboarding_items_delete" ON public.client_onboarding_items
  FOR DELETE TO authenticated
  USING (public.has_permission('clients.delete'));

-- 13. Vendors Policies
DROP POLICY IF EXISTS "vendors_select" ON public.vendors;
CREATE POLICY "vendors_select" ON public.vendors
  FOR SELECT TO authenticated
  USING (public.has_permission('vendors.view'));

DROP POLICY IF EXISTS "vendors_insert" ON public.vendors;
CREATE POLICY "vendors_insert" ON public.vendors
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('vendors.create'));

DROP POLICY IF EXISTS "vendors_update" ON public.vendors;
CREATE POLICY "vendors_update" ON public.vendors
  FOR UPDATE TO authenticated
  USING (public.has_permission('vendors.edit') OR public.has_permission('vendors.approve'))
  WITH CHECK (public.has_permission('vendors.edit') OR public.has_permission('vendors.approve'));

DROP POLICY IF EXISTS "vendors_delete" ON public.vendors;
CREATE POLICY "vendors_delete" ON public.vendors
  FOR DELETE TO authenticated
  USING (public.has_permission('vendors.delete'));

-- 14. Vendor Documents Policies
DROP POLICY IF EXISTS "vendor_documents_select" ON public.vendor_documents;
CREATE POLICY "vendor_documents_select" ON public.vendor_documents
  FOR SELECT TO authenticated
  USING (public.has_permission('vendors.view'));

DROP POLICY IF EXISTS "vendor_documents_insert" ON public.vendor_documents;
CREATE POLICY "vendor_documents_insert" ON public.vendor_documents
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('vendors.edit') OR public.has_permission('vendors.create'));

DROP POLICY IF EXISTS "vendor_documents_update" ON public.vendor_documents;
CREATE POLICY "vendor_documents_update" ON public.vendor_documents
  FOR UPDATE TO authenticated
  USING (public.has_permission('vendors.edit') OR public.has_permission('vendors.approve'))
  WITH CHECK (public.has_permission('vendors.edit') OR public.has_permission('vendors.approve'));

DROP POLICY IF EXISTS "vendor_documents_delete" ON public.vendor_documents;
CREATE POLICY "vendor_documents_delete" ON public.vendor_documents
  FOR DELETE TO authenticated
  USING (public.has_permission('vendors.delete'));

-- 15. Support Tickets Policies
DROP POLICY IF EXISTS "support_tickets_select" ON public.support_tickets;
CREATE POLICY "support_tickets_select" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (public.has_permission('support.view'));

DROP POLICY IF EXISTS "support_tickets_insert" ON public.support_tickets;
CREATE POLICY "support_tickets_insert" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('support.create') OR public.is_admin());

DROP POLICY IF EXISTS "support_tickets_update" ON public.support_tickets;
CREATE POLICY "support_tickets_update" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (public.has_permission('support.edit') OR public.has_permission('support.resolve') OR public.has_permission('support.assign'))
  WITH CHECK (public.has_permission('support.edit') OR public.has_permission('support.resolve') OR public.has_permission('support.assign'));

DROP POLICY IF EXISTS "support_tickets_delete" ON public.support_tickets;
CREATE POLICY "support_tickets_delete" ON public.support_tickets
  FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- 16. Ticket Responses Policies
DROP POLICY IF EXISTS "ticket_responses_select" ON public.ticket_responses;
CREATE POLICY "ticket_responses_select" ON public.ticket_responses
  FOR SELECT TO authenticated
  USING (public.has_permission('support.view'));

DROP POLICY IF EXISTS "ticket_responses_insert" ON public.ticket_responses;
CREATE POLICY "ticket_responses_insert" ON public.ticket_responses
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('support.edit') AND user_id = auth.uid());

DROP POLICY IF EXISTS "ticket_responses_delete" ON public.ticket_responses;
CREATE POLICY "ticket_responses_delete" ON public.ticket_responses
  FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- 17. SOPs Policies
DROP POLICY IF EXISTS "sops_select" ON public.sops;
CREATE POLICY "sops_select" ON public.sops
  FOR SELECT TO authenticated
  USING (public.has_permission('sops.view'));

DROP POLICY IF EXISTS "sops_insert" ON public.sops;
CREATE POLICY "sops_insert" ON public.sops
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('sops.create'));

DROP POLICY IF EXISTS "sops_update" ON public.sops;
CREATE POLICY "sops_update" ON public.sops
  FOR UPDATE TO authenticated
  USING (public.has_permission('sops.edit') OR public.has_permission('sops.approve') OR public.has_permission('sops.publish'))
  WITH CHECK (public.has_permission('sops.edit') OR public.has_permission('sops.approve') OR public.has_permission('sops.publish'));

DROP POLICY IF EXISTS "sops_delete" ON public.sops;
CREATE POLICY "sops_delete" ON public.sops
  FOR DELETE TO authenticated
  USING (public.has_permission('sops.delete'));

-- 18. Notifications Policies
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('notifications.create') OR public.is_admin());

DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;
CREATE POLICY "notifications_delete" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 19. Audit Logs Policies (Read-Only via RLS, Writes routed through log_audit_event)
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_permission('audit_logs.view'));

-- ------------------------------------------------------------------------------
-- SECTION 9: SEED BASELINE DATA (DEPARTMENTS, ROLES, PERMISSIONS, MAPPINGS)
-- ------------------------------------------------------------------------------

-- 1. Departments (10 Standard Enterprise Departments)
INSERT INTO public.departments (id, name, slug, description)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Operations', 'operations', 'Core platform workflows, vetting, quality standards, and day-to-day coordination'),
  ('b0000000-0000-0000-0000-000000000002', 'Technology', 'technology', 'Platform engineering, AI matching engine, infrastructure, and security'),
  ('b0000000-0000-0000-0000-000000000003', 'Sales & Partnerships', 'sales', 'Enterprise client acquisitions, project scoping, and creative partner retainers'),
  ('b0000000-0000-0000-0000-000000000004', 'Marketing & Growth', 'marketing', 'Brand collateral, case study editorial publishing, and community engagement'),
  ('b0000000-0000-0000-0000-000000000005', 'Creative & Design', 'design', 'Creative talent curation, portfolio vetting standards, and visual showcase reviews'),
  ('b0000000-0000-0000-0000-000000000006', 'Customer Success', 'support', 'Client onboarding resolution, creative satisfaction, and support escalations'),
  ('b0000000-0000-0000-0000-000000000007', 'Executive Management', 'executive', 'Executive leadership, strategic direction, governance, and enterprise capital allocation'),
  ('b0000000-0000-0000-0000-000000000008', 'Finance & Accounts', 'finance', 'Financial governance, escrow disbursement, invoicing, treasury, and audit compliance'),
  ('b0000000-0000-0000-0000-000000000009', 'AI & Automation', 'ai-automation', 'AI matching engine algorithms, creative intelligence benchmarks, workflow automations'),
  ('b0000000-0000-0000-0000-000000000010', 'Quality Assurance', 'quality-assurance', 'Creative deliverable verification, talent portfolio vetting standards, and platform QA')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 2. Roles (14-Tier Hierarchy + 2 Legacy Aliases)
INSERT INTO public.admin_roles (id, name, slug, description, hierarchy_level, is_system_role, is_active)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Owner / Super Admin', 'super_admin', 'Full, unrestricted access across all operational modules, settings, and company data', 1, TRUE, TRUE),
  ('a0000000-0000-0000-0000-000000000002', 'Executive Director', 'exec_director', 'Enterprise governance, top-level performance oversight, and cross-department strategy', 2, TRUE, TRUE),
  ('a0000000-0000-0000-0000-000000000003', 'Chief Operations Officer', 'coo', 'Executive operational lead across platform delivery, client satisfaction, and partner management', 3, TRUE, TRUE),
  ('a0000000-0000-0000-0000-000000000004', 'Department Head', 'dept_head', 'Department lead managing functional workflows, team member allocation, and approvals', 4, TRUE, TRUE),
  ('a0000000-0000-0000-0000-000000000005', 'Operations Manager', 'ops_manager', 'Day-to-day workflow tracking, task escalations, vendor vetting, and cross-team delivery', 5, TRUE, TRUE),
  ('a0000000-0000-0000-0000-000000000006', 'Finance Manager', 'finance_manager', 'Client invoicing, platform escrow ledger, talent payouts, and financial reporting', 6, TRUE, TRUE),
  ('a0000000-0000-0000-0000-000000000007', 'HR Manager', 'hr_manager', 'Internal team onboarding, capacity planning, department memberships, and culture', 7, TRUE, TRUE),
  ('a0000000-0000-0000-0000-000000000008', 'Sales Manager', 'sales_manager', 'Enterprise client acquisitions, project mandating, intake scoping, and pipeline reporting', 8, TRUE, TRUE),
  ('a0000000-0000-0000-0000-000000000009', 'Marketing Manager', 'marketing_manager', 'Brand collateral, case study editorial publishing, and community engagement', 9, TRUE, TRUE),
  ('a0000000-0000-0000-0000-000000000010', 'Technology Manager', 'tech_manager', 'Platform infrastructure, security audit review, bug resolutions, and technical integrations', 10, TRUE, TRUE),
  ('a0000000-0000-0000-0000-000000000011', 'AI & Automation Manager', 'ai_manager', 'Creative knowledge taxonomy, AI matching algorithms, automated brief analyzers', 11, TRUE, TRUE),
  ('a0000000-0000-0000-0000-000000000012', 'Quality Assurance Manager', 'qa_manager', 'Creative review, portfolio quality inspection, and platform bug ticket triage', 12, TRUE, TRUE),
  ('a0000000-0000-0000-0000-000000000013', 'Team Member', 'team_member', 'Individual contributor executing assigned tasks, support resolutions, and tickets', 13, TRUE, TRUE),
  ('a0000000-0000-0000-0000-000000000014', 'Auditor', 'auditor', 'Strict read-only oversight across company reports, workflows, and security audit logs', 14, TRUE, TRUE),
  ('a0000000-0000-0000-0000-000000000015', 'Operations Admin', 'ops_admin', 'Operations administrator (mapped to Operations Management)', 5, TRUE, TRUE),
  ('a0000000-0000-0000-0000-000000000016', 'Department Manager', 'dept_manager', 'Department functional manager (mapped to Department Head/Manager)', 5, TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, hierarchy_level = EXCLUDED.hierarchy_level;

-- 3. Permissions Catalogue (56 Granular Permissions across 12 Modules)
INSERT INTO public.admin_permissions (id, name, slug, description, module, action)
VALUES
  -- Dashboard
  ('c0000000-0000-0000-0000-000000000001', 'View Operations Dashboard', 'dashboard.view', 'Access the operational metrics and summary dashboard', 'dashboard', 'view'),
  ('c0000000-0000-0000-0000-000000000002', 'View Company Metrics', 'dashboard.view_company_metrics', 'View executive revenue, gross margin, and enterprise KPIs', 'dashboard', 'view'),

  -- Users & Team
  ('c0000000-0000-0000-0000-000000000003', 'View Team Members', 'users.view', 'View company team members and their administrative profiles', 'users', 'view'),
  ('c0000000-0000-0000-0000-000000000004', 'Create Team Member', 'users.create', 'Provision new administrative team accounts', 'users', 'create'),
  ('c0000000-0000-0000-0000-000000000005', 'Edit Team Member', 'users.edit', 'Update team member details, primary department, and roles', 'users', 'edit'),
  ('c0000000-0000-0000-0000-000000000006', 'Suspend Team Member', 'users.suspend', 'Suspend administrative user access immediately', 'users', 'manage'),
  ('c0000000-0000-0000-0000-000000000007', 'Activate Team Member', 'users.activate', 'Re-activate suspended administrative accounts', 'users', 'manage'),
  ('c0000000-0000-0000-0000-000000000008', 'Reset User Password', 'users.reset_password', 'Trigger or execute administrative password resets', 'users', 'manage'),
  ('c0000000-0000-0000-0000-000000000009', 'Revoke User Sessions', 'users.revoke_sessions', 'Terminate all active browser sessions for a user', 'users', 'manage'),
  ('c0000000-0000-0000-0000-000000000010', 'Assign Roles', 'users.assign_roles', 'Assign system roles to team members', 'users', 'assign'),
  ('c0000000-0000-0000-0000-000000000011', 'Manage Permission Overrides', 'users.manage_permissions', 'Grant or deny explicit user-level permission overrides', 'users', 'manage_permissions'),

  -- Departments
  ('c0000000-0000-0000-0000-000000000012', 'View Departments', 'departments.view', 'View company departments, heads, and members', 'departments', 'view'),
  ('c0000000-0000-0000-0000-000000000013', 'Create Department', 'departments.create', 'Establish new organizational departments', 'departments', 'create'),
  ('c0000000-0000-0000-0000-000000000014', 'Edit Department', 'departments.edit', 'Modify department descriptions, scopes, and details', 'departments', 'edit'),
  ('c0000000-0000-0000-0000-000000000015', 'Manage Department Members', 'departments.manage_members', 'Add or remove team members from departments', 'departments', 'manage'),
  ('c0000000-0000-0000-0000-000000000016', 'Assign Department Head', 'departments.assign_head', 'Designate or reassign the head of a department', 'departments', 'assign'),

  -- Tasks
  ('c0000000-0000-0000-0000-000000000017', 'View Tasks', 'tasks.view', 'View operational workflow tasks', 'tasks', 'view'),
  ('c0000000-0000-0000-0000-000000000018', 'Create Task', 'tasks.create', 'Create new operational tasks and deliverables', 'tasks', 'create'),
  ('c0000000-0000-0000-0000-000000000019', 'Edit Task', 'tasks.edit', 'Update task status, priority, blocker notes, and comments', 'tasks', 'edit'),
  ('c0000000-0000-0000-0000-000000000020', 'Delete Task', 'tasks.delete', 'Permanently delete operational tasks', 'tasks', 'delete'),
  ('c0000000-0000-0000-0000-000000000021', 'Assign Task', 'tasks.assign', 'Assign tasks to specific team members', 'tasks', 'assign'),
  ('c0000000-0000-0000-0000-000000000022', 'Approve Task', 'tasks.approve', 'Approve completed tasks and deliverables', 'tasks', 'approve'),
  ('c0000000-0000-0000-0000-000000000023', 'Export Tasks', 'tasks.export', 'Export task workflows to CSV/JSON', 'tasks', 'export'),

  -- Clients
  ('c0000000-0000-0000-0000-000000000024', 'View Clients', 'clients.view', 'View client profiles, stage progress, and onboarding checklists', 'clients', 'view'),
  ('c0000000-0000-0000-0000-000000000025', 'Create Client', 'clients.create', 'Register a new client company into the platform', 'clients', 'create'),
  ('c0000000-0000-0000-0000-000000000026', 'Edit Client', 'clients.edit', 'Update client details, contact info, and onboarding stages', 'clients', 'edit'),
  ('c0000000-0000-0000-0000-000000000027', 'Delete Client', 'clients.delete', 'Remove client records from active system', 'clients', 'delete'),
  ('c0000000-0000-0000-0000-000000000028', 'Assign Client Owner', 'clients.assign', 'Assign an internal relationship owner to a client', 'clients', 'assign'),
  ('c0000000-0000-0000-0000-000000000029', 'Export Clients', 'clients.export', 'Export client registry data', 'clients', 'export'),

  -- Vendors
  ('c0000000-0000-0000-0000-000000000030', 'View Vendors', 'vendors.view', 'View creative vendor and partner directory', 'vendors', 'view'),
  ('c0000000-0000-0000-0000-000000000031', 'Create Vendor', 'vendors.create', 'Register new creative agency or service partner', 'vendors', 'create'),
  ('c0000000-0000-0000-0000-000000000032', 'Edit Vendor', 'vendors.edit', 'Update vendor information and compliance documents', 'vendors', 'edit'),
  ('c0000000-0000-0000-0000-000000000033', 'Delete Vendor', 'vendors.delete', 'Remove vendor partner records', 'vendors', 'delete'),
  ('c0000000-0000-0000-0000-000000000034', 'Approve & Verify Vendor', 'vendors.approve', 'Officially verify vendor credentials and documents', 'vendors', 'approve'),
  ('c0000000-0000-0000-0000-000000000035', 'Export Vendors', 'vendors.export', 'Export vendor partner records', 'vendors', 'export'),

  -- Support
  ('c0000000-0000-0000-0000-000000000036', 'View Support Tickets', 'support.view', 'View customer complaints and helpdesk tickets', 'support', 'view'),
  ('c0000000-0000-0000-0000-000000000037', 'Create Support Ticket', 'support.create', 'Open support or dispute resolution ticket', 'support', 'create'),
  ('c0000000-0000-0000-0000-000000000038', 'Edit Support Ticket', 'support.edit', 'Add ticket responses, internal notes, and update priority', 'support', 'edit'),
  ('c0000000-0000-0000-0000-000000000039', 'Assign Support Ticket', 'support.assign', 'Assign support ticket to a customer specialist', 'support', 'assign'),
  ('c0000000-0000-0000-0000-000000000040', 'Resolve Support Ticket', 'support.resolve', 'Mark ticket as resolved with closing remarks', 'support', 'manage'),
  ('c0000000-0000-0000-0000-000000000041', 'Export Support Tickets', 'support.export', 'Export support ticket metrics and history', 'support', 'export'),

  -- SOPs
  ('c0000000-0000-0000-0000-000000000042', 'View SOPs', 'sops.view', 'Access company standard operating procedures and docs', 'sops', 'view'),
  ('c0000000-0000-0000-0000-000000000043', 'Create SOP', 'sops.create', 'Draft a new SOP or knowledge base document', 'sops', 'create'),
  ('c0000000-0000-0000-0000-000000000044', 'Edit SOP', 'sops.edit', 'Update existing SOP content, markdown, or version', 'sops', 'edit'),
  ('c0000000-0000-0000-0000-000000000045', 'Delete SOP', 'sops.delete', 'Archive or delete standard operating procedures', 'sops', 'delete'),
  ('c0000000-0000-0000-0000-000000000046', 'Approve SOP', 'sops.approve', 'Approve draft SOPs for department publication', 'sops', 'approve'),
  ('c0000000-0000-0000-0000-000000000047', 'Publish SOP', 'sops.publish', 'Publish SOPs to active company-wide status', 'sops', 'manage'),

  -- Reports
  ('c0000000-0000-0000-0000-000000000048', 'View Reports', 'reports.view', 'View cross-department performance analytics', 'reports', 'view'),
  ('c0000000-0000-0000-0000-000000000049', 'Export Reports', 'reports.export', 'Export detailed KPI reports and summaries', 'reports', 'export'),
  ('c0000000-0000-0000-0000-000000000050', 'View Financial Reports', 'reports.view_financial', 'Access platform revenue, invoice status, and escrow data', 'reports', 'view'),

  -- Notifications
  ('c0000000-0000-0000-0000-000000000051', 'View Notifications', 'notifications.view', 'View personal and system alerts', 'notifications', 'view'),
  ('c0000000-0000-0000-0000-000000000052', 'Create Notification', 'notifications.create', 'Broadcast notifications to team members', 'notifications', 'create'),
  ('c0000000-0000-0000-0000-000000000053', 'Manage Notifications', 'notifications.manage', 'Dismiss and manage notification queues', 'notifications', 'manage'),

  -- Audit Logs
  ('c0000000-0000-0000-0000-000000000054', 'View Audit Logs', 'audit_logs.view', 'Review security audit logs and privileged activity', 'audit_logs', 'view'),
  ('c0000000-0000-0000-0000-000000000055', 'Export Audit Logs', 'audit_logs.export', 'Export audit trails for regulatory compliance', 'audit_logs', 'export'),

  -- Website Content
  ('c0000000-0000-0000-0000-000000000056', 'View Website Content', 'website_content.view', 'Review public marketing and landing page configurations', 'website_content', 'view')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, module = EXCLUDED.module, action = EXCLUDED.action;

-- 4. Role-to-Permission Assignments (Populated via Cross-Lookup)
DO $$
DECLARE
  v_role_id UUID;
  v_perm_id UUID;
  v_role_slug TEXT;
  v_perm_slug TEXT;
  v_assignments JSONB := '{
    "super_admin": [
      "dashboard.view", "dashboard.view_company_metrics",
      "users.view", "users.create", "users.edit", "users.suspend", "users.activate", "users.reset_password", "users.revoke_sessions", "users.assign_roles", "users.manage_permissions",
      "departments.view", "departments.create", "departments.edit", "departments.manage_members", "departments.assign_head",
      "tasks.view", "tasks.create", "tasks.edit", "tasks.delete", "tasks.assign", "tasks.approve", "tasks.export",
      "clients.view", "clients.create", "clients.edit", "clients.delete", "clients.assign", "clients.export",
      "vendors.view", "vendors.create", "vendors.edit", "vendors.delete", "vendors.approve", "vendors.export",
      "support.view", "support.create", "support.edit", "support.assign", "support.resolve", "support.export",
      "sops.view", "sops.create", "sops.edit", "sops.delete", "sops.approve", "sops.publish",
      "reports.view", "reports.export", "reports.view_financial",
      "notifications.view", "notifications.create", "notifications.manage",
      "audit_logs.view", "audit_logs.export",
      "website_content.view"
    ],
    "exec_director": [
      "dashboard.view", "dashboard.view_company_metrics",
      "users.view",
      "departments.view",
      "tasks.view", "tasks.approve", "tasks.export",
      "clients.view", "clients.export",
      "vendors.view", "vendors.export",
      "support.view", "support.export",
      "sops.view", "sops.approve",
      "reports.view", "reports.export", "reports.view_financial",
      "audit_logs.view", "audit_logs.export",
      "website_content.view",
      "notifications.view"
    ],
    "coo": [
      "dashboard.view", "dashboard.view_company_metrics",
      "users.view", "users.create", "users.edit", "users.assign_roles",
      "departments.view", "departments.manage_members", "departments.assign_head",
      "tasks.view", "tasks.create", "tasks.edit", "tasks.delete", "tasks.assign", "tasks.approve", "tasks.export",
      "clients.view", "clients.create", "clients.edit", "clients.assign", "clients.export",
      "vendors.view", "vendors.create", "vendors.edit", "vendors.approve", "vendors.export",
      "support.view", "support.create", "support.edit", "support.assign", "support.resolve", "support.export",
      "sops.view", "sops.create", "sops.edit", "sops.approve", "sops.publish",
      "reports.view", "reports.export", "reports.view_financial",
      "audit_logs.view",
      "website_content.view",
      "notifications.view", "notifications.create", "notifications.manage"
    ],
    "dept_head": [
      "dashboard.view",
      "users.view",
      "departments.view", "departments.manage_members",
      "tasks.view", "tasks.create", "tasks.edit", "tasks.assign", "tasks.approve", "tasks.export",
      "clients.view", "clients.edit",
      "vendors.view", "vendors.edit",
      "support.view", "support.edit", "support.resolve",
      "sops.view", "sops.create", "sops.edit", "sops.approve", "sops.publish",
      "reports.view",
      "notifications.view", "notifications.manage"
    ],
    "ops_manager": [
      "dashboard.view",
      "users.view",
      "departments.view",
      "tasks.view", "tasks.create", "tasks.edit", "tasks.delete", "tasks.assign", "tasks.approve", "tasks.export",
      "clients.view", "clients.create", "clients.edit", "clients.assign",
      "vendors.view", "vendors.create", "vendors.edit", "vendors.approve", "vendors.export",
      "support.view", "support.create", "support.edit", "support.assign", "support.resolve",
      "sops.view", "sops.create", "sops.edit", "sops.approve",
      "reports.view", "reports.export",
      "audit_logs.view",
      "notifications.view", "notifications.create", "notifications.manage"
    ],
    "finance_manager": [
      "dashboard.view", "dashboard.view_company_metrics",
      "departments.view",
      "tasks.view",
      "clients.view", "clients.export",
      "vendors.view", "vendors.export",
      "reports.view", "reports.export", "reports.view_financial",
      "sops.view",
      "notifications.view"
    ],
    "hr_manager": [
      "dashboard.view",
      "users.view", "users.create", "users.edit", "users.activate", "users.suspend", "users.assign_roles",
      "departments.view", "departments.manage_members",
      "tasks.view", "tasks.create", "tasks.edit",
      "sops.view", "sops.create", "sops.edit",
      "reports.view",
      "notifications.view", "notifications.create"
    ],
    "sales_manager": [
      "dashboard.view",
      "departments.view",
      "tasks.view", "tasks.create", "tasks.edit",
      "clients.view", "clients.create", "clients.edit", "clients.assign", "clients.export",
      "reports.view", "reports.export",
      "sops.view",
      "notifications.view"
    ],
    "marketing_manager": [
      "dashboard.view",
      "departments.view",
      "tasks.view", "tasks.create", "tasks.edit",
      "website_content.view",
      "sops.view",
      "reports.view",
      "notifications.view"
    ],
    "tech_manager": [
      "dashboard.view",
      "departments.view",
      "tasks.view", "tasks.create", "tasks.edit", "tasks.delete", "tasks.assign",
      "sops.view", "sops.create", "sops.edit",
      "audit_logs.view",
      "reports.view",
      "notifications.view"
    ],
    "ai_manager": [
      "dashboard.view",
      "departments.view",
      "tasks.view", "tasks.create", "tasks.edit",
      "sops.view",
      "reports.view",
      "notifications.view"
    ],
    "qa_manager": [
      "dashboard.view",
      "departments.view",
      "tasks.view", "tasks.edit", "tasks.approve",
      "vendors.view", "vendors.edit", "vendors.approve",
      "support.view", "support.edit",
      "sops.view",
      "reports.view",
      "notifications.view"
    ],
    "team_member": [
      "dashboard.view",
      "departments.view",
      "tasks.view", "tasks.edit",
      "clients.view",
      "vendors.view",
      "support.view", "support.create", "support.edit",
      "sops.view",
      "notifications.view"
    ],
    "auditor": [
      "dashboard.view",
      "users.view",
      "departments.view",
      "tasks.view", "tasks.export",
      "clients.view", "clients.export",
      "vendors.view", "vendors.export",
      "support.view", "support.export",
      "sops.view",
      "reports.view", "reports.export", "reports.view_financial",
      "audit_logs.view", "audit_logs.export",
      "website_content.view",
      "notifications.view"
    ],
    "ops_admin": [
      "dashboard.view",
      "users.view",
      "departments.view",
      "tasks.view", "tasks.create", "tasks.edit", "tasks.delete", "tasks.assign", "tasks.approve", "tasks.export",
      "clients.view", "clients.create", "clients.edit", "clients.assign",
      "vendors.view", "vendors.create", "vendors.edit", "vendors.approve", "vendors.export",
      "support.view", "support.create", "support.edit", "support.assign", "support.resolve",
      "sops.view", "sops.create", "sops.edit", "sops.approve",
      "reports.view", "reports.export",
      "audit_logs.view",
      "notifications.view", "notifications.create", "notifications.manage"
    ],
    "dept_manager": [
      "dashboard.view",
      "users.view",
      "departments.view", "departments.manage_members",
      "tasks.view", "tasks.create", "tasks.edit", "tasks.assign", "tasks.approve",
      "clients.view", "clients.edit",
      "vendors.view", "vendors.edit",
      "support.view", "support.edit",
      "sops.view", "sops.create", "sops.edit",
      "reports.view",
      "notifications.view"
    ]
  }';
BEGIN
  FOR v_role_slug IN SELECT jsonb_object_keys(v_assignments)
  LOOP
    SELECT id INTO v_role_id FROM public.admin_roles WHERE slug = v_role_slug;
    IF v_role_id IS NOT NULL THEN
      FOR v_perm_slug IN SELECT jsonb_array_elements_text(v_assignments->v_role_slug)
      LOOP
        SELECT id INTO v_perm_id FROM public.admin_permissions WHERE slug = v_perm_slug;
        IF v_perm_id IS NOT NULL THEN
          INSERT INTO public.admin_role_permissions (role_id, permission_id)
          VALUES (v_role_id, v_perm_id)
          ON CONFLICT (role_id, permission_id) DO NOTHING;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END $$;
