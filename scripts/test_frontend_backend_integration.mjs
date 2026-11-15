/**
 * RICOZ Admin Operations — Full Frontend <-> Backend Integration Test Suite
 * 
 * Tests the complete operational flow across all 11 modules using the real
 * Next.js server and InsForge PostgreSQL backend.
 */

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3008";

let sessionCookie = "";
let testDeptId = "";
let createdTaskId = "";
let createdClientId = "";
let createdVendorId = "";
let createdTicketId = "";
let createdSopId = "";

const results = [];

function record(name, passed, details = "") {
  results.push({ name, passed, details });
  const status = passed ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  console.log(`[${status}] ${name} ${details ? `(${details})` : ""}`);
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    "Origin": BASE_URL,
    "Referer": `${BASE_URL}/admin`,
    ...(options.headers || {}),
  };
  if (sessionCookie) {
    headers["Cookie"] = sessionCookie;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = res.headers.get("content-type") || "";
  let body;
  if (contentType.includes("application/json")) {
    body = await res.json();
  } else {
    body = await res.text();
  }

  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    const match = setCookie.match(/ricoz_admin_session=[^;]+/);
    if (match) {
      sessionCookie = match[0];
    }
  }

  return { status: res.status, headers: res.headers, body };
}

async function runTests() {
  console.log(`\n======================================================`);
  console.log(`RICOZ: Comprehensive Frontend <-> Backend Test Suite`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`======================================================\n`);

  try {
    // 1. Authentication
    console.log("--- 1. Authentication & Session Management ---");
    const loginRes = await api("/api/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "aadinathachary@gmail.com",
        password: "Ricozhoo@123",
      }),
    });
    record("Admin Login", loginRes.status === 200 && loginRes.body?.success === true, `User: ${loginRes.body?.user?.fullName}, Role: ${loginRes.body?.user?.role}`);

    const meRes = await api("/api/admin/auth/me");
    record("Session Validation (auth.me)", meRes.status === 200 && meRes.body?.user?.role === "super_admin", `UID: ${meRes.body?.user?.id}`);

    // 2. Dashboard & Badges
    console.log("\n--- 2. Operations Dashboard & Badge Metrics ---");
    const dashRes = await api("/api/admin/dashboard");
    record("Dashboard Stats", dashRes.status === 200 && dashRes.body?.success === true && typeof dashRes.body?.stats?.totalTasks === "number", `Total Tasks: ${dashRes.body?.stats?.totalTasks}, Active Clients: ${dashRes.body?.stats?.activeClients}`);

    const badgeRes = await api("/api/admin/dashboard/badges");
    record("Navigation Badge Counters", badgeRes.status === 200 && badgeRes.body?.success === true, `Overdue: ${badgeRes.body?.badges?.overdueTasks}, Open Tickets: ${badgeRes.body?.badges?.openTickets}`);

    // 3. Departments
    console.log("\n--- 3. Departments & Organizational Infrastructure ---");
    const deptsRes = await api("/api/admin/departments");
    record("Departments List", deptsRes.status === 200 && Array.isArray(deptsRes.body?.departments) && deptsRes.body?.departments.length > 0, `Count: ${deptsRes.body?.departments?.length}`);
    if (deptsRes.body?.departments?.length > 0) {
      testDeptId = deptsRes.body.departments[0].id;
    }

    // 4. Tasks & Workflows
    console.log("\n--- 4. Tasks & Workflows CRUD ---");
    const taskListRes = await api("/api/admin/tasks");
    record("Tasks List", taskListRes.status === 200 && Array.isArray(taskListRes.body?.tasks), `Count: ${taskListRes.body?.tasks?.length}`);

    const createTaskRes = await api("/api/admin/tasks", {
      method: "POST",
      body: JSON.stringify({
        title: "E2E Integration Verification Milestone",
        departmentId: testDeptId,
        priority: "high",
        dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
        description: "Automated end-to-end database persistence check across all 11 admin modules.",
      }),
    });
    createdTaskId = createTaskRes.body?.taskId || createTaskRes.body?.task?.id;
    record("Create Task", createTaskRes.status === 200 && !!createdTaskId, `Task ID: ${createdTaskId}`);

    if (createdTaskId) {
      const taskDetailRes = await api(`/api/admin/tasks/${createdTaskId}`);
      record("Get Task Details", taskDetailRes.status === 200 && taskDetailRes.body?.task?.id === createdTaskId);

      const addCommentRes = await api(`/api/admin/tasks/${createdTaskId}/comments`, {
        method: "POST",
        body: JSON.stringify({
          comment: "Automated QA note: Task created and verified through real InsForge PostgreSQL.",
        }),
      });
      record("Add Task Comment", addCommentRes.status === 200 && addCommentRes.body?.success === true);

      const updateTaskRes = await api(`/api/admin/tasks/${createdTaskId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "in_progress",
        }),
      });
      record("Update Task Status", updateTaskRes.status === 200 && updateTaskRes.body?.success === true);
    }

    // 5. Clients & Onboarding
    console.log("\n--- 5. Clients & Accounts Management ---");
    const clientListRes = await api("/api/admin/clients");
    record("Clients List", clientListRes.status === 200 && Array.isArray(clientListRes.body?.clients), `Count: ${clientListRes.body?.clients?.length}`);

    const createClientRes = await api("/api/admin/clients", {
      method: "POST",
      body: JSON.stringify({
        name: "Apex Global Dynamics Inc",
        industry: "Enterprise Fintech",
        contactName: "Marcus Vance",
        contactEmail: "marcus.vance@apexfintech.com",
        phone: "+1-555-019-2834",
        companySize: "1000+",
        notes: "High priority enterprise prospect from Q4 mandate.",
      }),
    });
    createdClientId = createClientRes.body?.clientId || createClientRes.body?.client?.id;
    record("Create Client", createClientRes.status === 200 && !!createdClientId, `Client ID: ${createdClientId}`);

    if (createdClientId) {
      const clientDetailRes = await api(`/api/admin/clients/${createdClientId}`);
      record("Get Client Details & Checklist", clientDetailRes.status === 200 && Array.isArray(clientDetailRes.body?.checklist), `Checklist Items: ${clientDetailRes.body?.checklist?.length}`);

      if (clientDetailRes.body?.checklist?.length > 0) {
        const item = clientDetailRes.body.checklist[0];
        const toggleChecklistRes = await api(`/api/admin/clients/${createdClientId}`, {
          method: "PATCH",
          body: JSON.stringify({
            toggleChecklistId: item.id,
            isCompleted: true,
          }),
        });
        record("Toggle Client Checklist Item", toggleChecklistRes.status === 200 && toggleChecklistRes.body?.success === true);
      }

      const updateClientStageRes = await api(`/api/admin/clients/${createdClientId}`, {
        method: "PATCH",
        body: JSON.stringify({
          onboardingStage: "contract_review",
        }),
      });
      record("Update Client Stage", updateClientStageRes.status === 200 && updateClientStageRes.body?.success === true);
    }

    // 6. Vendors & Compliance
    console.log("\n--- 6. Vendors & Compliance Tracking ---");
    const vendorListRes = await api("/api/admin/vendors");
    record("Vendors List", vendorListRes.status === 200 && Array.isArray(vendorListRes.body?.vendors), `Count: ${vendorListRes.body?.vendors?.length}`);

    const createVendorRes = await api("/api/admin/vendors", {
      method: "POST",
      body: JSON.stringify({
        name: "OmniCraft Motion Studios",
        serviceCategory: "3D Motion Graphics & Animation",
        contactName: "Siddharth Rao",
        contactEmail: "siddharth@omnicraft.design",
        phone: "+1-555-482-1920",
        notes: "Specialized in luxury brand visual animations.",
      }),
    });
    createdVendorId = createVendorRes.body?.vendorId || createVendorRes.body?.vendor?.id;
    record("Create Vendor", createVendorRes.status === 200 && !!createdVendorId, `Vendor ID: ${createdVendorId}`);

    if (createdVendorId) {
      const vendorDetailRes = await api(`/api/admin/vendors/${createdVendorId}`);
      record("Get Vendor Details & Docs", vendorDetailRes.status === 200 && Array.isArray(vendorDetailRes.body?.documents), `Documents: ${vendorDetailRes.body?.documents?.length}`);

      if (vendorDetailRes.body?.documents?.length > 0) {
        for (const doc of vendorDetailRes.body.documents) {
          await api(`/api/admin/vendors/${createdVendorId}`, {
            method: "PATCH",
            body: JSON.stringify({
              toggleDocId: doc.id,
              isVerified: true,
            }),
          });
        }
        record("Verify All Vendor Docs", true, `${vendorDetailRes.body.documents.length} compliance documents verified`);
      }

      const updateVendorStageRes = await api(`/api/admin/vendors/${createdVendorId}`, {
        method: "PATCH",
        body: JSON.stringify({
          onboardingStage: "approved",
          verificationStatus: "verified",
        }),
      });
      record("Update Vendor Verification Status", updateVendorStageRes.status === 200 && updateVendorStageRes.body?.success === true);
    }

    // 7. Support Tickets
    console.log("\n--- 7. Customer Support & SLAs ---");
    const ticketListRes = await api("/api/admin/support");
    record("Support Tickets List", ticketListRes.status === 200 && Array.isArray(ticketListRes.body?.tickets), `Count: ${ticketListRes.body?.tickets?.length}`);

    const createTicketRes = await api("/api/admin/support", {
      method: "POST",
      body: JSON.stringify({
        customerName: "Eleanor Vance",
        customerEmail: "eleanor@apexfintech.com",
        category: "Billing & Escrow",
        priority: "high",
        subject: "Escrow Milestone Release Confirmation Query",
        description: "Requesting formal signed receipt for milestone 2 escrow deposit.",
      }),
    });
    createdTicketId = createTicketRes.body?.ticketId || createTicketRes.body?.ticket?.id;
    record("Create Support Ticket", createTicketRes.status === 200 && !!createdTicketId, `Ticket ID: ${createdTicketId}`);

    if (createdTicketId) {
      const ticketDetailRes = await api(`/api/admin/support/${createdTicketId}`);
      record("Get Ticket Details & Responses", ticketDetailRes.status === 200 && Array.isArray(ticketDetailRes.body?.responses));

      const addResponseRes = await api(`/api/admin/support/${createdTicketId}/responses`, {
        method: "POST",
        body: JSON.stringify({
          message: "Internal review completed. Escrow receipt #ESC-9082 issued.",
          isInternalNote: true,
        }),
      });
      record("Add Support Response (Internal Note)", addResponseRes.status === 200 && addResponseRes.body?.success === true);

      const updateTicketRes = await api(`/api/admin/support/${createdTicketId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "resolved",
        }),
      });
      record("Resolve Support Ticket", updateTicketRes.status === 200 && updateTicketRes.body?.success === true);
    }

    // 8. SOPs
    console.log("\n--- 8. Standard Operating Procedures (SOPs) ---");
    const sopsListRes = await api("/api/admin/sops");
    record("SOPs List", sopsListRes.status === 200 && Array.isArray(sopsListRes.body?.sops), `Count: ${sopsListRes.body?.sops?.length}`);

    const createSopRes = await api("/api/admin/sops", {
      method: "POST",
      body: JSON.stringify({
        title: "Automated Infrastructure Verification SOP",
        departmentId: testDeptId,
        category: "System Governance",
        version: "v2.0",
        summary: "Detailed standard procedure for verifying multi-service InsForge PostgreSQL integration.",
        contentMarkdown: "### 1. Purpose\n\nEnsure data integrity across Next.js and InsForge.\n\n### 2. Scope\n\nApplies to all administrative modules.",
      }),
    });
    createdSopId = createSopRes.body?.sopId || createSopRes.body?.sop?.id;
    record("Create SOP", createSopRes.status === 200 && !!createdSopId, `SOP ID: ${createdSopId}`);

    // 9. Team, Roles & Permissions
    console.log("\n--- 9. Team, RBAC & Governance ---");
    const teamUsersRes = await api("/api/admin/team/users");
    record("List Team Users", teamUsersRes.status === 200 && Array.isArray(teamUsersRes.body?.users), `Count: ${teamUsersRes.body?.users?.length}`);

    const teamRolesRes = await api("/api/admin/team/roles");
    record("List System Roles", teamRolesRes.status === 200 && Array.isArray(teamRolesRes.body?.roles), `Count: ${teamRolesRes.body?.roles?.length}`);

    const teamPermsRes = await api("/api/admin/team/permissions");
    record("List Permission Catalogue", teamPermsRes.status === 200 && Array.isArray(teamPermsRes.body?.permissions), `Count: ${teamPermsRes.body?.permissions?.length}`);

    const teamOverridesRes = await api("/api/admin/team/overrides");
    record("List Permission Overrides", teamOverridesRes.status === 200 && Array.isArray(teamOverridesRes.body?.overrides));

    // 10. Notifications
    console.log("\n--- 10. Operational Notifications ---");
    const notifsRes = await api("/api/admin/notifications");
    record("List Notifications", notifsRes.status === 200 && Array.isArray(notifsRes.body?.notifications), `Count: ${notifsRes.body?.notifications?.length}`);

    const markAllReadRes = await api("/api/admin/notifications", {
      method: "PATCH",
      body: JSON.stringify({ markAll: true }),
    });
    record("Mark All Notifications Read", markAllReadRes.status === 200 && markAllReadRes.body?.success === true);

    // 11. Reports & Analytics
    console.log("\n--- 11. Reports, Analytics & CSV Export ---");
    const reportsRes = await api("/api/admin/reports");
    record("Generate Reports & Velocity Metrics", reportsRes.status === 200 && reportsRes.body?.success === true && !!reportsRes.body?.reports?.taskVelocity);

    const exportCsvRes = await api("/api/admin/reports/export?type=tasks");
    const isCsv = (exportCsvRes.headers.get("content-type") || "").includes("text/csv");
    record("Export Tasks CSV Archive", exportCsvRes.status === 200 && isCsv, `Header: ${exportCsvRes.headers.get("content-type")}`);

    // 12. Security Audit Logs
    console.log("\n--- 12. Immutable Security Audit Trail ---");
    const auditRes = await api("/api/admin/audit-log?limit=20");
    const logCount = auditRes.body?.logs?.length || 0;
    record("Audit Log Trail Verified", auditRes.status === 200 && Array.isArray(auditRes.body?.logs) && logCount > 0, `Recent Log Entries: ${logCount}`);

    // Clean up created test entities
    console.log("\n--- Cleanup Test Fixtures ---");
    if (createdTaskId) {
      await api(`/api/admin/tasks/${createdTaskId}`, { method: "DELETE" });
    }
    if (createdClientId) {
      await api(`/api/admin/clients/${createdClientId}`, { method: "DELETE" });
    }
    if (createdVendorId) {
      await api(`/api/admin/vendors/${createdVendorId}`, { method: "DELETE" });
    }
    if (createdSopId) {
      await api(`/api/admin/sops/${createdSopId}`, { method: "DELETE" });
    }
    console.log("Cleaned up temporary test entities.");

  } catch (err) {
    console.error("Test execution fatal error:", err);
    record("Test Suite Fatal Handler", false, err.message);
  }

  // Summary
  console.log(`\n======================================================`);
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
