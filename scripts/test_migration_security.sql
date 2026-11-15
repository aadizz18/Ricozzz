-- ==============================================================================
-- RICOZ ENTERPRISE RBAC & RLS COMPREHENSIVE SECURITY TEST SUITE
-- Script: scripts/test_migration_security.sql
-- Revision: Step 1.3 Remediated & Production Hardened
-- Environment: PostgreSQL 14+ / InsForge Backend (Target: Ricoz)
-- Execution: psql -f scripts/test_migration_security.sql OR npx @insforge/cli db query
-- Safety: Enclosed in a single transaction that ALWAYS ROLLS BACK.
-- Status Note: Staged verification suite. DO NOT execute against live production
--              without explicit staging approval.
-- ==============================================================================

BEGIN;

SELECT '====================================================================' AS banner;
SELECT 'STARTING RICOZ ENTERPRISE SECURITY AND AUTHORIZATION TEST SUITE' AS banner;
SELECT '====================================================================' AS banner;

-- ------------------------------------------------------------------------------
-- SUITE 1: TABLE COMPLETENESS & SCHEMA INTEGRITY
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_expected_tables TEXT[] := ARRAY[
    'departments', 'admin_users', 'admin_roles', 'admin_permissions',
    'admin_role_permissions', 'admin_user_permissions', 'admin_department_members',
    'admin_sessions', 'tasks', 'task_comments', 'clients', 'client_onboarding_items',
    'vendors', 'vendor_documents', 'support_tickets', 'ticket_responses',
    'sops', 'notifications', 'audit_logs'
  ];
  v_missing_tables TEXT[];
  v_unexpected_tables TEXT[];
  v_table_count INT;
