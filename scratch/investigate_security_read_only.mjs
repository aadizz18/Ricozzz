import { getDb } from "../lib/admin/db.ts";

async function main() {
  const db = getDb();

  console.log("=== A. ADMIN_USERS TRIGGERS ===");
  const triggers = await db.prepare(`
    SELECT 
      t.tgname AS trigger_name,
      c.relname AS table_name,
      p.proname AS function_name,
      t.tgenabled AS enabled_flag,
      pg_get_triggerdef(t.oid) AS definition
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE n.nspname = 'public' AND c.relname = 'admin_users'
  `).all();
  console.log(JSON.stringify(triggers, null, 2));

  console.log("\n=== A. guard_prevent_admin_creation_from_public FUNCTION ===");
  const func = await db.prepare(`
    SELECT 
      p.proname,
      r.rolname AS owner,
      p.prosecdef AS is_security_definer,
      p.proconfig AS search_path_config,
      pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    JOIN pg_roles r ON p.proowner = r.oid
    WHERE n.nspname = 'public' AND p.proname = 'guard_prevent_admin_creation_from_public'
  `).all();
  console.log(JSON.stringify(func, null, 2));

  console.log("\n=== A. ADMIN_USERS PRIVILEGES & RLS POLICIES ===");
  const policies = await db.prepare(`
    SELECT 
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'admin_users'
  `).all();
  console.log("RLS Policies:", JSON.stringify(policies, null, 2));

  const privileges = await db.prepare(`
    SELECT 
      grantee,
      privilege_type
    FROM information_schema.table_privileges
    WHERE table_schema = 'public' AND table_name = 'admin_users'
  `).all();
  console.log("Privileges:", JSON.stringify(privileges, null, 2));

  console.log("\n=== C. is_admin FUNCTION ===");
  const isAdminFunc = await db.prepare(`
    SELECT 
      p.proname,
      r.rolname AS owner,
      p.prosecdef AS is_security_definer,
      p.proconfig AS search_path_config,
      pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    JOIN pg_roles r ON p.proowner = r.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_admin'
  `).all();
  console.log(JSON.stringify(isAdminFunc, null, 2));

  console.log("\n=== C. PROFILE ID INTEGRITY & ORPHANS ===");
  const mismatchProfiles = await db.prepare(`
    SELECT up.id AS up_id, up.email, up.account_type,
           tp.id AS tp_id, tp.user_id AS tp_user_id,
           cp.id AS cp_id, cp.user_id AS cp_user_id
    FROM public.user_profiles up
    LEFT JOIN public.talent_profiles tp ON up.id = tp.id
    LEFT JOIN public.company_profiles cp ON up.id = cp.id
    WHERE (up.account_type = 'talent' AND tp.id IS NULL)
       OR (up.account_type = 'company' AND cp.id IS NULL)
       OR (tp.id IS NOT NULL AND tp.id != tp.user_id)
       OR (cp.id IS NOT NULL AND cp.id != cp.user_id)
  `).all();
  console.log("Mismatch profiles count:", mismatchProfiles.length, mismatchProfiles);

  const orphanSubprofiles = await db.prepare(`
    SELECT 'talent' AS type, tp.id, tp.user_id
    FROM public.talent_profiles tp
    LEFT JOIN public.user_profiles up ON tp.id = up.id
    WHERE up.id IS NULL
    UNION ALL
    SELECT 'company' AS type, cp.id, cp.user_id
    FROM public.company_profiles cp
    LEFT JOIN public.user_profiles up ON cp.id = up.id
    WHERE up.id IS NULL
  `).all();
  console.log("Orphan subprofiles count:", orphanSubprofiles.length, orphanSubprofiles);

  console.log("\n=== D. TEST ENQUIRIES INVENTORY ===");
  const testEnquiries = await db.prepare(`
    SELECT id, full_name, email, company, created_at
    FROM public.website_enquiries
    WHERE email LIKE '%@luxury-client.ch%' OR full_name LIKE 'Verified Lead%'
    ORDER BY created_at DESC
  `).all();
  console.log("Test enquiries found:", testEnquiries.length, JSON.stringify(testEnquiries, null, 2));

  console.log("\n=== D. TEST CLIENTS INVENTORY ===");
  try {
    const testClients = await db.prepare(`
      SELECT id, name, contact_name, contact_email, created_at
      FROM public.clients
      WHERE contact_email LIKE '%@luxury-client.ch%' OR name LIKE 'Verified Lead%'
      ORDER BY created_at DESC
    `).all();
    console.log("Test clients found:", testClients.length, JSON.stringify(testClients, null, 2));
  } catch (err) {
    console.error("Error querying clients:", err.message);
  }

  console.log("\n=== D. TEST RATE LIMIT RECORDS ===");
  try {
    const testRateLimits = await db.prepare(`
      SELECT id, key, count, window_start, expires_at
      FROM public.rate_limits
      WHERE key LIKE '%203.0.113%' OR key LIKE '%public_%'
      ORDER BY window_start DESC
      LIMIT 20
    `).all();
    console.log("Test rate limits:", JSON.stringify(testRateLimits, null, 2));
  } catch (err) {
    console.error("Error querying rate_limits:", err.message);
  }

  console.log("\n=== D. LEFTOVER TEST TALENT / COMPANY ACCOUNTS ===");
  try {
    const leftoverUsers = await db.prepare(`
      SELECT id, email, created_at
      FROM auth.users
      WHERE email LIKE 'test_talent_%' OR email LIKE 'test_company_%'
    `).all();
    console.log("Leftover auth.users:", JSON.stringify(leftoverUsers, null, 2));
  } catch (err) {
    console.error("Error querying auth.users:", err.message);
  }

  try {
    const leftoverProfiles = await db.prepare(`
      SELECT id, email, account_type, full_name, created_at
      FROM public.user_profiles
      WHERE email LIKE 'test_talent_%' OR email LIKE 'test_company_%'
    `).all();
    console.log("Leftover user_profiles:", JSON.stringify(leftoverProfiles, null, 2));
  } catch (err) {
    console.error("Error querying user_profiles:", err.message);
  }
}

main().catch(console.error);
