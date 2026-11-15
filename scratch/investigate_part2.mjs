import { getDb } from "../lib/admin/db.ts";

async function main() {
  const db = getDb();

  console.log("=== FUNCTION guard_admin_user_insert ===");
  const funcInsert = await db.prepare(`
    SELECT p.proname, r.rolname AS owner, p.prosecdef, p.proconfig, pg_get_functiondef(p.oid) AS def
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    JOIN pg_roles r ON p.proowner = r.oid
    WHERE n.nspname = 'public' AND p.proname = 'guard_admin_user_insert'
  `).all();
  console.log(JSON.stringify(funcInsert, null, 2));

  console.log("\n=== 8 TEST ENQUIRIES FROM REMEDIATION SUITE ===");
  const enquiries = await db.prepare(`
    SELECT id, full_name, email, company, mandate_type, timeline, created_at
    FROM public.website_enquiries
    WHERE email LIKE '%@luxury-client.ch%'
    ORDER BY created_at DESC
  `).all();
  console.log("Enquiries count:", enquiries.length);
  console.log(JSON.stringify(enquiries.slice(0, 10), null, 2));

  console.log("\n=== TEST CLIENTS CREATED FROM ENQUIRIES ===");
  const clients = await db.prepare(`
    SELECT id, name, contact_name, contact_email, created_at
    FROM public.clients
    WHERE contact_email LIKE '%@luxury-client.ch%'
    ORDER BY created_at DESC
  `).all();
  console.log("Clients count:", clients.length);
  console.log(JSON.stringify(clients.slice(0, 10), null, 2));

  console.log("\n=== LEFTOVER USERS IN DETAIL ===");
  const users = await db.prepare(`
    SELECT u.id, u.email, u.created_at, p.account_type, p.full_name, p.is_verified
    FROM auth.users u
    LEFT JOIN public.user_profiles p ON u.id = p.id
    WHERE u.email LIKE 'test_talent_%' OR u.email LIKE 'test_company_%'
  `).all();
  console.log(JSON.stringify(users, null, 2));
}

main().catch(console.error);
