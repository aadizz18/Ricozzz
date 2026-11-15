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

const BASE_URL = "http://localhost:3005";

function assert(condition, message, detail = "") {
  if (!condition) {
    console.error(`❌ FAILED: ${message} ${detail}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runSecurityTests() {
  console.log("==========================================================");
  console.log(" RICOZ — Unauthorized Access & Security Boundary Verification");
  console.log("==========================================================");

  // 1. Missing Cookie -> 401
  const noCookieRes = await fetch(`${BASE_URL}/api/admin/tasks`);
  assert(noCookieRes.status === 401, "Missing session cookie returns 401 Unauthorized");

  // 2. Short/Malformed Cookie -> 401
  const malformedRes = await fetch(`${BASE_URL}/api/admin/tasks`, {
    headers: { Cookie: "ricoz_admin_session=invalid" },
  });
  assert(malformedRes.status === 401, "Malformed session cookie returns 401 Unauthorized");

  // 3. High-entropy but non-existent forged session token -> 401
  const forgedToken = "a".repeat(64);
  const forgedRes = await fetch(`${BASE_URL}/api/admin/tasks`, {
    headers: { Cookie: `ricoz_admin_session=${forgedToken}` },
  });
  assert(forgedRes.status === 401, "Forged non-existent session token returns 401 Unauthorized");

  // 4. Authenticate as Super Admin to test CSRF and mutation boundaries
  const loginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE_URL },
    body: JSON.stringify({
      email: "aadinathachary@gmail.com",
      password: "Ricozhoo@123",
    }),
  });
  assert(loginRes.status === 200, "Super admin login succeeds");
  const cookie = loginRes.headers.get("set-cookie").split(";")[0];

  // 5. CSRF Origin Mismatch -> 403 Forbidden
  const csrfAttackRes = await fetch(`${BASE_URL}/api/admin/tasks`, {
    method: "POST",
    headers: {
      Cookie: cookie,
      Origin: "https://evil-attacker.example.com",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title: "Attacker Task" }),
  });
  assert(csrfAttackRes.status === 403, "Cross-Origin CSRF attack blocked with 403 Forbidden");

  // 6. SQL Injection Attempt in API Parameters -> Safely Rejected with 400 Bad Request
  const sqliRes = await fetch(`${BASE_URL}/api/admin/tasks?departmentId=' OR '1'='1`, {
    headers: { Cookie: cookie, Origin: BASE_URL },
  });
  assert(sqliRes.status === 400, "SQL injection string in parameter safely rejected with 400 Bad Request");

  // 7. Self-Suspension Attempt -> 403 Forbidden
  const meRes = await fetch(`${BASE_URL}/api/admin/auth/me`, {
    headers: { Cookie: cookie, Origin: BASE_URL },
  });
  const meData = await meRes.json();
  const myUserId = meData.user.id;

  const suspendSelfRes = await fetch(`${BASE_URL}/api/admin/team/users/${myUserId}`, {
    method: "PATCH",
    headers: { Cookie: cookie, Origin: BASE_URL, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "suspended" }),
  });
  assert(suspendSelfRes.status === 403, "Self-suspension of Super Admin blocked with 403 Forbidden");

  console.log("\n==========================================================");
  console.log(" 🎉 ALL SECURITY & UNAUTHORIZED ACCESS TESTS PASSED!");
  console.log("==========================================================");
}

runSecurityTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
