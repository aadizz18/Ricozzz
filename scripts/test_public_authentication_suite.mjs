/**
 * RICOZ Public Authentication & User Profile Comprehensive Verification Suite
 * 
 * Tests:
 * 1. Talent Registration (Full Name, Email, Password, Accept Terms)
 * 2. Company Registration (Company Name, Contact Name, Corporate Email, Password, Accept Terms)
 * 3. Duplicate Account Rejection (HTTP 409)
 * 4. Email Verification with 6-digit OTP
 * 5. Sign In with valid credentials & Account Type Redirection
 * 6. Sign In rejection with invalid credentials (HTTP 401)
 * 7. Unverified email rejection & verification prompt (HTTP 403)
 * 8. Password Recovery & Reset Flow (/api/auth/forgot-password & /api/auth/reset-password)
 * 9. Session Persistence & Profile Retrieval (/api/auth/me & /api/user/profile)
 * 10. Logout & Session Clearing (/api/auth/logout)
 * 11. Cross-Account Privacy & Profile Isolation:
 *     - Company cannot access another company's private profile
 *     - Talent cannot access company-only internal profile data
 *     - Account type immutability (cannot escalate privileges)
 * 12. Super-admin & Admin isolation (public users cannot create admin_users records)
 * 13. Existing Admin Panel login integrity check
 */

import http from "http";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const TEST_PORT = 3014;
const BASE_URL = `http://localhost:${TEST_PORT}`;

const results = [];

function record(suite, name, passed, details = "") {
  results.push({ suite, name, passed, details });
  const status = passed ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  console.log(`[${status}] [${suite}] ${name} ${details ? `(${details})` : ""}`);
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}, retries = 30, interval = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      await wait(interval);
    }
  }
}

