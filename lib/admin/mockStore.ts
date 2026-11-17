/**
 * RICOZ Admin — In-Memory Store & SQL Query Fallback Engine
 *
 * Provides a complete, persistent in-memory database initialized with canonical
 * V4 seed data and demo entities. Allows the admin operations suite to run
 * 100% smoothly without database connection errors, 500s, or 404s.
 */

import {
  DEFAULT_DEPARTMENTS,
  DEFAULT_USERS,
  DEFAULT_ROLES,
  DEFAULT_PERMISSIONS,
  DEFAULT_DEPARTMENT_MEMBERS,
  DEFAULT_CLIENTS,
  DEFAULT_CLIENT_CHECKLIST,
  DEFAULT_VENDORS,
  DEFAULT_VENDOR_DOCS,
  DEFAULT_TASKS,
  DEFAULT_TASK_COMMENTS,
  DEFAULT_SUPPORT_TICKETS,
  DEFAULT_TICKET_RESPONSES,
  DEFAULT_SOPS,
  DEFAULT_NOTIFICATIONS,
  DEFAULT_AUDIT_LOGS,
} from "@/lib/demo/seedData";

import {
  V4_SEED_CLIENTS,
  V4_SEED_VENDORS,
  V4_SEED_TASKS,
  V4_SEED_TICKETS,
  V4_SEED_SOPS,
  V4_SEED_USERS,
} from "@/lib/demo/v4SeedData";

// Canonical in-memory tables
export interface MockStoreState {
  departments: any[];
  users: any[];
  roles: any[];
  permissions: any[];
  departmentMembers: any[];
  clients: any[];
  clientChecklist: any[];
  vendors: any[];
  vendorDocs: any[];
  tasks: any[];
  taskComments: any[];
  supportTickets: any[];
  ticketResponses: any[];
  sops: any[];
  notifications: any[];
  auditLogs: any[];
  batchReports: any[];
  trainingSessions: any[];
}

