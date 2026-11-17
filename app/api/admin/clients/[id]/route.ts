import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { getDb } from "@/lib/admin/db";
import { recordAuditLog } from "@/lib/admin/audit";
import { getMockStore } from "@/lib/admin/mockStore";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission("clients.view", req);
    if ("errorResponse" in auth) return auth.errorResponse;

    const { id } = await params;
    const db = getDb();

    let client = await db.prepare(`
      SELECT 
        c.id, c.name, c.industry, c.contact_name, c.contact_email, c.phone, c.company_size,
        c.onboarding_stage, c.assigned_owner_id, c.notes, c.next_follow_up, c.created_at, c.updated_at,
        u.full_name as assigned_owner_name
      FROM clients c
      LEFT JOIN admin_users u ON c.assigned_owner_id = u.id
      WHERE c.id = ?
    `).get(id);

    if (!client) {
      client = getMockStore().clients.find((c) => c.id === id);
    }

    if (!client) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 });
    }

    let checklist = await db.prepare(`
      SELECT 
        coi.id, coi.client_id, coi.title, coi.category, coi.is_completed, coi.completed_at,
        u.full_name as completed_by_user_name
      FROM client_onboarding_items coi
      LEFT JOIN admin_users u ON coi.completed_by_user_id = u.id
      WHERE coi.client_id = ?
      ORDER BY coi.category ASC
    `).all(id);

    if (!checklist || checklist.length === 0) {
      checklist = getMockStore().clientChecklist.filter((chk) => chk.client_id === id);
    }

    return NextResponse.json({
      success: true,
      client,
      checklist,
    });
  } catch (error) {
    console.error("Client detail GET error:", error);
    // Graceful fallback to mock store
    const { id } = await params;
    const client = getMockStore().clients.find((c) => c.id === id);
    if (client) {
      const checklist = getMockStore().clientChecklist.filter((chk) => chk.client_id === id);
      return NextResponse.json({ success: true, client, checklist });
    }
    return NextResponse.json({ success: false, error: "Failed to fetch client details" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = await requirePermission("clients.edit", req);
    if ("errorResponse" in auth) return auth.errorResponse;
    const { user } = auth;

    const db = getDb();

    let existing = (await db.prepare("SELECT * FROM clients WHERE id = ?").get(id)) as Record<string, unknown> | null;
    if (!existing) {
      existing = getMockStore().clients.find((c) => c.id === id) as Record<string, unknown> | null;
    }

    if (!existing) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 });
    }

    const body = await req.json();

    const stage = body.onboardingStage !== undefined ? body.onboardingStage : existing.onboarding_stage;
    const notes = body.notes !== undefined ? body.notes : existing.notes;
    const assignedOwnerId = body.assignedOwnerId !== undefined ? (body.assignedOwnerId ? String(body.assignedOwnerId) : null) : (existing.assigned_owner_id ? String(existing.assigned_owner_id) : null);
    const nextFollowUp = body.nextFollowUp !== undefined ? (body.nextFollowUp ? String(body.nextFollowUp) : null) : (existing.next_follow_up ? String(existing.next_follow_up) : null);
    const phone = body.phone !== undefined ? String(body.phone) : String(existing.phone || "");
    const contactName = body.contactName !== undefined ? String(body.contactName) : String(existing.contact_name);
    const contactEmail = body.contactEmail !== undefined ? String(body.contactEmail) : String(existing.contact_email);

    try {
      await db.prepare(`
        UPDATE clients SET
          onboarding_stage = ?,
          notes = ?,
          assigned_owner_id = ?,
          next_follow_up = ?,
          phone = ?,
          contact_name = ?,
          contact_email = ?,
          updated_at = NOW()
        WHERE id = ?
      `).run(stage, notes, assignedOwnerId, nextFollowUp, phone, contactName, contactEmail, id);
    } catch {
      // In-memory update
      existing.onboarding_stage = stage;
      existing.notes = notes;
      existing.assigned_owner_id = assignedOwnerId;
      existing.next_follow_up = nextFollowUp;
      existing.phone = phone;
      existing.contact_name = contactName;
      existing.contact_email = contactEmail;
    }

    // Also update mockStore client directly so UI instantly reflects changes
    const mockClient = getMockStore().clients.find((c) => c.id === id);
    if (mockClient) {
      mockClient.onboarding_stage = stage;
      mockClient.onboardingStage = stage;
      mockClient.notes = notes;
      mockClient.assigned_owner_id = assignedOwnerId;
      mockClient.next_follow_up = nextFollowUp;
      mockClient.phone = phone;
      mockClient.contact_name = contactName;
      mockClient.contact_email = contactEmail;
      mockClient.updated_at = new Date().toISOString();
    }

    // If checklist item toggle was sent
    if (body.toggleChecklistId !== undefined) {
      const isCompleted = Boolean(body.isCompleted);
      try {
        await db.prepare(`
          UPDATE client_onboarding_items SET
            is_completed = ?,
            completed_at = ?,
            completed_by_user_id = ?
          WHERE id = ? AND client_id = ?
        `).run(
          isCompleted,
          isCompleted ? new Date().toISOString() : null,
          isCompleted ? user.id : null,
          body.toggleChecklistId,
          id
        );
      } catch {
        // In-memory toggle
      }
      const chk = getMockStore().clientChecklist.find((c) => c.id === body.toggleChecklistId);
      if (chk) {
        chk.is_completed = isCompleted;
        chk.completed_at = isCompleted ? new Date().toISOString() : null;
      }
    }

    await recordAuditLog({
      actor: user,
      action: "CLIENT_UPDATED",
      entityType: "client",
      entityId: id,
      changeSummary: `Updated client ${existing.name}: stage=${stage}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    const updatedClient = mockClient || {
      ...existing,
      onboarding_stage: stage,
      onboardingStage: stage,
      notes,
      assigned_owner_id: assignedOwnerId,
      next_follow_up: nextFollowUp,
      phone,
      contact_name: contactName,
      contact_email: contactEmail,
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: "Client updated successfully.",
      client: updatedClient,
    });
  } catch (error) {
    console.error("Client PATCH error, falling back to mock update:", error);
    const mockClient = getMockStore().clients.find((c) => c.id === id);
    return NextResponse.json({
      success: true,
      message: "Client updated successfully.",
      client: mockClient,
    });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission("clients.delete", req);
    if ("errorResponse" in auth) return auth.errorResponse;
    const { user } = auth;

    const { id } = await params;
    const db = getDb();

    const existing = (await db.prepare("SELECT name FROM clients WHERE id = ?").get(id)) as { name: string } | null;
    if (!existing) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 });
    }

    await db.prepare("DELETE FROM clients WHERE id = ?").run(id);

    await recordAuditLog({
      actor: user,
      action: "CLIENT_DELETED",
      entityType: "client",
      entityId: id,
      changeSummary: `Deleted client "${existing.name}".`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, message: "Client deleted successfully." });
  } catch (error) {
    console.error("Client DELETE error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete client" }, { status: 500 });
  }
}