BEGIN
  -- 1. Check all 19 required tables exist
  SELECT array_agg(t) INTO v_missing_tables
  FROM unnest(v_expected_tables) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name = t
  );

  IF v_missing_tables IS NOT NULL AND array_length(v_missing_tables, 1) > 0 THEN
    RAISE EXCEPTION 'TEST 1.1 FAILED: Missing application tables: %', v_missing_tables;
  END IF;

  -- 2. Verify exactly 19 application tables exist in public schema (excluding Postgres/extension internals)
  SELECT count(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name NOT LIKE 'pg_%'
    AND table_name NOT IN ('spatial_ref_sys', '_prisma_migrations', 'schema_migrations', 'pgmigrations');

  IF v_table_count != 19 THEN
    SELECT array_agg(table_name) INTO v_unexpected_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'pg_%'
      AND table_name NOT IN (SELECT unnest(v_expected_tables));

    RAISE EXCEPTION 'TEST 1.2 FAILED: Expected exactly 19 application tables, found %. Unexpected tables: %',
      v_table_count, v_unexpected_tables;
  END IF;

  RAISE NOTICE '✓ SUITE 1 PASSED: Exactly 19 application tables verified with zero unauthorized public tables.';
END $$;

-- ------------------------------------------------------------------------------
-- SUITE 2: ROW-LEVEL SECURITY & FORCE ROW LEVEL SECURITY
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_unprotected_rls TEXT[];
  v_unprotected_force TEXT[];
  v_app_tables TEXT[] := ARRAY[
    'departments', 'admin_users', 'admin_roles', 'admin_permissions',
    'admin_role_permissions', 'admin_user_permissions', 'admin_department_members',
    'admin_sessions', 'tasks', 'task_comments', 'clients', 'client_onboarding_items',
    'vendors', 'vendor_documents', 'support_tickets', 'ticket_responses',
    'sops', 'notifications', 'audit_logs'
  ];
BEGIN
  -- 1. Check relrowsecurity on all 19 application tables
  SELECT array_agg(c.relname) INTO v_unprotected_rls
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname = ANY(v_app_tables)
    AND NOT c.relrowsecurity;

  IF v_unprotected_rls IS NOT NULL AND array_length(v_unprotected_rls, 1) > 0 THEN
    RAISE EXCEPTION 'TEST 2.1 FAILED: Tables lacking Row-Level Security: %', v_unprotected_rls;
  END IF;

  -- 2. Check relforcerowsecurity on all 19 tables
  SELECT array_agg(c.relname) INTO v_unprotected_force
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname = ANY(v_app_tables)
    AND NOT c.relforcerowsecurity;

  IF v_unprotected_force IS NOT NULL AND array_length(v_unprotected_force, 1) > 0 THEN
    RAISE EXCEPTION 'TEST 2.2 FAILED: Tables lacking FORCE ROW LEVEL SECURITY: %', v_unprotected_force;
  END IF;

  RAISE NOTICE '✓ SUITE 2 PASSED: Row-Level Security and FORCE ROW LEVEL SECURITY active on all 19 tables.';
END $$;

-- ------------------------------------------------------------------------------
-- SUITE 3: DIRECT, INHERITED, PUBLIC, AND COLUMN-LEVEL PRIVILEGE BOUNDARIES
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_table TEXT;
  v_priv TEXT;
  v_app_tables TEXT[] := ARRAY[
    'departments', 'admin_users', 'admin_roles', 'admin_permissions',
    'admin_role_permissions', 'admin_user_permissions', 'admin_department_members',
    'admin_sessions', 'tasks', 'task_comments', 'clients', 'client_onboarding_items',
    'vendors', 'vendor_documents', 'support_tickets', 'ticket_responses',
    'sops', 'notifications', 'audit_logs'
  ];
BEGIN
  -- 1. Verify anon role has NO privileges on any of the 19 application tables
  FOREACH v_table IN ARRAY v_app_tables
  LOOP
    FOREACH v_priv IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']
    LOOP
      IF has_table_privilege('anon', 'public.' || v_table, v_priv) THEN
        RAISE EXCEPTION 'TEST 3.1 FAILED: Role "anon" possesses unauthorized % privilege on public.%', v_priv, v_table;
      END IF;
    END LOOP;
  END LOOP;

  -- 2. Verify column-level privileges: anon must NOT have column privilege on sensitive fields
  IF has_column_privilege('anon', 'public.admin_users', 'role', 'SELECT') THEN
    RAISE EXCEPTION 'TEST 3.2 FAILED: Role "anon" possesses column SELECT on admin_users.role';
  END IF;
  IF has_column_privilege('anon', 'public.admin_sessions', 'token_hash', 'SELECT') THEN
    RAISE EXCEPTION 'TEST 3.2 FAILED: Role "anon" possesses column SELECT on admin_sessions.token_hash';
  END IF;
  IF has_column_privilege('anon', 'public.audit_logs', 'change_summary', 'SELECT') THEN
    RAISE EXCEPTION 'TEST 3.2 FAILED: Role "anon" possesses column SELECT on audit_logs.change_summary';
  END IF;

  -- 3. Verify authenticated role has NO direct write privileges on audit_logs
  FOREACH v_priv IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']
  LOOP
    IF has_table_privilege('authenticated', 'public.audit_logs', v_priv) THEN
      RAISE EXCEPTION 'TEST 3.3 FAILED: Role "authenticated" possesses unauthorized % on public.audit_logs', v_priv;
    END IF;
  END LOOP;

  -- 4. Verify authenticated role has NO write privileges on core RBAC catalogs
  FOREACH v_table IN ARRAY ARRAY['admin_roles', 'admin_permissions', 'admin_role_permissions']
  LOOP
    FOREACH v_priv IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']
    LOOP
      IF has_table_privilege('authenticated', 'public.' || v_table, v_priv) THEN
        RAISE EXCEPTION 'TEST 3.4 FAILED: Role "authenticated" possesses unauthorized % on public.%', v_priv, v_table;
      END IF;
    END LOOP;
  END LOOP;

  -- 5. Verify authenticated role has NO UPDATE or TRUNCATE on admin_sessions
  IF has_table_privilege('authenticated', 'public.admin_sessions', 'UPDATE') THEN
    RAISE EXCEPTION 'TEST 3.5 FAILED: Role "authenticated" possesses UPDATE privilege on public.admin_sessions';
  END IF;
  IF has_table_privilege('authenticated', 'public.admin_sessions', 'TRUNCATE') THEN
    RAISE EXCEPTION 'TEST 3.5 FAILED: Role "authenticated" possesses TRUNCATE privilege on public.admin_sessions';
  END IF;

  RAISE NOTICE '✓ SUITE 3 PASSED: Table, column, anon, and authenticated privilege boundaries verified.';
END $$;

-- ------------------------------------------------------------------------------
-- SUITE 4: ROW-LEVEL SECURITY POLICY MATRIX CORRECTNESS
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_table TEXT;
  v_policy_count INT;
  v_audit_write_count INT;
  v_anon_policy_count INT;
  v_app_tables TEXT[] := ARRAY[
    'departments', 'admin_users', 'admin_roles', 'admin_permissions',
    'admin_role_permissions', 'admin_user_permissions', 'admin_department_members',
    'admin_sessions', 'tasks', 'task_comments', 'clients', 'client_onboarding_items',
    'vendors', 'vendor_documents', 'support_tickets', 'ticket_responses',
    'sops', 'notifications', 'audit_logs'
  ];
BEGIN
  -- 1. Verify every table has at least one active policy
  FOREACH v_table IN ARRAY v_app_tables
  LOOP
    SELECT count(*) INTO v_policy_count
    FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = v_table;

    IF v_policy_count = 0 THEN
      RAISE EXCEPTION 'TEST 4.1 FAILED: Table public.% has no RLS policies defined!', v_table;
    END IF;
  END LOOP;

  -- 2. Verify audit_logs has ONLY a SELECT policy (polcmd = 'r')
  SELECT count(*) INTO v_audit_write_count
  FROM pg_policy p
  JOIN pg_class c ON p.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND c.relname = 'audit_logs'
    AND p.polcmd != 'r';

  IF v_audit_write_count > 0 THEN
    RAISE EXCEPTION 'TEST 4.2 FAILED: public.audit_logs possesses write RLS policies! Only SELECT allowed.';
  END IF;

  -- 3. Verify no policies are granted to the 'anon' role or PUBLIC (oid 0)
  SELECT count(*) INTO v_anon_policy_count
  FROM pg_policy p
  JOIN pg_class c ON p.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND c.relname = ANY(v_app_tables)
    AND (
      p.polroles = '{0}' -- PUBLIC
      OR (SELECT oid FROM pg_roles WHERE rolname = 'anon') = ANY(p.polroles)
    );

  IF v_anon_policy_count > 0 THEN
    RAISE EXCEPTION 'TEST 4.3 FAILED: % policies grant access to anon or PUBLIC!', v_anon_policy_count;
  END IF;

  RAISE NOTICE '✓ SUITE 4 PASSED: Explicit RLS policy matrix verified with zero public/anon leaks.';
END $$;

-- ------------------------------------------------------------------------------
-- SUITE 5: TRIGGER VALIDATION (EXACT BITMASKS, TIMING, EVENTS, FUNCTIONS, ENABLED)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_rec RECORD;
  v_tg RECORD;
  v_found INT;
BEGIN
  -- Matrix of all 13 security guard triggers with exact expected bitmask properties
  -- tgtype bitmask:
  --   Bit 0 (1):  ROW-level trigger
  --   Bit 1 (2):  BEFORE timing
  --   Bit 2 (4):  INSERT event
  --   Bit 3 (8):  DELETE event
  --   Bit 4 (16): UPDATE event
  FOR v_rec IN
    SELECT * FROM (
      VALUES
        ('departments', 'trg_guard_department_update', 'guard_department_update', TRUE, TRUE, FALSE, TRUE, FALSE),
        ('admin_users', 'trg_guard_admin_user_insert', 'guard_admin_user_insert', TRUE, TRUE, TRUE, FALSE, FALSE),
        ('admin_users', 'trg_guard_admin_user_update', 'guard_admin_user_update', TRUE, TRUE, FALSE, TRUE, FALSE),
        ('admin_user_permissions', 'trg_prevent_self_permission_tampering', 'prevent_self_permission_tampering', TRUE, TRUE, TRUE, TRUE, TRUE),
        ('tasks', 'trg_guard_task_update', 'guard_task_update', TRUE, TRUE, FALSE, TRUE, FALSE),
        ('task_comments', 'trg_guard_task_comment_update', 'guard_task_comment_update', TRUE, TRUE, FALSE, TRUE, FALSE),
        ('vendors', 'trg_guard_vendor_update', 'guard_vendor_update', TRUE, TRUE, FALSE, TRUE, FALSE),
        ('vendor_documents', 'trg_guard_vendor_document_mutation', 'guard_vendor_document_mutation', TRUE, TRUE, TRUE, TRUE, FALSE),
        ('client_onboarding_items', 'trg_guard_client_onboarding_item_update', 'guard_client_onboarding_item_update', TRUE, TRUE, FALSE, TRUE, FALSE),
        ('sops', 'trg_guard_sop_update', 'guard_sop_update', TRUE, TRUE, FALSE, TRUE, FALSE),
        ('support_tickets', 'trg_guard_support_ticket_update', 'guard_support_ticket_update', TRUE, TRUE, FALSE, TRUE, FALSE),
        ('notifications', 'trg_guard_notification_update', 'guard_notification_update', TRUE, TRUE, FALSE, TRUE, FALSE),
        ('audit_logs', 'trg_audit_logs_immutable', 'prevent_audit_log_mutation', TRUE, TRUE, FALSE, TRUE, TRUE)
    ) AS t(tbl, trg_name, fn_name, is_row, is_before, on_insert, on_update, on_delete)
  LOOP
    SELECT pt.tgtype, pt.tgenabled, pp.proname INTO v_tg
    FROM pg_trigger pt
    JOIN pg_class pc ON pt.tgrelid = pc.oid
    JOIN pg_proc pp ON pt.tgfoid = pp.oid
    JOIN pg_namespace pn ON pc.relnamespace = pn.oid
    WHERE pn.nspname = 'public'
      AND pc.relname = v_rec.tbl
      AND pt.tgname = v_rec.trg_name;

    IF v_tg IS NULL THEN
      RAISE EXCEPTION 'TEST 5 FAILED: Trigger % on % is MISSING from catalog!', v_rec.trg_name, v_rec.tbl;
    END IF;

    -- Verify enabled state
    IF v_tg.tgenabled != 'O' THEN
      RAISE EXCEPTION 'TEST 5 FAILED: Trigger % on % is not active (tgenabled=%)', v_rec.trg_name, v_rec.tbl, v_tg.tgenabled;
    END IF;

    -- Verify row-level behavior
    IF ((v_tg.tgtype & 1) = 1) != v_rec.is_row THEN
      RAISE EXCEPTION 'TEST 5 FAILED: Trigger % on % row-level mismatch (expected %, got %)',
        v_rec.trg_name, v_rec.tbl, v_rec.is_row, ((v_tg.tgtype & 1) = 1);
    END IF;

    -- Verify BEFORE timing
    IF ((v_tg.tgtype & 2) = 2) != v_rec.is_before THEN
      RAISE EXCEPTION 'TEST 5 FAILED: Trigger % on % BEFORE timing mismatch', v_rec.trg_name, v_rec.tbl;
    END IF;

    -- Verify exact event combinations
    IF ((v_tg.tgtype & 4) = 4) != v_rec.on_insert THEN
      RAISE EXCEPTION 'TEST 5 FAILED: Trigger % on % INSERT event mismatch', v_rec.trg_name, v_rec.tbl;
    END IF;

    IF ((v_tg.tgtype & 16) = 16) != v_rec.on_update THEN
      RAISE EXCEPTION 'TEST 5 FAILED: Trigger % on % UPDATE event mismatch', v_rec.trg_name, v_rec.tbl;
    END IF;

    IF ((v_tg.tgtype & 8) = 8) != v_rec.on_delete THEN
      RAISE EXCEPTION 'TEST 5 FAILED: Trigger % on % DELETE event mismatch', v_rec.trg_name, v_rec.tbl;
    END IF;

    -- Verify trigger function attached
    IF v_tg.proname != v_rec.fn_name THEN
      RAISE EXCEPTION 'TEST 5 FAILED: Trigger % on % points to function % instead of %',
        v_rec.trg_name, v_rec.tbl, v_tg.proname, v_rec.fn_name;
    END IF;
  END LOOP;

  RAISE NOTICE '✓ SUITE 5 PASSED: All 13 security guard triggers validated for exact timing, events, and function bindings.';
END $$;

-- ------------------------------------------------------------------------------
-- SUITE 6: SECURITY DEFINER AUDIT & SCHEMA CREATION RESTRICTION
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_fn RECORD;
  v_insecure_fns TEXT[];
  v_anon_exec_fns TEXT[];
  v_public_exec_fns TEXT[];
BEGIN
  -- 1. Inspect ALL functions across the public schema where prosecdef = TRUE
  FOR v_fn IN
    SELECT p.oid, p.proname, p.proconfig, pg_get_userbyid(p.proowner) AS owner_name
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.prosecdef = TRUE
  LOOP
    -- Verify search_path is explicitly pinned to pg_catalog, public, pg_temp
    IF v_fn.proconfig IS NULL OR NOT ARRAY['search_path=pg_catalog, public, pg_temp']::text[] <@ v_fn.proconfig THEN
      v_insecure_fns := array_append(v_insecure_fns, v_fn.proname);
    END IF;

    -- Verify anon role CANNOT execute this security definer function
    IF has_function_privilege('anon', v_fn.oid, 'EXECUTE') THEN
      v_anon_exec_fns := array_append(v_anon_exec_fns, v_fn.proname);
    END IF;

    -- Verify PUBLIC pseudo-role CANNOT execute this security definer function
    IF has_function_privilege('public', v_fn.oid, 'EXECUTE') THEN
      v_public_exec_fns := array_append(v_public_exec_fns, v_fn.proname);
    END IF;
  END LOOP;

  IF v_insecure_fns IS NOT NULL AND array_length(v_insecure_fns, 1) > 0 THEN
    RAISE EXCEPTION 'TEST 6.1 FAILED: SECURITY DEFINER functions without pinned search_path: %', v_insecure_fns;
  END IF;

  IF v_anon_exec_fns IS NOT NULL AND array_length(v_anon_exec_fns, 1) > 0 THEN
    RAISE EXCEPTION 'TEST 6.2 FAILED: Role "anon" has EXECUTE on security definer functions: %', v_anon_exec_fns;
  END IF;

  IF v_public_exec_fns IS NOT NULL AND array_length(v_public_exec_fns, 1) > 0 THEN
    RAISE EXCEPTION 'TEST 6.3 FAILED: PUBLIC pseudo-role has EXECUTE on security definer functions: %', v_public_exec_fns;
  END IF;

  -- 2. Verify REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated
  IF has_schema_privilege('public', 'public', 'CREATE') THEN
    RAISE EXCEPTION 'TEST 6.4 FAILED: Schema "public" still permits CREATE by PUBLIC!';
  END IF;
  IF has_schema_privilege('anon', 'public', 'CREATE') THEN
    RAISE EXCEPTION 'TEST 6.4 FAILED: Schema "public" still permits CREATE by anon!';
  END IF;
  IF has_schema_privilege('authenticated', 'public', 'CREATE') THEN
    RAISE EXCEPTION 'TEST 6.4 FAILED: Schema "public" still permits CREATE by authenticated!';
  END IF;

  RAISE NOTICE '✓ SUITE 6 PASSED: All SECURITY DEFINER functions hardened; schema mutation privileges revoked.';
END $$;

-- ------------------------------------------------------------------------------
-- SUITE 7: EXACT PERMISSION CATALOG, ROLES, DEPARTMENTS, AND SUPER ADMIN MAPPING
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_expected_depts TEXT[] := ARRAY[
    'operations', 'technology', 'sales', 'marketing', 'design',
    'support', 'executive', 'finance', 'ai-automation', 'quality-assurance'
  ];
  v_expected_roles TEXT[] := ARRAY[
    'super_admin', 'exec_director', 'coo', 'dept_head', 'ops_manager',
    'finance_manager', 'hr_manager', 'sales_manager', 'marketing_manager',
    'tech_manager', 'ai_manager', 'qa_manager', 'team_member', 'auditor',
    'ops_admin', 'dept_manager'
  ];
  v_expected_perms TEXT[] := ARRAY[
    'dashboard.view', 'dashboard.view_company_metrics',
    'users.view', 'users.create', 'users.edit', 'users.suspend', 'users.activate', 'users.reset_password', 'users.revoke_sessions', 'users.assign_roles', 'users.manage_permissions',
    'departments.view', 'departments.create', 'departments.edit', 'departments.manage_members', 'departments.assign_head',
    'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete', 'tasks.assign', 'tasks.approve', 'tasks.export',
    'clients.view', 'clients.create', 'clients.edit', 'clients.delete', 'clients.assign', 'clients.export',
    'vendors.view', 'vendors.create', 'vendors.edit', 'vendors.delete', 'vendors.approve', 'vendors.export',
    'support.view', 'support.create', 'support.edit', 'support.assign', 'support.resolve', 'support.export',
    'sops.view', 'sops.create', 'sops.edit', 'sops.delete', 'sops.approve', 'sops.publish',
    'reports.view', 'reports.export', 'reports.view_financial',
    'notifications.view', 'notifications.create', 'notifications.manage',
    'audit_logs.view', 'audit_logs.export',
    'website_content.view'
  ];
  v_missing_depts TEXT[];
  v_missing_roles TEXT[];
  v_missing_perms TEXT[];
  v_unexpected_perms TEXT[];
  v_unmapped_super_perms TEXT[];
  v_perm_count INT;
  v_orphan_count INT;
BEGIN
  -- 1. Verify departments by exact slug
  SELECT array_agg(d) INTO v_missing_depts
  FROM unnest(v_expected_depts) AS d
  WHERE NOT EXISTS (SELECT 1 FROM public.departments WHERE slug = d);

  IF v_missing_depts IS NOT NULL AND array_length(v_missing_depts, 1) > 0 THEN
    RAISE EXCEPTION 'TEST 7.1 FAILED: Missing departments by slug: %', v_missing_depts;
  END IF;

  -- 2. Verify roles by exact slug
  SELECT array_agg(r) INTO v_missing_roles
  FROM unnest(v_expected_roles) AS r
  WHERE NOT EXISTS (SELECT 1 FROM public.admin_roles WHERE slug = r);

  IF v_missing_roles IS NOT NULL AND array_length(v_missing_roles, 1) > 0 THEN
    RAISE EXCEPTION 'TEST 7.2 FAILED: Missing system roles by slug: %', v_missing_roles;
  END IF;

  -- 3. Verify exactly 56 permissions exist individually
  SELECT array_agg(p) INTO v_missing_perms
  FROM unnest(v_expected_perms) AS p
  WHERE NOT EXISTS (SELECT 1 FROM public.admin_permissions WHERE slug = p);

  IF v_missing_perms IS NOT NULL AND array_length(v_missing_perms, 1) > 0 THEN
    RAISE EXCEPTION 'TEST 7.3 FAILED: Missing catalogued permissions: %', v_missing_perms;
  END IF;

  SELECT count(*) INTO v_perm_count FROM public.admin_permissions;
  IF v_perm_count != 56 THEN
    SELECT array_agg(slug) INTO v_unexpected_perms
    FROM public.admin_permissions
    WHERE slug NOT IN (SELECT unnest(v_expected_perms));

    RAISE EXCEPTION 'TEST 7.3 FAILED: Expected exactly 56 permissions, found %. Unexpected: %',
      v_perm_count, v_unexpected_perms;
  END IF;

  -- 4. Verify super_admin has EVERY single permission in admin_permissions
  SELECT array_agg(p.slug) INTO v_unmapped_super_perms
  FROM public.admin_permissions p
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.admin_role_permissions rp
    JOIN public.admin_roles r ON rp.role_id = r.id
    WHERE r.slug = 'super_admin' AND rp.permission_id = p.id
  );

  IF v_unmapped_super_perms IS NOT NULL AND array_length(v_unmapped_super_perms, 1) > 0 THEN
    RAISE EXCEPTION 'TEST 7.4 FAILED: super_admin missing permissions: %', v_unmapped_super_perms;
  END IF;

  -- 5. Verify zero orphan mappings in admin_role_permissions
  SELECT count(*) INTO v_orphan_count
  FROM public.admin_role_permissions rp
  LEFT JOIN public.admin_roles r ON rp.role_id = r.id
  LEFT JOIN public.admin_permissions p ON rp.permission_id = p.id
  WHERE r.id IS NULL OR p.id IS NULL;

  IF v_orphan_count > 0 THEN
    RAISE EXCEPTION 'TEST 7.5 FAILED: Found % orphan records in admin_role_permissions!', v_orphan_count;
  END IF;

  RAISE NOTICE '✓ SUITE 7 PASSED: Departments (10), Roles (16), Permissions (56), and Super Admin complete mapping verified.';
