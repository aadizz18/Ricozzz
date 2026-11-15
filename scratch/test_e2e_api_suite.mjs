const BASE_URL = "http://localhost:3005";

let sessionCookie = "";

function assert(condition, message, detail = "") {
  if (!condition) {
    console.error(`❌ FAILED: ${message} ${detail ? `(${detail})` : ""}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function run() {
  console.log("==========================================================");
  console.log(" RICOZ — Comprehensive Live End-to-End API Integration Suite");
  console.log("==========================================================\n");

  // 1. Security Check: Unauthenticated request must return 401
  console.log("--- 1. Testing Unauthenticated Request Security ---");
  const unauthRes = await fetch(`${BASE_URL}/api/admin/tasks`);
  assert(unauthRes.status === 401, "Unauthenticated GET /api/admin/tasks returns 401 Unauthorized", `Status: ${unauthRes.status}`);

  // 2. Authentication: First-Admin Login
  console.log("\n--- 2. Testing Administrative Authentication ---");
  const loginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "aadinathachary@gmail.com",
      password: "Ricozhoo@123",
    }),
  });

  assert(loginRes.status === 200, "Login returns HTTP 200", `Status: ${loginRes.status}`);
  const loginData = await loginRes.json();
  assert(loginData.success === true, "Login response success = true");
  assert(loginData.user?.role === "super_admin", "Logged in user has super_admin role", `Role: ${loginData.user?.role}`);

  // Extract set-cookie
  const setCookieHeader = loginRes.headers.get("set-cookie");
  assert(Boolean(setCookieHeader), "set-cookie header returned by login response");
  sessionCookie = setCookieHeader.split(";")[0];
  console.log(`Extracted session cookie: ${sessionCookie.substring(0, 35)}...`);

  const authHeaders = {
    Cookie: sessionCookie,
    Origin: BASE_URL,
    "Content-Type": "application/json",
  };

  // 3. Identity Verification: GET /api/admin/auth/me
  console.log("\n--- 3. Verifying Session via /api/admin/auth/me ---");
  const meRes = await fetch(`${BASE_URL}/api/admin/auth/me`, { headers: authHeaders });
  assert(meRes.status === 200, "GET /api/admin/auth/me returns 200");
  const meData = await meRes.json();
  assert(meData.user?.email === "aadinathachary@gmail.com", "Session user matches logged-in identity");
  assert(meData.user?.permissions?.length === 56, "Super admin has all 56 catalogued permissions loaded");

  // 4. Departments
  console.log("\n--- 4. Testing Departments Module ---");
  const deptsRes = await fetch(`${BASE_URL}/api/admin/departments`, { headers: authHeaders });
  assert(deptsRes.status === 200, "GET /api/admin/departments returns 200");
  const deptsData = await deptsRes.json();
  assert(deptsData.departments?.length >= 10, "At least 10 departments returned", `Count: ${deptsData.departments?.length}`);
  const opsDept = deptsData.departments.find((d) => d.slug === "operations");
  assert(Boolean(opsDept), "Operations department exists in database");
  const targetDeptId = opsDept.id;

  // 5. Tasks Module (CRUD + Comments)
  console.log("\n--- 5. Testing Tasks Module ---");
  const createTaskRes = await fetch(`${BASE_URL}/api/admin/tasks`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      title: "Live Integration Test Task",
      description: "End-to-end task created via Next.js and InsForge PostgreSQL",
      departmentId: targetDeptId,
      priority: "high",
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    }),
  });
  const createTaskData = await createTaskRes.json();
  if (createTaskRes.status !== 200) {
    console.error("createTaskRes error body:", createTaskData);
  }
  assert(createTaskRes.status === 200, "POST /api/admin/tasks returns 200", `Status: ${createTaskRes.status}`);
  const createdTaskId = createTaskData.taskId || createTaskData.task?.id;
  assert(Boolean(createdTaskId), "Task created with UUID", createdTaskId);

  // Fetch tasks
  const getTasksRes = await fetch(`${BASE_URL}/api/admin/tasks`, { headers: authHeaders });
  const getTasksData = await getTasksRes.json();
  const foundTask = getTasksData.tasks?.find((t) => t.id === createdTaskId);
  assert(Boolean(foundTask), "Created task found in GET /api/admin/tasks list");
  assert(foundTask.priority === "high", "Task priority persisted accurately");

  // Update task
  const patchTaskRes = await fetch(`${BASE_URL}/api/admin/tasks/${createdTaskId}`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({
      status: "in_progress",
      blockerNote: "Testing blocker update",
    }),
  });
  const patchTaskData = await patchTaskRes.json();
  if (patchTaskRes.status !== 200) {
    console.error("patchTask error body:", patchTaskData);
  }
  assert(patchTaskRes.status === 200, "PATCH /api/admin/tasks/:id returns 200", `Status: ${patchTaskRes.status}`);

  // Add task comment
  const commentRes = await fetch(`${BASE_URL}/api/admin/tasks/${createdTaskId}/comments`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      comment: "Automated verification comment via test suite",
      isBlockerUpdate: false,
    }),
  });
  assert(commentRes.status === 200, "POST /api/admin/tasks/:id/comments returns 200");

  // 6. Clients Module
  console.log("\n--- 6. Testing Clients Module ---");
  const createClientRes = await fetch(`${BASE_URL}/api/admin/clients`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      name: "Acme Enterprise Global",
      industry: "Financial Technology",
      contactName: "Sarah Connor",
      contactEmail: "s.connor@acme-global.test",
      phone: "+1-555-0199",
      companySize: "100-500 employees",
      notes: "Prospective enterprise partner for design engineering",
    }),
  });
  assert(createClientRes.status === 200, "POST /api/admin/clients returns 200");
  const clientData = await createClientRes.json();
  const createdClientId = clientData.clientId;
  assert(Boolean(createdClientId), "Client created with UUID", createdClientId);

  const getClientsRes = await fetch(`${BASE_URL}/api/admin/clients`, { headers: authHeaders });
  const getClientsData = await getClientsRes.json();
  assert(getClientsData.clients?.some((c) => c.id === createdClientId), "Client present in GET /api/admin/clients");

  // 7. Vendors Module
  console.log("\n--- 7. Testing Vendors Module ---");
  const createVendorRes = await fetch(`${BASE_URL}/api/admin/vendors`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      name: "Starlight Visual Studios",
      serviceCategory: "3D Animation & VFX",
      contactName: "David Miller",
      contactEmail: "david@starlight-studios.test",
      phone: "+1-555-0144",
      notes: "Specialized VFX studio partner",
    }),
  });
  assert(createVendorRes.status === 200, "POST /api/admin/vendors returns 200");
  const vendorData = await createVendorRes.json();
  const createdVendorId = vendorData.vendorId;
  assert(Boolean(createdVendorId), "Vendor created with UUID", createdVendorId);

  const getVendorsRes = await fetch(`${BASE_URL}/api/admin/vendors`, { headers: authHeaders });
  const getVendorsData = await getVendorsRes.json();
  assert(getVendorsData.vendors?.some((v) => v.id === createdVendorId), "Vendor present in GET /api/admin/vendors");

  // 8. Support Tickets Module
  console.log("\n--- 8. Testing Support Tickets Module ---");
  const createTicketRes = await fetch(`${BASE_URL}/api/admin/support`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      clientId: createdClientId,
      customerName: "Sarah Connor",
      customerEmail: "s.connor@acme-global.test",
      category: "billing",
      subject: "Invoice milestone question",
      description: "Inquiring about invoice schedule for project phase 1",
      priority: "medium",
    }),
  });
  assert(createTicketRes.status === 200, "POST /api/admin/support returns 200");
  const ticketData = await createTicketRes.json();
  const createdTicketId = ticketData.ticketId;
  assert(Boolean(createdTicketId), "Ticket created with ID", createdTicketId);

  // Add response to ticket
  const ticketRespRes = await fetch(`${BASE_URL}/api/admin/support/${createdTicketId}/responses`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      message: "Our finance team has scheduled the remittance for Friday.",
      isInternalNote: false,
    }),
  });
  assert(ticketRespRes.status === 200, "POST /api/admin/support/:id/responses returns 200");

  // 9. SOPs Module
  console.log("\n--- 9. Testing SOPs Module ---");
  const createSopRes = await fetch(`${BASE_URL}/api/admin/sops`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      title: "Enterprise Incident Response Protocol",
      departmentId: targetDeptId,
      category: "Security & Operations",
      summary: "Standard operating procedure for Tier-1 incident response",
      contentMarkdown: "## Protocol\n\n1. Identify incident severity\n2. Notify Ops Lead\n3. Mitigate impact",
      version: "v1.0",
    }),
  });
  assert(createSopRes.status === 200, "POST /api/admin/sops returns 200");
  const sopData = await createSopRes.json();
  const createdSopId = sopData.sopId;
  assert(Boolean(createdSopId), "SOP created with ID", createdSopId);

  // 10. Notifications Module
  console.log("\n--- 10. Testing Notifications Module ---");
  const notifsRes = await fetch(`${BASE_URL}/api/admin/notifications`, { headers: authHeaders });
  assert(notifsRes.status === 200, "GET /api/admin/notifications returns 200");
  const notifsData = await notifsRes.json();
  assert(Array.isArray(notifsData.notifications), "Notifications returned as array");

  // Mark all notifications read
  const patchNotifRes = await fetch(`${BASE_URL}/api/admin/notifications`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ markAll: true }),
  });
  assert(patchNotifRes.status === 200, "PATCH /api/admin/notifications markAll returns 200");

  // 11. Team & RBAC Governance
  console.log("\n--- 11. Testing Team & RBAC Governance ---");
  const rolesRes = await fetch(`${BASE_URL}/api/admin/team/roles`, { headers: authHeaders });
  assert(rolesRes.status === 200, "GET /api/admin/team/roles returns 200");
  const rolesData = await rolesRes.json();
  assert(rolesData.roles?.length >= 14, "Roles list contains system roles", `Found: ${rolesData.roles?.length}`);

  const permsRes = await fetch(`${BASE_URL}/api/admin/team/permissions`, { headers: authHeaders });
  assert(permsRes.status === 200, "GET /api/admin/team/permissions returns 200");
  const permsData = await permsRes.json();
  assert(permsData.permissions?.length === 56, "Full 56 permissions returned in catalogue");

  const usersRes = await fetch(`${BASE_URL}/api/admin/team/users`, { headers: authHeaders });
  assert(usersRes.status === 200, "GET /api/admin/team/users returns 200");
  const usersData = await usersRes.json();
  assert(usersData.users?.length >= 1, "Admin users list includes super_admin");

  // 12. Operations Dashboard & Badges
  console.log("\n--- 12. Testing Operations Dashboard & Badges ---");
  const dashRes = await fetch(`${BASE_URL}/api/admin/dashboard`, { headers: authHeaders });
  assert(dashRes.status === 200, "GET /api/admin/dashboard returns 200");
  const dashData = await dashRes.json();
  assert(typeof dashData.data?.kpis?.totalTasks === "number", "Dashboard KPIs returned with numeric task counts");
  assert(Array.isArray(dashData.data?.deptWorkloads), "Department workloads returned as array");

  const badgesRes = await fetch(`${BASE_URL}/api/admin/dashboard/badges`, { headers: authHeaders });
  assert(badgesRes.status === 200, "GET /api/admin/dashboard/badges returns 200");
  const badgesData = await badgesRes.json();
  assert(typeof badgesData.counts?.openTickets === "number", "Open tickets badge count returned");

  // 13. Reports & CSV Export
  console.log("\n--- 13. Testing Reports & CSV Export ---");
  const reportsRes = await fetch(`${BASE_URL}/api/admin/reports`, { headers: authHeaders });
  assert(reportsRes.status === 200, "GET /api/admin/reports returns 200");
  const reportsData = await reportsRes.json();
  assert(Boolean(reportsData.reports?.taskVelocity), "Task velocity statistics returned");

  const exportCsvRes = await fetch(`${BASE_URL}/api/admin/reports/export?type=tasks`, { headers: authHeaders });
  assert(exportCsvRes.status === 200, "GET /api/admin/reports/export?type=tasks returns 200");
  const csvText = await exportCsvRes.text();
  assert(csvText.includes("Live Integration Test Task"), "Exported CSV contains recently persisted task");

  // 14. Audit Log Verification
  console.log("\n--- 14. Verifying Immutable Audit Trail ---");
  const auditRes = await fetch(`${BASE_URL}/api/admin/audit-log`, { headers: authHeaders });
  assert(auditRes.status === 200, "GET /api/admin/audit-log returns 200");
  const auditData = await auditRes.json();
  assert(auditData.logs?.length >= 5, "Audit logs recorded across operational modules", `Logs count: ${auditData.logs?.length}`);
  const actionsLogged = auditData.logs.map((l) => l.action);
  assert(actionsLogged.includes("USER_LOGIN"), "USER_LOGIN event recorded in audit trail");
  assert(actionsLogged.includes("TASK_CREATED"), "TASK_CREATED event recorded in audit trail");
  assert(actionsLogged.includes("CLIENT_CREATED"), "CLIENT_CREATED event recorded in audit trail");
  assert(actionsLogged.includes("VENDOR_REGISTERED"), "VENDOR_REGISTERED event recorded in audit trail");

  console.log("\n==========================================================");
  console.log(" 🎉 ALL 14 COMPREHENSIVE INTEGRATION TEST SUITES PASSED! ");
  console.log("==========================================================");
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
