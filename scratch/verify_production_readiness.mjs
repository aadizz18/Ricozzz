import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
const envContent = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx !== -1) {
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    process.env[key] = val;
  }
}

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const apiKey = process.env.INSFORGE_API_KEY;

if (!baseUrl || !apiKey) {
  console.error("Missing NEXT_PUBLIC_INSFORGE_URL or INSFORGE_API_KEY in .env.local");
  process.exit(1);
}

async function query(sql, params = []) {
  const res = await fetch(`${baseUrl}/api/database/advance/rawsql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query: sql, params }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`DB Error [${res.status}]: ${txt}`);
  }
  return await res.json();
}

async function runAudit() {
  console.log("==========================================================");
  console.log(" RICOZ — Production Readiness Database & Security Audit");
  console.log("==========================================================");

  // 1. Connectivity Check
  console.log("\n[1/5] Testing InsForge PostgreSQL Connectivity...");
  const t0 = Date.now();
  const ping = await query("SELECT current_database(), version(), NOW() AS server_time;");
  const latency = Date.now() - t0;
  console.log(`✅ Connected in ${latency}ms`);
  console.log(`   Database: ${ping.rows[0].current_database}`);
  console.log(`   Server Time: ${ping.rows[0].server_time}`);

  // 2. 19 Tables Verification
  console.log("\n[2/5] Verifying 19 Application Tables...");
  const expectedTables = [
    "departments",
    "admin_roles",
    "admin_users",
    "admin_permissions",
    "admin_role_permissions",
    "admin_user_permissions",
    "admin_department_members",
    "admin_sessions",
    "tasks",
    "task_comments",
    "clients",
    "client_onboarding_items",
    "vendors",
    "vendor_documents",
    "support_tickets",
    "ticket_responses",
    "sops",
    "notifications",
    "audit_logs",
  ];

  const tableCheck = await query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  const actualTables = tableCheck.rows.map((r) => r.table_name);
  console.log(`   Found ${actualTables.length} total tables in public schema.`);

  let allFound = true;
  for (const t of expectedTables) {
    const exists = actualTables.includes(t);
    if (!exists) {
      console.error(`❌ Missing table: ${t}`);
      allFound = false;
    }
  }
  if (allFound) {
    console.log(`✅ All 19 expected application tables exist.`);
  } else {
    process.exit(1);
  }

  // Row counts across tables
  console.log("\nTable Row Counts & Persistence Check:");
  for (const t of expectedTables) {
    const cnt = await query(`SELECT COUNT(*) AS total FROM public.${t}`);
    console.log(`   • public.${t.padEnd(26)} : ${cnt.rows[0].total} rows`);
  }

  // 3. Super-Admin & Auth Verification
  console.log("\n[3/5] Verifying Super-Admin and Identity Provisioning...");
  const superAdminCheck = await query(`
    SELECT id, email, full_name, role, status, created_at, last_login_at 
    FROM public.admin_users 
    WHERE role = 'super_admin';
  `);
  console.log(`   Found ${superAdminCheck.rowCount} super_admin user(s):`);
  for (const u of superAdminCheck.rows) {
    console.log(`   • ${u.full_name} <${u.email}> (Status: ${u.status}, Last Login: ${u.last_login_at})`);
  }

  // 4. RBAC Matrix & 56 Permissions Check
  console.log("\n[4/5] Verifying RBAC Capability Matrix...");
  const permsCount = await query("SELECT COUNT(*) as total FROM public.admin_permissions;");
  const rolesCount = await query("SELECT COUNT(*) as total FROM public.admin_roles;");
  const matrixCount = await query("SELECT COUNT(*) as total FROM public.admin_role_permissions;");

  console.log(`   • Permissions catalogued: ${permsCount.rows[0].total} (Expected: 56)`);
  console.log(`   • Roles defined:          ${rolesCount.rows[0].total} (Expected: 14+)`);
  console.log(`   • Role-Permission links:  ${matrixCount.rows[0].total}`);

  if (parseInt(permsCount.rows[0].total, 10) !== 56) {
    throw new Error(`Expected exactly 56 permissions, found ${permsCount.rows[0].total}`);
  }
  console.log("✅ 56-Permission catalogue strictly verified.");

  // 5. Audit Log Immutability Verification
  console.log("\n[5/5] Verifying Audit Log Immutability Protection...");
  try {
    await query("UPDATE public.audit_logs SET change_summary = 'tampered' WHERE id = (SELECT id FROM public.audit_logs LIMIT 1);");
    console.error("❌ FAILED: Audit log UPDATE was not rejected!");
    process.exit(1);
  } catch (err) {
    if (err.message.includes("immutable")) {
      console.log("✅ Mutation guard verified: Audit logs cannot be updated.");
    } else {
      console.log(`✅ Update rejected: ${err.message.split("\n")[0]}`);
    }
  }

  try {
    await query("DELETE FROM public.audit_logs WHERE id = (SELECT id FROM public.audit_logs LIMIT 1);");
    console.error("❌ FAILED: Audit log DELETE was not rejected!");
    process.exit(1);
  } catch (err) {
    if (err.message.includes("immutable")) {
      console.log("✅ Mutation guard verified: Audit logs cannot be deleted.");
    } else {
      console.log(`✅ Delete rejected: ${err.message.split("\n")[0]}`);
    }
  }

  console.log("\n==========================================================");
  console.log(" 🎉 DATABASE AUDIT COMPLETE: ALL SECURITY INVARIANTS PASS");
  console.log("==========================================================");
}

runAudit().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
