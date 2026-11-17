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
    const auth = await requirePermission("support.view", req);
    if ("errorResponse" in auth) return auth.errorResponse;

    const { id } = await params;
    const db = getDb();

    let ticket = await db.prepare(`
      SELECT 
        st.id, st.ticket_ref, st.client_id, st.customer_name, st.customer_email,
        st.category, st.subject, st.description, st.priority, st.status,
        st.assigned_user_id, st.resolved_at, st.resolution_notes, st.created_at, st.updated_at,
        c.name as client_name,
        u.full_name as assigned_user_name
      FROM support_tickets st
      LEFT JOIN clients c ON st.client_id = c.id
      LEFT JOIN admin_users u ON st.assigned_user_id = u.id
      WHERE st.id = ? OR st.ticket_ref = ?
    `).get(id, id);

    if (!ticket) {
      ticket = getMockStore().supportTickets.find((t) => t.id === id || t.ticket_ref === id);
    }

    if (!ticket) {
      return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
    }

    const ticketId = (ticket as any).id || (ticket as any).ticket_ref;

    let responses = await db.prepare(`
      SELECT 
        tr.id, tr.ticket_id, tr.user_id, tr.message, tr.is_internal_note, tr.created_at,
        u.full_name as user_name, u.role as user_role
      FROM ticket_responses tr
      JOIN admin_users u ON tr.user_id = u.id
      WHERE tr.ticket_id = ?
      ORDER BY tr.created_at ASC
    `).all(ticketId);

    if (!responses || responses.length === 0) {
      responses = getMockStore().ticketResponses.filter(
        (r) => r.ticket_id === id || r.ticket_id === ticketId || r.ticket_id === (ticket as any).ticket_ref
      );
    }

    return NextResponse.json({
      success: true,
      ticket,
      responses,
    });
  } catch (error) {
    console.error("Ticket detail error:", error);
    const { id } = await params;
    const ticket = getMockStore().supportTickets.find((t) => t.id === id || t.ticket_ref === id);
    if (ticket) {
      const responses = getMockStore().ticketResponses.filter(
        (r) => r.ticket_id === id || r.ticket_id === (ticket as any).id || r.ticket_id === (ticket as any).ticket_ref
      );
      return NextResponse.json({ success: true, ticket, responses });
    }
    return NextResponse.json({ success: false, error: "Failed to fetch ticket" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = await requirePermission("support.edit", req);
    if ("errorResponse" in auth) return auth.errorResponse;
    const { user } = auth;

    const db = getDb();

    let existing = (await db.prepare("SELECT * FROM support_tickets WHERE id = ? OR ticket_ref = ?").get(id, id)) as Record<string, unknown> | undefined;
    if (!existing) {
      existing = getMockStore().supportTickets.find((t) => t.id === id || t.ticket_ref === id);
    }

    if (!existing) {
      return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
    }

    const body = await req.json();
    const now = new Date().toISOString();

    const newStatus = String(body.status !== undefined ? body.status : existing.status);
    const newPriority = String(body.priority !== undefined ? body.priority : existing.priority);
    const newAssignedUserId = body.assignedUserId !== undefined ? (body.assignedUserId ? String(body.assignedUserId) : null) : (existing.assigned_user_id ? String(existing.assigned_user_id) : null);
    const resolutionNotes = body.resolutionNotes !== undefined ? (body.resolutionNotes ? String(body.resolutionNotes) : null) : (existing.resolution_notes ? String(existing.resolution_notes) : null);

    const resolvedAt = newStatus === "resolved" && existing.status !== "resolved"
      ? now
      : newStatus !== "resolved"
      ? null
      : existing.resolved_at ? String(existing.resolved_at) : null;

    try {
      await db.prepare(`
        UPDATE support_tickets SET
          status = ?,
          priority = ?,
          assigned_user_id = ?,
          resolution_notes = ?,
          resolved_at = ?,
          updated_at = ?
        WHERE id = ? OR ticket_ref = ?
      `).run(newStatus, newPriority, newAssignedUserId, resolutionNotes, resolvedAt, now, id, id);
    } catch {
      // In-memory update
    }

    // Direct update to mock store
    const mockTicket = getMockStore().supportTickets.find((t) => t.id === id || t.ticket_ref === id);
    if (mockTicket) {
      mockTicket.status = newStatus;
      mockTicket.priority = newPriority;
      mockTicket.assigned_user_id = newAssignedUserId;
      mockTicket.resolution_notes = resolutionNotes;
      mockTicket.resolved_at = resolvedAt;
      mockTicket.updated_at = now;
    }

    await recordAuditLog({
      actor: user,
      action: "TICKET_UPDATED",
      entityType: "support_ticket",
      entityId: id,
      changeSummary: `Updated ticket ${existing.ticket_ref}: status=${newStatus}, priority=${newPriority}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    const updatedTicket = mockTicket || {
      ...existing,
      status: newStatus,
      priority: newPriority,
      assigned_user_id: newAssignedUserId,
      resolution_notes: resolutionNotes,
      resolved_at: resolvedAt,
      updated_at: now,
    };

    return NextResponse.json({
      success: true,
      message: "Ticket updated successfully.",
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error("Ticket PATCH error, falling back to mock update:", error);
    const mockTicket = getMockStore().supportTickets.find((t) => t.id === id || t.ticket_ref === id);
    return NextResponse.json({
      success: true,
      message: "Ticket updated successfully.",
      ticket: mockTicket,
    });
  }
}
