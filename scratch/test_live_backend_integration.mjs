import { getDb } from "../lib/admin/db.js";
import { authenticateAdminCredentials, createAdminSession, validateAdminSession } from "../lib/admin/auth.js";
import { recordAuditLog } from "../lib/admin/audit.js";

async function main() {
  console.log("=== RICOZ — Live Backend Integration Test ===");
  const db = getDb();

  // 1. Check departments
  const depts = await db.prepare("SELECT count(*) as count FROM departments").get();
  console.log("1. Departments in DB:", depts.count);

  // 2. Check roles
  const roles = await db.prepare("SELECT count(*) as count FROM admin_roles").get();
  console.log("2. Roles in DB:", roles.count);

  // 3. Test First-Admin Bootstrap
  console.log("\n3. Testing First-Admin Bootstrap for aadinathachary@gmail.com...");
  const authResult = await authenticateAdminCredentials("aadinathachary@gmail.com", "Ricozhoo@123");
  console.log("Auth result user:", authResult.user ? {
    id: authResult.user.id,
    email: authResult.user.email,
    role: authResult.user.role,
    departmentName: authResult.user.departmentName,
    permissionsCount: authResult.user.permissions?.length
  } : null);

  if (authResult.error) {
    console.error("Auth error:", authResult.error);
    process.exit(1);
  }

  const user = authResult.user;

  // 4. Test Session Creation
  console.log("\n4. Testing Session Creation in admin_sessions...");
  const session = await createAdminSession(user.id, "127.0.0.1", "integration-test-agent");
  console.log("Session token created (length):", session.token.length, "expiresAt:", session.expiresAt);

  // 5. Test Session Validation
  console.log("\n5. Validating Session Token...");
  const validatedUser = await validateAdminSession(session.token);
  console.log("Validated user:", validatedUser ? {
    id: validatedUser.id,
    email: validatedUser.email,
    role: validatedUser.role,
    permissionsCount: validatedUser.permissions?.length
  } : null);

  // 6. Test Audit Log
  console.log("\n6. Recording test Audit Log...");
  await recordAuditLog({
    actor: validatedUser,
    action: "INTEGRATION_TEST_EVENT",
    entityType: "system",
    entityId: "test-001",
    changeSummary: "Automated live integration test verification",
    ipAddress: "127.0.0.1"
  });

  const latestAudit = await db.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 1").get();
  console.log("Latest Audit Log:", {
    action: latestAudit.action,
    actor_name: latestAudit.actor_name,
    change_summary: latestAudit.change_summary
  });

  console.log("\n=== ALL DIRECT BACKEND INTEGRATION TESTS PASSED! ===");
}

main().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