function initMockStore(): MockStoreState {
  // 1. Departments
  const departments = [...DEFAULT_DEPARTMENTS];

  // 2. Users
  const users = [
    {
      id: "usr-001-aadinath",
      email: "aadinath@ricoz.io",
      full_name: "Aadinath Achary",
      fullName: "Aadinath Achary",
      role: "super_admin",
      department_id: "dept-exec",
      departmentName: "Executive Management",
      status: "active",
      avatar: "AA",
      last_login_at: new Date().toISOString(),
      created_at: "2025-01-01T00:00:00Z",
    },
    {
      id: "usr-002-elena",
      email: "elena.r@ricoz.io",
      full_name: "Elena Ramos",
      fullName: "Elena Ramos",
      role: "ops_lead",
      department_id: "dept-ops",
      departmentName: "Operations",
      status: "active",
      avatar: "ER",
      last_login_at: new Date().toISOString(),
      created_at: "2025-01-01T00:00:00Z",
    },
    ...DEFAULT_USERS.map((u) => ({
      ...u,
      full_name: u.fullName,
      department_id: u.departmentId,
      last_login_at: u.lastLoginAt,
      created_at: u.createdAt,
    })),
  ];

  // 3. Clients
  const v4Clients = V4_SEED_CLIENTS.map((c) => ({
    id: c.clientId,
    name: c.companyName,
    industry: "Financial & Private Equity",
    contact_name: c.primaryContact.name,
    contact_email: c.primaryContact.email,
    phone: c.primaryContact.phone,
    company_size: "50-250",
    onboarding_stage: c.stage,
    assigned_owner_id: c.accountLeadId,
    assigned_owner_name: c.accountLeadName,
    notes: `Retainer: $${c.retainerValue.toLocaleString()} | Hours: ${c.hoursUsed}/${c.hoursAllocated} (${Math.round((c.hoursUsed / c.hoursAllocated) * 100)}% on Day ${c.cycleDay})`,
    next_follow_up: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    completed_checklist_count: c.onboardingChecklist.filter((x) => x.completed).length,
    total_checklist_count: c.onboardingChecklist.length,
    retainerValue: c.retainerValue,
    hoursAllocated: c.hoursAllocated,
    hoursUsed: c.hoursUsed,
    cycleDay: c.cycleDay,
    scopeCreepAlert: c.scopeCreepAlert,
    shapRiskScore: c.shapRiskScore,
  }));

  const standardClients = DEFAULT_CLIENTS.map((c) => ({
    ...c,
    contact_name: c.contactName,
    contact_email: c.contactEmail,
    company_size: c.companySize,
    onboarding_stage: c.onboardingStage,
    assigned_owner_id: c.assignedOwnerId,
    assigned_owner_name: c.assignedOwnerName,
    next_follow_up: c.nextFollowUp,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
    completed_checklist_count: 4,
    total_checklist_count: 5,
  }));

  const clients = [...v4Clients, ...standardClients];

  // 4. Client Checklists
  const clientChecklist: any[] = [];
  V4_SEED_CLIENTS.forEach((c) => {
    c.onboardingChecklist.forEach((item, idx) => {
      clientChecklist.push({
        id: `chk-${c.clientId}-${idx}`,
        client_id: c.clientId,
        title: item.label,
        category: "Mandate Onboarding",
        is_completed: item.completed,
        completed_at: item.completed ? new Date().toISOString() : null,
        completed_by_user_name: item.completed ? "Elena Ramos" : null,
      });
    });
  });
  DEFAULT_CLIENT_CHECKLIST.forEach((item) => {
    clientChecklist.push({
      ...item,
      client_id: item.clientId,
      is_completed: item.isCompleted,
      completed_at: item.completedAt,
      completed_by_user_name: "Elena Ramos",
    });
  });

  // 5. Vendors
  const v4Vendors = V4_SEED_VENDORS.map((v) => ({
    id: v.vendorId,
    name: v.studioName,
    service_category: v.discipline.replace("_", " "),
    contact_name: v.vendorId === "ven-301-starlight" ? "Devon Star" : "Claire Laurent",
    contact_email: v.vendorId === "ven-301-starlight" ? "devon@starlightvisual.io" : "claire@ateliermotion.fr",
    phone: "+1-555-081-3329",
    onboarding_stage: "approved",
    verification_status: v.verificationStatus,
    assigned_coordinator_id: "usr-001-aadinath",
    assigned_coordinator_name: "Aadinath Achary",
    notes: `Shadow Score: ${v.shadowScore} | Latency: ${v.pingLatencyHours || 1.2}h | Revisions: ${v.revisionLoops30d || 0}`,
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    verified_docs_count: v.complianceDocs.filter((d) => d.verified).length,
    total_docs_count: v.complianceDocs.length,
    shadowScore: v.shadowScore,
    complianceDocs: v.complianceDocs,
    pingLatencyHours: v.pingLatencyHours,
    revisionLoops30d: v.revisionLoops30d,
  }));

  const standardVendors = DEFAULT_VENDORS.map((v) => ({
    ...v,
    service_category: v.serviceCategory,
    contact_name: v.contactName,
    contact_email: v.contactEmail,
    onboarding_stage: v.onboardingStage,
    verification_status: v.verificationStatus,
    assigned_coordinator_id: v.assignedCoordinatorId,
    assigned_coordinator_name: v.assignedCoordinatorName,
    created_at: v.createdAt,
    updated_at: v.updatedAt,
    verified_docs_count: 3,
    total_docs_count: 3,
    shadowScore: 84.0,
  }));

  const vendors = [...v4Vendors, ...standardVendors];

  // 6. Vendor Documents
  const vendorDocs: any[] = [];
  V4_SEED_VENDORS.forEach((v) => {
    v.complianceDocs.forEach((doc, idx) => {
      vendorDocs.push({
        id: `vdoc-${v.vendorId}-${idx}`,
        vendor_id: v.vendorId,
        document_type: doc.docType.toUpperCase(),
        file_name: `${v.studioName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${doc.docType}.pdf`,
        file_url: doc.fileUrl,
        is_verified: doc.verified,
        verified_at: doc.verified ? new Date().toISOString() : null,
        verified_by_user_name: "Aadinath Achary",
        created_at: new Date().toISOString(),
      });
    });
  });
  DEFAULT_VENDOR_DOCS.forEach((d) => {
    vendorDocs.push({
      ...d,
      vendor_id: d.vendorId,
      document_type: d.documentType,
      file_name: d.fileName,
      file_url: d.fileUrl,
      is_verified: d.isVerified,
      verified_at: d.verifiedAt,
      verified_by_user_name: "Aadinath Achary",
    });
  });

  // 7. Tasks
  const v4Tasks = V4_SEED_TASKS.map((t) => ({
    id: t.taskId,
    title: t.title,
    description: `Standard procedure workflow for ${t.title}. SOP: ${t.sopTitle || "Operational Standard"}.`,
    department_id: t.department === "Technology" || t.department === "Engineering" ? "dept-tech" : "dept-ops",
    assignee_id: t.assigneeId,
    creator_id: "usr-001-aadinath",
    priority: t.priority === "P0" ? "urgent" : t.priority === "P1" ? "high" : "medium",
    status: t.status === "in_progress" ? "in_progress" : t.status,
    blocker_note: t.blockerNote,
    is_escalated: t.priority === "P0" || Boolean(t.blockerNote),
    due_date: t.dueDate.split("T")[0],
    completed_at: null,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    department_name: t.department,
    assignee_name: t.assigneeName,
    creator_name: "Aadinath Achary",
    comments_count: t.comments?.length || 0,
    dueDate: t.dueDate,
    sopTitle: t.sopTitle,
  }));

  const standardTasks = DEFAULT_TASKS.map((t) => ({
    ...t,
    department_id: t.departmentId,
    assignee_id: t.assigneeId,
    creator_id: t.creatorId,
    blocker_note: t.blockerNote,
    is_escalated: t.isEscalated,
    due_date: t.dueDate,
    completed_at: t.completedAt,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
    department_name: t.departmentName,
    assignee_name: t.assigneeName,
    creator_name: t.creatorName,
    comments_count: 1,
  }));

  const tasks = [...v4Tasks, ...standardTasks];

  // 8. Task Comments
  const taskComments: any[] = [];
  V4_SEED_TASKS.forEach((t) => {
    t.comments?.forEach((c, idx) => {
      taskComments.push({
        id: `tcom-${t.taskId}-${idx}`,
        task_id: t.taskId,
        user_id: c.authorId,
        comment: c.text,
        is_blocker_update: true,
        created_at: c.timestamp,
        user_name: c.authorName,
        user_avatar: "ER",
        user_role: "Operations Lead",
      });
    });
  });
  DEFAULT_TASK_COMMENTS.forEach((c) => {
    taskComments.push({
      ...c,
      task_id: c.taskId,
      user_id: c.userId,
      is_blocker_update: c.isBlockerUpdate,
      created_at: c.createdAt,
      user_name: c.userName,
      user_avatar: c.userAvatar,
      user_role: c.userRole,
    });
  });

  // 9. Support Tickets
  const v4Tickets = V4_SEED_TICKETS.map((t) => ({
    id: t.ticketRef,
    ticket_ref: t.ticketRef,
    client_id: "cli-101-vance",
    customer_name: t.customerName,
    customer_email: t.customerName === "Marcus Vance" ? "m.vance@vanceglobal.com" : "s.jenkins@kinetics.com",
    category: t.category,
    subject: t.subject,
    description: `Automated telemetry incident ticket for reference ${t.ticketRef}. Category: ${t.category}. Priority: ${t.priority}.`,
    priority: t.priority === "P0" ? "critical" : t.priority === "P1" ? "high" : "medium",
    status: t.status,
    assigned_user_id: "usr-001-aadinath",
    resolved_at: null,
    resolution_notes: null,
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    client_name: t.customerName === "Marcus Vance" ? "Vance Global Capital" : "Kinetics Capital",
    assigned_user_name: "Aadinath Achary",
    responses_count: t.responses.length,
    slaDueAt: t.slaDueAt,
    warRoomActive: t.warRoomActive,
  }));

  const standardTickets = DEFAULT_SUPPORT_TICKETS.map((t) => ({
    ...t,
    ticket_ref: t.ticketRef,
    client_id: t.clientId,
    customer_name: t.customerName,
    customer_email: t.customerEmail,
    assigned_user_id: t.assignedUserId,
    resolved_at: t.resolvedAt,
    resolution_notes: t.resolutionNotes,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
    client_name: t.clientName,
    assigned_user_name: t.assignedUserName,
    responses_count: 2,
  }));

  const supportTickets = [...v4Tickets, ...standardTickets];

  // 10. Ticket Responses
  const ticketResponses: any[] = [];
  V4_SEED_TICKETS.forEach((t) => {
    t.responses?.forEach((r, idx) => {
      ticketResponses.push({
        id: `tr-${t.ticketRef}-${idx}`,
        ticket_id: t.ticketRef,
        user_id: "usr-001-aadinath",
        message: r.text,
        is_internal_note: false,
        created_at: r.timestamp,
        user_name: r.sender,
        user_role: "Customer Representative",
      });
    });
  });
  DEFAULT_TICKET_RESPONSES.forEach((r) => {
    ticketResponses.push({
      ...r,
      ticket_id: r.ticketId,
      user_id: r.userId,
      is_internal_note: r.isInternalNote,
      created_at: r.createdAt,
      user_name: r.userName,
      user_role: r.userRole,
    });
  });

  // 11. SOPs
  const v4Sops = V4_SEED_SOPS.map((s) => ({
    id: s.sopId,
    title: s.title,
    slug: s.sopId,
    department_id: "dept-ops",
    department_name: s.department,
    category: s.category,
    summary: `Standard operational protocol for ${s.title.toLowerCase()}. Includes automated checklist verification.`,
    content_markdown: s.markdownBody,
    version: s.version,
    status: "active",
    owner_name: "Elena Ramos",
    last_reviewed_at: s.lastReviewedAt,
    created_at: s.lastReviewedAt,
    driftScore: s.driftScore,
    checklistSteps: s.checklistSteps,
  }));

  const standardSops = DEFAULT_SOPS.map((s) => ({
    ...s,
    department_id: s.departmentId,
    department_name: s.departmentName,
    content_markdown: s.contentMarkdown,
    owner_name: s.ownerName,
    last_reviewed_at: s.lastReviewedAt,
    created_at: s.createdAt,
    driftScore: 1.5,
  }));

  const sops = [...v4Sops, ...standardSops];

  return {
    departments,
    users,
    roles: [...DEFAULT_ROLES],
    permissions: [...DEFAULT_PERMISSIONS],
    departmentMembers: [...DEFAULT_DEPARTMENT_MEMBERS],
    clients,
    clientChecklist,
    vendors,
    vendorDocs,
    tasks,
    taskComments,
    supportTickets,
    ticketResponses,
    sops,
    notifications: [...DEFAULT_NOTIFICATIONS],
    auditLogs: [...DEFAULT_AUDIT_LOGS],
    batchReports: [],
    trainingSessions: [],
  };
}