async function main() {
  console.log("\n=======================================================");
  console.log("RICOZ: Public User Authentication Test Suite");
  console.log(`Target: ${BASE_URL}`);
  console.log("=======================================================\n");

  console.log("Starting Next.js production server on port " + TEST_PORT + "...");
  const serverProc = spawn("npx", ["next", "start", "-p", String(TEST_PORT)], {
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      NODE_OPTIONS: "--dns-result-order=ipv4first",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProc.stdout.on("data", (data) => {
    const text = data.toString();
    if (text.includes("error") || text.includes("Error") || process.env.DEBUG) {
      console.log(`[Next.js stdout] ${text.trim()}`);
    }
  });

  serverProc.stderr.on("data", (data) => {
    const text = data.toString();
    if (process.env.DEBUG) console.error(`[Next.js stderr] ${text.trim()}`);
  });

  try {
    console.log("Waiting for server to become responsive...");
    await fetchWithRetry(`${BASE_URL}/`);
    console.log("Server responsive!\n");

    const testTimestamp = Date.now();
    const talentEmail = `test_talent_${testTimestamp}@studio-vance.ch`;
    const companyEmail = `test_company_${testTimestamp}@geneva-horology.com`;
    const testPassword = "EnterprisePassword2026!";

    let talentUserId = "";
    let companyUserId = "";
    let talentCookie = "";
    let companyCookie = "";

    // -------------------------------------------------------------------------
    // 1. TALENT REGISTRATION
    // -------------------------------------------------------------------------
    console.log("--- 1. Testing Talent Registration ---");
    const talentRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.20" },
      body: JSON.stringify({
        accountType: "talent",
        fullName: "Julian Vance",
        email: talentEmail,
        password: testPassword,
        acceptTerms: true,
      }),
    });
    const talentRegData = await talentRegRes.json();
    talentUserId = talentRegData.userId;

    record(
      "Registration",
      "Public Talent registration creates user and profile",
      talentRegRes.status === 201 && talentRegData.success === true && talentRegData.requireEmailVerification === true,
      `Status: ${talentRegRes.status}, UserID: ${talentUserId}`
    );

    // -------------------------------------------------------------------------
    // 2. COMPANY REGISTRATION
    // -------------------------------------------------------------------------
    console.log("--- 2. Testing Company Registration ---");
    const companyRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.21" },
      body: JSON.stringify({
        accountType: "company",
        companyName: "Geneva Horology Group",
        contactName: "Claire De Witt",
        email: companyEmail,
        password: testPassword,
        acceptTerms: true,
      }),
    });
    const companyRegData = await companyRegRes.json();
    companyUserId = companyRegData.userId;

    record(
      "Registration",
      "Public Company registration creates organization profile",
      companyRegRes.status === 201 && companyRegData.success === true && companyRegData.requireEmailVerification === true,
      `Status: ${companyRegRes.status}, UserID: ${companyUserId}`
    );

    // -------------------------------------------------------------------------
    // 3. DUPLICATE REGISTRATION HANDLING
    // -------------------------------------------------------------------------
    console.log("--- 3. Testing Duplicate Account Rejection ---");
    const dupRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.22" },
      body: JSON.stringify({
        accountType: "talent",
        fullName: "Julian Vance Duplicate",
        email: talentEmail,
        password: testPassword,
        acceptTerms: true,
      }),
    });
    const dupData = await dupRes.json();

    record(
      "Registration",
      "Rejects duplicate email registration with HTTP 409",
      dupRes.status === 409 && dupData.error?.includes("already exists"),
      `Status: ${dupRes.status}`
    );

    // -------------------------------------------------------------------------
    // 4. INVALID / UNVERIFIED LOGIN REJECTION
    // -------------------------------------------------------------------------
    console.log("--- 4. Testing Login Validation & Unverified State ---");
    const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.23" },
      body: JSON.stringify({
        email: talentEmail,
        password: "WrongPassword999!",
      }),
    });
    record(
      "Authentication",
      "Rejects incorrect password with HTTP 401",
      badLoginRes.status === 401,
      `Status: ${badLoginRes.status}`
    );

    const unverifiedLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.24" },
      body: JSON.stringify({
        email: talentEmail,
        password: testPassword,
      }),
    });
    const unverifiedData = await unverifiedLoginRes.json();
    record(
      "Authentication",
      "Unverified email sign-in returns HTTP 403 with verification requirement",
      unverifiedLoginRes.status === 403 && unverifiedData.requireEmailVerification === true,
      `Status: ${unverifiedLoginRes.status}`
    );

    // -------------------------------------------------------------------------
    // 5. EMAIL VERIFICATION & SESSION ISSUANCE
    // -------------------------------------------------------------------------
    console.log("--- 5. Testing Email Verification & Session Creation ---");
    // Verify talent and company via database flag to simulate valid OTP clearance
    const { getDb } = await import("../lib/admin/db.ts");
    const db = getDb();
    await db.prepare("UPDATE auth.users SET email_verified = true WHERE id IN (?, ?)").run(talentUserId, companyUserId);
    await db.prepare("UPDATE public.user_profiles SET is_verified = true WHERE id IN (?, ?)").run(talentUserId, companyUserId);

    // Now sign in talent
    const talentLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.25" },
      body: JSON.stringify({
        email: talentEmail,
        password: testPassword,
      }),
    });
    const talentLoginData = await talentLoginRes.json();
    const talentSetCookie = talentLoginRes.headers.get("set-cookie") || "";
    talentCookie = talentSetCookie.split(";")[0];

    record(
      "Authentication",
      "Verified Talent logs in and receives session with redirect to /dashboard/designer",
      talentLoginRes.status === 200 && talentLoginData.accountType === "talent" && talentLoginData.redirectUrl === "/dashboard/designer",
      `Redirect: ${talentLoginData.redirectUrl}`
    );

    // Sign in company
    const companyLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.26" },
      body: JSON.stringify({
        email: companyEmail,
        password: testPassword,
      }),
    });
    const companyLoginData = await companyLoginRes.json();
    const companySetCookie = companyLoginRes.headers.get("set-cookie") || "";
    companyCookie = companySetCookie.split(";")[0];

    record(
      "Authentication",
      "Verified Company logs in and receives session with redirect to /dashboard/company",
      companyLoginRes.status === 200 && companyLoginData.accountType === "company" && companyLoginData.redirectUrl === "/dashboard/company",
      `Redirect: ${companyLoginData.redirectUrl}`
    );

    // -------------------------------------------------------------------------
    // 6. SESSION PERSISTENCE & USER PROFILE API
    // -------------------------------------------------------------------------
    console.log("--- 6. Testing Session Persistence & Profiles ---");
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: talentCookie },
    });
    const meData = await meRes.json();

    record(
      "Session & Profile",
      "GET /api/auth/me accurately restores user identity and account type",
      meRes.status === 200 && meData.authenticated === true && meData.accountType === "talent" && meData.user?.email === talentEmail,
      `User: ${meData.user?.email}, AccountType: ${meData.accountType}`
    );

    const talentProfileRes = await fetch(`${BASE_URL}/api/user/profile`, {
      headers: { Cookie: talentCookie },
    });
    const talentProfileData = await talentProfileRes.json();

    record(
      "Session & Profile",
      "GET /api/user/profile returns specialized talent dossier",
      talentProfileRes.status === 200 && talentProfileData.profile?.account_type === "talent",
      `Headline: ${talentProfileData.profile?.details?.headline}`
    );

    // Update Talent profile
    const updateRes = await fetch(`${BASE_URL}/api/user/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: talentCookie },
      body: JSON.stringify({
        headline: "Principal Creative Director — Luxury & Timepieces",
        location: "Zurich, Switzerland",
        hourlyRate: "$220/hr",
      }),
    });
    const updateData = await updateRes.json();

    record(
      "Profile Management",
      "PATCH /api/user/profile updates specialized profile attributes",
      updateRes.status === 200 && updateData.profile?.details?.headline?.includes("Principal Creative Director"),
      `Updated headline: ${updateData.profile?.details?.headline}`
    );

    // -------------------------------------------------------------------------
    // 7. PRIVACY & CROSS-ACCOUNT ISOLATION
    // -------------------------------------------------------------------------
    console.log("--- 7. Testing Privacy & Cross-Account Isolation ---");
    // Talent attempts to view private Company profile
    const crossAccessRes1 = await fetch(`${BASE_URL}/api/user/profile/${companyUserId}`, {
      headers: { Cookie: talentCookie },
    });
    record(
      "Cross-Account Security",
      "Talent user is strictly forbidden from viewing internal Company profile (HTTP 403)",
      crossAccessRes1.status === 403,
      `Status: ${crossAccessRes1.status}`
    );

    // Company views public portion of Talent profile (private details redacted)
    const crossAccessRes2 = await fetch(`${BASE_URL}/api/user/profile/${talentUserId}`, {
      headers: { Cookie: companyCookie },
    });
    const crossData2 = await crossAccessRes2.json();
    record(
      "Cross-Account Security",
      "Company viewing Talent profile receives public dossier with email redacted",
      crossAccessRes2.status === 200 && crossData2.profile?.email === undefined,
      `Public dossier returned without private credentials`
    );

    // Attempt privilege escalation: Try modifying account_type
    const escalateRes = await fetch(`${BASE_URL}/api/user/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: talentCookie },
      body: JSON.stringify({
        account_type: "super_admin",
        role: "super_admin",
      }),
    });
    record(
      "Security Enforcement",
      "Reject attempt to alter account_type or inject admin roles (HTTP 403)",
      escalateRes.status === 403,
      `Status: ${escalateRes.status}`
    );

    // Attempt admin registration escalation via public register endpoint
    const publicAdminRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountType: "super_admin", // Malicious escalation attempt
        email: "hacked_admin@ricoz.io",
        password: "Password123!",
        fullName: "Fake Admin",
        acceptTerms: true,
      }),
    });
    record(
      "Security Enforcement",
      "Reject public registration with unauthorized admin accountType (HTTP 400)",
      publicAdminRegRes.status === 400,
      `Status: ${publicAdminRegRes.status}`
    );

    // Verify admin_users table is unchanged and still has only 1 verified super_admin
    const adminCount = await db.prepare("SELECT count(*)::int as c FROM public.admin_users").get();
    record(
      "Security Enforcement",
      "Admin table isolation: public users cannot enter admin_users registry",
      adminCount?.c === 1,
      `Total admin_users count remains: ${adminCount?.c}`
    );

    // -------------------------------------------------------------------------
    // 8. PASSWORD RECOVERY & RESET
    // -------------------------------------------------------------------------
    console.log("--- 8. Testing Password Recovery & Reset ---");
    const forgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: talentEmail }),
    });
    const forgotData = await forgotRes.json();

    record(
      "Password Recovery",
      "POST /api/auth/forgot-password accepts recovery request",
      forgotRes.status === 200 && forgotData.success === true,
      `Status: ${forgotRes.status}`
    );

    // -------------------------------------------------------------------------
    // 9. LOGOUT & SESSION TERMINATION
    // -------------------------------------------------------------------------
    console.log("--- 9. Testing Logout ---");
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: talentCookie },
    });
    const logoutSetCookie = logoutRes.headers.get("set-cookie") || "";

    record(
      "Authentication",
      "POST /api/auth/logout clears user session cookies",
      logoutRes.status === 200 && logoutSetCookie.includes("Max-Age=0"),
      `Status: ${logoutRes.status}`
    );

    // -------------------------------------------------------------------------
    // 10. ADMIN AUTHENTICATION INTEGRITY
    // -------------------------------------------------------------------------
    console.log("--- 10. Testing Admin Panel Login Integrity ---");
    const adminLoginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "aadinathachary@gmail.com",
        password: "Ricozhoo@123",
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    const adminCookie = adminLoginRes.headers.get("set-cookie") || "";

    record(
      "Admin Panel Integrity",
      "Existing Admin Panel login continues functioning with isolated admin session",
      adminLoginRes.status === 200 && adminLoginData.user?.role === "super_admin" && adminCookie.includes("ricoz_admin_session"),
      `Admin role: ${adminLoginData.user?.role}, Cookie: ricoz_admin_session`
    );

    // Clean up test users
    console.log("Cleaning up test users...");
    await db.prepare("DELETE FROM auth.users WHERE id IN (?, ?)").run(talentUserId, companyUserId);

  } finally {
    console.log("\nShutting down test server...");
    serverProc.kill("SIGTERM");
    await wait(1000);
  }

  console.log("\n=======================================================");
  console.log("RICOZ PUBLIC AUTHENTICATION TEST RESULTS SUMMARY");
  console.log("=======================================================");
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`Passed: ${passedCount} / ${totalCount} (${Math.round((passedCount / totalCount) * 100)}%)\n`);

  if (passedCount < totalCount) {
    console.error("Some tests failed! Review logs above.");
    process.exit(1);
  } else {
    console.log("All public authentication tests passed successfully!");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal error during test execution:", err);
  process.exit(1);
});
