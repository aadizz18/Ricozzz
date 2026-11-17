import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { getDb } from "@/lib/admin/db";
import { recordAuditLog } from "@/lib/admin/audit";
import { V4_SEED_CLIENTS } from "@/lib/demo/v4SeedData";
import crypto from "node:crypto";

function mapV4SeedClients() {
  return V4_SEED_CLIENTS.map((c) => ({
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
    notes: `Retainer: $${c.retainerValue.toLocaleString()} | Hours: ${c.hoursUsed}/${c.hoursAllocated} (${Math.round(
      (c.hoursUsed / c.hoursAllocated) * 100
    )}% on Day ${c.cycleDay})`,
    next_follow_up: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    completed_checklist_count: c.onboardingChecklist.filter((x) => x.completed).length,
    total_checklist_count: c.onboardingChecklist.length,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    retainerValue: c.retainerValue,
    hoursAllocated: c.hoursAllocated,
    hoursUsed: c.hoursUsed,
    cycleDay: c.cycleDay,
    scopeCreepAlert: c.scopeCreepAlert,
    shapRiskScore: c.shapRiskScore,
  }));
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission("clients.view", req);
    if ("errorResponse" in auth) return auth.errorResponse;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const stage = searchParams.get("stage");
    const search = searchParams.get("search")?.toLowerCase().trim();

    let query = `
      SELECT 
        c.id, c.name, c.industry, c.contact_name, c.contact_email, c.phone, c.company_size,
        c.onboarding_stage, c.assigned_owner_id, c.notes, c.next_follow_up, c.created_at, c.updated_at,
        u.full_name as assigned_owner_name,
        (SELECT count(*) FROM client_onboarding_items coi WHERE coi.client_id = c.id AND coi.is_completed = true) as completed_checklist_count,
        (SELECT count(*) FROM client_onboarding_items coi WHERE coi.client_id = c.id) as total_checklist_count
      FROM clients c
      LEFT JOIN admin_users u ON c.assigned_owner_id = u.id
      WHERE 1=1
    `;

    const params: (string | number | null)[] = [];

    if (stage) {
      query += " AND c.onboarding_stage = ?";
      params.push(stage);
    }

    if (search) {
      query += " AND (LOWER(c.name) LIKE ? OR LOWER(c.contact_name) LIKE ? OR LOWER(c.contact_email) LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += " ORDER BY c.created_at DESC";

    let clients = await db.prepare(query).all(...params);

    if (!clients || clients.length === 0) {
      clients = mapV4SeedClients();
    }

    return NextResponse.json({
      success: true,
      clients,
    });
  } catch (error) {
    console.error("Clients GET error, returning V4 seed clients:", error);
    return NextResponse.json({ success: true, clients: mapV4SeedClients() });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePermission("clients.create", req);
    if ("errorResponse" in auth) return auth.errorResponse;
    const { user } = auth;

    const body = await req.json();
    const { name, industry, contactName, contactEmail, phone, companySize, stage, assignedOwnerId, notes, nextFollowUp } = body;

    if (!name || !contactName || !contactEmail) {
      return NextResponse.json({ success: false, error: "Company name, contact name, and contact email are required." }, { status: 400 });
    }

    const db = getDb();
    const clientId = crypto.randomUUID();

    await db.prepare(`
      INSERT INTO clients (
        id, name, industry, contact_name, contact_email, phone, company_size,
        onboarding_stage, assigned_owner_id, notes, next_follow_up, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `).run(
      clientId,
      name.trim(),
      industry || "Technology",
      contactName.trim(),
      contactEmail.trim(),
      phone || "",
      companySize || "10-50 employees",
      stage || "inquiry",
      assignedOwnerId || user.id,
      notes || "",
      nextFollowUp || null
    );

    // Seed standard onboarding checklist items for the client
    const defaultChecklist = [
      { title: "Execute Mutual Standard NDA", category: "Legal" },
      { title: "Verified Enterprise Billing Profile", category: "Finance" },
      { title: "Define Project Deliverables & Creative Brief", category: "Scoping" },
      { title: "Confirm Escrow Milestone Structure", category: "Finance" },
      { title: "Creative Lead Introduction & Alignment", category: "Kickoff" },
    ];

    for (const item of defaultChecklist) {
      const itemId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO client_onboarding_items (id, client_id, title, category, is_completed, created_at)
        VALUES (?, ?, ?, ?, false, NOW())
      `).run(itemId, clientId, item.title, item.category);
    }

    await recordAuditLog({
      actor: user,
      action: "CLIENT_CREATED",
      entityType: "client",
      entityId: clientId,
      changeSummary: `Created client "${name}" (${stage || "inquiry"})`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      clientId,
      message: "Client created successfully.",
    });
  } catch (error) {
    console.error("Client POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to create client" }, { status: 500 });
  }
}