// Global persistent in-memory store instance (using globalThis for cross-module HMR persistence)
export function getMockStore(): MockStoreState {
  if (!(globalThis as any).__ricozMockStore) {
    (globalThis as any).__ricozMockStore = initMockStore();
  }
  return (globalThis as any).__ricozMockStore;
}

/**
 * Universal SQL simulation engine for local demo mode.
 * Evaluates basic SELECT, UPDATE, INSERT queries against the in-memory store.
 */
export function executeMockQuery(sql: string, params: any[] = []): any[] {
  const store = getMockStore();
  const lowerSql = sql.toLowerCase().trim();

  // 0. COUNT(*) AGGREGATIONS
  if (lowerSql.startsWith("select count(*)")) {
    const today = new Date().toISOString().split("T")[0];
    if (lowerSql.includes("from tasks")) {
      if (lowerSql.includes("status != 'completed'") && lowerSql.includes("due_date <")) {
        return [{ count: store.tasks.filter((t) => t.status !== "completed" && (t.due_date || t.dueDate) < today).length }];
      }
      if (lowerSql.includes("status = 'completed'")) {
        return [{ count: store.tasks.filter((t) => t.status === "completed").length }];
      }
      if (lowerSql.includes("status = 'blocked'")) {
        return [{ count: store.tasks.filter((t) => t.status === "blocked").length }];
      }
      return [{ count: store.tasks.length }];
    }
    if (lowerSql.includes("from support_tickets")) {
      if (lowerSql.includes("in ('open', 'escalated')")) {
        return [{ count: store.supportTickets.filter((t) => ["open", "escalated"].includes(t.status)).length }];
      }
      if (lowerSql.includes("status = 'resolved'")) {
        return [{ count: store.supportTickets.filter((t) => t.status === "resolved").length }];
      }
      if (lowerSql.includes("priority = 'critical'")) {
        return [{ count: store.supportTickets.filter((t) => t.priority === "critical").length }];
      }
      return [{ count: store.supportTickets.length }];
    }
    if (lowerSql.includes("from vendors")) {
      if (lowerSql.includes("verification_status = 'pending_review'")) {
        return [{ count: store.vendors.filter((v) => v.verification_status === "pending_review").length }];
      }
      return [{ count: store.vendors.length }];
    }
    if (lowerSql.includes("from notifications")) {
      return [{ count: store.notifications.filter((n) => !n.is_read).length }];
    }
    if (lowerSql.includes("from clients")) {
      return [{ count: store.clients.length }];
    }
    if (lowerSql.includes("from admin_users")) {
      return [{ count: store.users.length }];
    }
    return [{ count: 0 }];
  }

  // GROUP BY AGGREGATIONS
  if (lowerSql.includes("group by onboarding_stage")) {
    const map: Record<string, number> = {};
    store.clients.forEach((c) => {
      const s = c.onboarding_stage || c.onboardingStage || "lead";
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([onboarding_stage, count]) => ({ onboarding_stage, count }));
  }

  if (lowerSql.includes("group by verification_status")) {
    const map: Record<string, number> = {};
    store.vendors.forEach((v) => {
      const s = v.verification_status || "pending_review";
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([verification_status, count]) => ({ verification_status, count }));
  }

  if (lowerSql.includes("group by category") && lowerSql.includes("from support_tickets")) {
    const map: Record<string, number> = {};
    store.supportTickets.forEach((t) => {
      const c = t.category || "General";
      map[c] = (map[c] || 0) + 1;
    });
    return Object.entries(map).map(([category, count]) => ({ category, count }));
  }

  if (lowerSql.includes("group by role") && lowerSql.includes("from admin_users")) {
    const map: Record<string, number> = {};
    store.users.forEach((u) => {
      const r = u.role || "team_member";
      map[r] = (map[r] || 0) + 1;
    });
    return Object.entries(map).map(([role, count]) => ({ role, count }));
  }

  // 1. DEPARTMENTS
  if (lowerSql.includes("from departments")) {
    const today = new Date().toISOString().split("T")[0];
    return store.departments.map((d) => {
      const deptTasks = store.tasks.filter((t) => t.department_id === d.id);
      return {
        id: d.id,
        name: d.name,
        slug: d.slug,
        description: d.description,
        head_user_id: d.headUserId || null,
        head_user_name: d.headUserName || "Elena Ramos",
        created_at: d.createdAt,
        member_count: store.users.filter((u) => u.department_id === d.id).length || 2,
        active_task_count: deptTasks.filter((t) => t.status !== "completed").length,
        overdue_task_count: deptTasks.filter((t) => t.status !== "completed" && t.due_date < today).length,
      };
    });
  }

  if (lowerSql.startsWith("insert into departments")) {
    const newDept = {
      id: params[0] || `dept-${Date.now()}`,
      name: params[1],
      slug: params[2],
      description: params[3],
      head_user_id: null,
      created_at: new Date().toISOString(),
    };
    store.departments.push(newDept);
    return [{ changes: 1, lastInsertRowid: newDept.id }];
  }

  // 2. CLIENTS
  if (lowerSql.includes("from clients")) {
    if (lowerSql.includes("where c.id = ?") || lowerSql.includes("where id = ?")) {
      const id = params[0];
      const client = store.clients.find((c) => c.id === id);
      return client ? [client] : [];
    }
    return store.clients;
  }

  if (lowerSql.startsWith("update clients set")) {
    const id = params[params.length - 1];
    const client = store.clients.find((c) => c.id === id);
    if (client) {
      if (lowerSql.includes("onboarding_stage = ?")) {
        client.onboarding_stage = params[0];
      }
      if (lowerSql.includes("notes = ?")) {
        client.notes = params[1] || client.notes;
      }
      client.updated_at = new Date().toISOString();
    }
    return [{ changes: 1 }];
  }

  // 3. CLIENT ONBOARDING ITEMS
  if (lowerSql.includes("from client_onboarding_items")) {
    const clientId = params[0];
    return store.clientChecklist.filter((chk) => chk.client_id === clientId);
  }

  // 4. VENDORS
  if (lowerSql.includes("from vendors")) {
    if (lowerSql.includes("where v.id = ?") || lowerSql.includes("where id = ?")) {
      const id = params[0];
      const vendor = store.vendors.find((v) => v.id === id);
      return vendor ? [vendor] : [];
    }
    return store.vendors;
  }

  if (lowerSql.startsWith("update vendors set")) {
    const id = params[params.length - 1];
    const vendor = store.vendors.find((v) => v.id === id);
    if (vendor) {
      if (lowerSql.includes("verification_status = ?")) {
        vendor.verification_status = params[0];
      }
      vendor.updated_at = new Date().toISOString();
    }
    return [{ changes: 1 }];
  }

  // 5. VENDOR DOCUMENTS
  if (lowerSql.includes("from vendor_documents")) {
    const vendorId = params[0];
    return store.vendorDocs.filter((d) => d.vendor_id === vendorId);
  }

  // 6. TASKS
  if (lowerSql.includes("from tasks")) {
    if (lowerSql.includes("where t.id = ?") || lowerSql.includes("where id = ?")) {
      const id = params[0];
      const task = store.tasks.find((t) => t.id === id);
      return task ? [task] : [];
    }
    return store.tasks;
  }

  if (lowerSql.startsWith("update tasks set")) {
    const id = params[params.length - 1];
    const task = store.tasks.find((t) => t.id === id);
    if (task) {
      if (lowerSql.includes("status = ?")) {
        task.status = params[0];
      }
      task.updated_at = new Date().toISOString();
    }
    return [{ changes: 1 }];
  }

  // 7. TASK COMMENTS
  if (lowerSql.includes("from task_comments")) {
    const taskId = params[0];
    return store.taskComments.filter((c) => c.task_id === taskId);
  }

  if (lowerSql.startsWith("insert into task_comments")) {
    const newComment = {
      id: params[0] || `tcom-${Date.now()}`,
      task_id: params[1],
      user_id: params[2],
      comment: params[3],
      is_blocker_update: Boolean(params[4]),
      created_at: new Date().toISOString(),
      user_name: "Aadinath Achary",
      user_avatar: "AA",
      user_role: "Super Admin",
    };
    store.taskComments.push(newComment);
    return [{ changes: 1, lastInsertRowid: newComment.id }];
  }

  // 8. SUPPORT TICKETS
  if (lowerSql.includes("from support_tickets")) {
    if (lowerSql.includes("where st.id = ?") || lowerSql.includes("where id = ?") || lowerSql.includes("st.ticket_ref = ?")) {
      const id = params[0];
      const ticket = store.supportTickets.find((t) => t.id === id || t.ticket_ref === id);
      return ticket ? [ticket] : [];
    }
    return store.supportTickets;
  }

  if (lowerSql.startsWith("update support_tickets set")) {
    const id = params[params.length - 1];
    const ticket = store.supportTickets.find((t) => t.id === id || t.ticket_ref === id);
    if (ticket) {
      if (lowerSql.includes("status = ?")) {
        ticket.status = params[0];
      }
      ticket.updated_at = new Date().toISOString();
    }
    return [{ changes: 1 }];
  }

  // 9. TICKET RESPONSES
  if (lowerSql.includes("from ticket_responses")) {
    const ticketId = params[0];
    return store.ticketResponses.filter((r) => r.ticket_id === ticketId);
  }

  if (lowerSql.startsWith("insert into ticket_responses")) {
    const newResp = {
      id: params[0] || `tr-${Date.now()}`,
      ticket_id: params[1],
      user_id: params[2],
      message: params[3],
      is_internal_note: Boolean(params[4]),
      created_at: new Date().toISOString(),
      user_name: "Aadinath Achary",
      user_role: "Super Admin",
    };
    store.ticketResponses.push(newResp);
    return [{ changes: 1, lastInsertRowid: newResp.id }];
  }

  // 10. SOPS
  if (lowerSql.includes("from sops")) {
    if (lowerSql.includes("where s.id = ?") || lowerSql.includes("where id = ?")) {
      const id = params[0];
      const sop = store.sops.find((s) => s.id === id || s.slug === id);
      return sop ? [sop] : [];
    }
    return store.sops;
  }

  // 11. ADMIN USERS & TEAM MEMBERS
  if (lowerSql.includes("from admin_users")) {
    if (lowerSql.includes("where u.id = ?") || lowerSql.includes("where id = ?")) {
      const id = params[0];
      const user = store.users.find((u) => u.id === id);
      return user ? [user] : [];
    }
    return store.users;
  }

  // 12. AUDIT LOGS
  if (lowerSql.includes("from audit_logs")) {
    return store.auditLogs;
  }

  if (lowerSql.startsWith("insert into audit_logs")) {
    store.auditLogs.unshift({
      id: params[0] || `aud-${Date.now()}`,
      action: params[1],
      entityType: params[2],
      entityId: params[3],
      changeSummary: params[4],
      timestamp: new Date().toISOString(),
      actorName: "Aadinath Achary",
    });
    return [{ changes: 1 }];
  }

  // 13. NOTIFICATIONS
  if (lowerSql.includes("from notifications")) {
    return store.notifications;
  }

  if (lowerSql.startsWith("update notifications")) {
    return [{ changes: 1 }];
  }

  // 14. ADMIN ROLES
  if (lowerSql.includes("from admin_roles")) {
    return DEFAULT_ROLES.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      hierarchy_level: r.hierarchyLevel,
      is_system_role: r.isSystemRole,
      is_active: r.isActive,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }

  // 15. ADMIN PERMISSIONS
  if (lowerSql.includes("from admin_permissions")) {
    return DEFAULT_PERMISSIONS.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      module: p.module,
      action: p.action,
      created_at: new Date().toISOString(),
    }));
  }

  // 16. ADMIN ROLE PERMISSIONS
  if (lowerSql.includes("from admin_role_permissions")) {
    const rows: any[] = [];
    DEFAULT_ROLES.forEach((r) => {
      (r.permissions || []).forEach((pSlug) => {
        rows.push({
          role_id: r.id,
          role_slug: r.slug,
          slug: pSlug,
          permission_slug: pSlug,
        });
      });
    });
    if (lowerSql.includes("where r.slug = ?")) {
      const slug = params[0];
      return rows.filter((rp) => rp.role_slug === slug);
    }
    return rows;
  }

  // 17. ADMIN USER PERMISSIONS
  if (lowerSql.includes("from admin_user_permissions")) {
    return [];
  }

  // 18. ADMIN DEPARTMENT MEMBERS
  if (lowerSql.includes("from admin_department_members")) {
    if (lowerSql.includes("where dm.admin_user_id = ?")) {
      const userId = params[0];
      return DEFAULT_DEPARTMENT_MEMBERS.filter((m) => m.adminUserId === userId).map((m) => ({
        id: m.id,
        admin_user_id: m.adminUserId,
        department_id: m.departmentId,
        membership_role: m.membershipRole,
        is_primary: m.isPrimary,
        created_at: m.createdAt,
        department_name: m.departmentName,
        user_name: m.userName,
        user_email: m.userEmail,
        user_role: m.userRole,
      }));
    }
    return DEFAULT_DEPARTMENT_MEMBERS.map((m) => ({
      id: m.id,
      admin_user_id: m.adminUserId,
      department_id: m.departmentId,
      membership_role: m.membershipRole,
      is_primary: m.isPrimary,
      created_at: m.createdAt,
      department_name: m.departmentName,
      user_name: m.userName,
      user_email: m.userEmail,
      user_role: m.userRole,
    }));
  }

  // 19. ADMIN SESSIONS
  if (lowerSql.includes("from admin_sessions")) {
    const defaultUser = store.users[0] || {
      id: "usr-001-aadinath",
      email: "aadinath@ricoz.io",
      full_name: "Aadinath Achary",
      role: "super_admin",
      department_id: "dept-exec",
      status: "active",
      avatar: "AA",
      last_login_at: new Date().toISOString(),
      created_at: "2025-01-01T00:00:00Z",
    };
    return [{
      id: defaultUser.id,
      email: defaultUser.email,
      full_name: defaultUser.full_name || defaultUser.fullName,
      role: defaultUser.role,
      department_id: defaultUser.department_id || defaultUser.departmentId,
      status: "active",
      avatar: defaultUser.avatar,
      last_login_at: defaultUser.last_login_at,
      created_at: defaultUser.created_at,
      department_name: "Executive Management",
      session_id: "sess-demo-active",
      expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
      last_activity_at: new Date().toISOString(),
      session_created_at: new Date().toISOString(),
    }];
  }

  if (lowerSql.startsWith("insert into admin_sessions")) {
    return [{ changes: 1 }];
  }

  if (lowerSql.startsWith("update admin_sessions")) {
    return [{ changes: 1 }];
  }

  if (lowerSql.startsWith("delete from admin_sessions")) {
    return [{ changes: 1 }];
  }

  // 20. INSERTS FOR CORE MODULES
  if (lowerSql.startsWith("insert into clients")) {
    const newClient = {
      id: params[0] || `cli-${Date.now()}`,
      name: params[1],
      industry: params[2],
      contact_name: params[3],
      contact_email: params[4],
      phone: params[5],
      company_size: params[6],
      onboarding_stage: params[7] || "lead",
      assigned_owner_id: params[8] || null,
      notes: params[9] || "",
      next_follow_up: params[10] || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_checklist_count: 0,
      total_checklist_count: 5,
    };
    store.clients.unshift(newClient);
    return [{ changes: 1, lastInsertRowid: newClient.id }];
  }

  if (lowerSql.startsWith("insert into vendors")) {
    const newVendor = {
      id: params[0] || `ven-${Date.now()}`,
      name: params[1],
      service_category: params[2],
      contact_name: params[3],
      contact_email: params[4],
      phone: params[5],
      onboarding_stage: params[6] || "vetting",
      verification_status: params[7] || "pending_review",
      assigned_coordinator_id: params[8] || null,
      notes: params[9] || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      verified_docs_count: 0,
      total_docs_count: 3,
    };
    store.vendors.unshift(newVendor);
    return [{ changes: 1, lastInsertRowid: newVendor.id }];
  }

  if (lowerSql.startsWith("insert into tasks")) {
    const newTask = {
      id: params[0] || `tsk-${Date.now()}`,
      title: params[1],
      description: params[2],
      department_id: params[3],
      assignee_id: params[4] || null,
      creator_id: params[5],
      priority: params[6] || "medium",
      status: params[7] || "todo",
      due_date: params[8],
      blocker_note: params[9] || null,
      is_escalated: Boolean(params[10]),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      comments_count: 0,
    };
    store.tasks.unshift(newTask);
    return [{ changes: 1, lastInsertRowid: newTask.id }];
  }

  if (lowerSql.startsWith("insert into support_tickets")) {
    const newTicket = {
      id: params[0] || `tkt-${Date.now()}`,
      ticket_ref: params[1] || `REF-${new Date().getFullYear()}-${Math.floor(Math.random() * 900) + 100}`,
      client_id: params[2] || null,
      customer_name: params[3],
      customer_email: params[4],
      category: params[5],
      subject: params[6],
      description: params[7],
      priority: params[8] || "medium",
      status: params[9] || "open",
      assigned_user_id: params[10] || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responses_count: 0,
    };
    store.supportTickets.unshift(newTicket);
    return [{ changes: 1, lastInsertRowid: newTicket.id }];
  }

  if (lowerSql.startsWith("insert into sops")) {
    const newSop = {
      id: params[0] || `sop-${Date.now()}`,
      title: params[1],
      slug: params[2],
      category: params[3],
      department_id: params[4],
      owner_id: params[5],
      content_markdown: params[6],
      version: params[7] || "1.0",
      status: params[8] || "draft",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.sops.unshift(newSop);
    return [{ changes: 1, lastInsertRowid: newSop.id }];
  }

  // Default fallback
  return [];
}