END $$;

-- ------------------------------------------------------------------------------
-- SUITE 8: TRANSACTIONAL BEHAVIORAL VERIFICATION (ISOLATED SANDBOX FIXTURES)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_user_id UUID := gen_random_uuid();
  v_test_audit_id UUID := gen_random_uuid();
  v_test_notif_id UUID := gen_random_uuid();
  v_caught_exception BOOLEAN;
  v_err_msg TEXT;
  v_read_status BOOLEAN;
  v_notif_title TEXT;
  v_notif_msg TEXT;
BEGIN
  -- ----------------------------------------------------------------------------
  -- TEST 8.1: Audit Log Actual UPDATE & DELETE Rejection
  -- ----------------------------------------------------------------------------
  -- Insert real audit log record
  INSERT INTO public.audit_logs (
    id, actor_id, actor_name, actor_role, action, entity_type, entity_id, change_summary, created_at
  ) VALUES (
    v_test_audit_id, NULL, 'Test Security Runner', 'system_audit', 'TEST_ACTION', 'system', '0', 'Initial immutable state', NOW()
  );

  -- Attempt real UPDATE on the audit log row -> Must raise exception
  v_caught_exception := FALSE;
  v_err_msg := '';
  BEGIN
    UPDATE public.audit_logs SET change_summary = 'Tampered summary' WHERE id = v_test_audit_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_exception := TRUE;
    v_err_msg := SQLERRM;
  END;

  IF NOT v_caught_exception OR v_err_msg NOT LIKE '%Audit logs are immutable%' THEN
    RAISE EXCEPTION 'TEST 8.1 FAILED: Audit log UPDATE was not rejected by prevent_audit_log_mutation! Error: %', v_err_msg;
  END IF;

  -- Attempt real DELETE on the audit log row -> Must raise exception
  v_caught_exception := FALSE;
  v_err_msg := '';
  BEGIN
    DELETE FROM public.audit_logs WHERE id = v_test_audit_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_exception := TRUE;
    v_err_msg := SQLERRM;
  END;

  IF NOT v_caught_exception OR v_err_msg NOT LIKE '%Audit logs are immutable%' THEN
    RAISE EXCEPTION 'TEST 8.1 FAILED: Audit log DELETE was not rejected by prevent_audit_log_mutation! Error: %', v_err_msg;
  END IF;

  RAISE NOTICE '✓ SUITE 8.1 PASSED: Real UPDATE and DELETE operations on audit_logs blocked by trigger.';

  -- ----------------------------------------------------------------------------
  -- TEST 8.2: Notification Field Manipulation Defense vs Authorized Status Update
  -- ----------------------------------------------------------------------------
  -- Create isolated fixture (bypassing auth.users FK using session_replication_role)
  SET LOCAL session_replication_role = 'replica';
  INSERT INTO public.admin_users (id, email, full_name, role, status)
  VALUES (v_test_user_id, 'sec_test_user@ricoz.internal', 'Test Notification User', 'team_member', 'active');

  INSERT INTO public.notifications (id, user_id, title, message, type, link, is_read)
  VALUES (v_test_notif_id, v_test_user_id, 'Original Title', 'Original Message', 'system', '/admin', FALSE);
  SET LOCAL session_replication_role = 'origin';

  -- Attempt unauthorized title modification -> Must be rejected
  v_caught_exception := FALSE;
  v_err_msg := '';
  BEGIN
    UPDATE public.notifications SET title = 'Tampered Title' WHERE id = v_test_notif_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_exception := TRUE;
    v_err_msg := SQLERRM;
  END;

  IF NOT v_caught_exception OR v_err_msg NOT LIKE '%Only the is_read status of notifications may be updated%' THEN
    RAISE EXCEPTION 'TEST 8.2 FAILED: Notification title alteration was not rejected! Error: %', v_err_msg;
  END IF;

  -- Attempt unauthorized message modification -> Must be rejected
  v_caught_exception := FALSE;
  v_err_msg := '';
  BEGIN
    UPDATE public.notifications SET message = 'Tampered Message' WHERE id = v_test_notif_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_exception := TRUE;
    v_err_msg := SQLERRM;
  END;

  IF NOT v_caught_exception OR v_err_msg NOT LIKE '%Only the is_read status of notifications may be updated%' THEN
    RAISE EXCEPTION 'TEST 8.2 FAILED: Notification message alteration was not rejected! Error: %', v_err_msg;
  END IF;

  -- Attempt unauthorized recipient reassignment -> Must be rejected
  v_caught_exception := FALSE;
  v_err_msg := '';
  BEGIN
    UPDATE public.notifications SET user_id = gen_random_uuid() WHERE id = v_test_notif_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_exception := TRUE;
    v_err_msg := SQLERRM;
  END;

  IF NOT v_caught_exception OR v_err_msg NOT LIKE '%Only the is_read status of notifications may be updated%' THEN
    RAISE EXCEPTION 'TEST 8.2 FAILED: Notification user_id reassignment was not rejected! Error: %', v_err_msg;
  END IF;

  -- Attempt authorized is_read update -> Must succeed
  UPDATE public.notifications SET is_read = TRUE WHERE id = v_test_notif_id;

  SELECT is_read, title, message INTO v_read_status, v_notif_title, v_notif_msg
  FROM public.notifications WHERE id = v_test_notif_id;

  IF v_read_status IS NOT TRUE OR v_notif_title != 'Original Title' OR v_notif_msg != 'Original Message' THEN
    RAISE EXCEPTION 'TEST 8.2 FAILED: Notification is_read update state invalid: is_read=%, title=%',
      v_read_status, v_notif_title;
  END IF;

  RAISE NOTICE '✓ SUITE 8.2 PASSED: Notification tampering blocked; authorized is_read status update succeeded.';

  -- ----------------------------------------------------------------------------
  -- TEST 8.3: log_audit_event Rejection for Unauthenticated & Inactive Callers
  -- ----------------------------------------------------------------------------
  v_caught_exception := FALSE;
  v_err_msg := '';
  BEGIN
    -- No auth.uid() present in current test session -> Must reject
    PERFORM public.log_audit_event('TEST', 'test', '1', 'Unauthorized event');
  EXCEPTION WHEN OTHERS THEN
    v_caught_exception := TRUE;
    v_err_msg := SQLERRM;
  END;

  IF NOT v_caught_exception OR v_err_msg NOT LIKE '%authenticated session%' THEN
    RAISE EXCEPTION 'TEST 8.3 FAILED: log_audit_event permitted unauthenticated invocation! Error: %', v_err_msg;
  END IF;

  RAISE NOTICE '✓ SUITE 8.3 PASSED: log_audit_event unauthenticated forgery rejection verified.';
END $$;

-- ------------------------------------------------------------------------------
-- CLEANUP: ALWAYS ROLLBACK TRANSACTION (ZERO STATE MODIFICATION)
-- ------------------------------------------------------------------------------
ROLLBACK;

SELECT '====================================================================' AS summary;
SELECT 'SECURITY TEST SUITE STATICALLY VERIFIED (STAGED FOR TARGET DATABASE)' AS summary;
SELECT '====================================================================' AS summary;
