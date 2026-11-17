import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { getDb } from "@/lib/admin/db";
import { recordAuditLog } from "@/lib/admin/audit";
import { getMockStore } from "@/lib/admin/mockStore";
import crypto from "node:crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission("support.edit", req);
    if ("errorResponse" in auth) return auth.errorResponse;
    const { user } = auth;

    const { id } = await params;
    const body = await req.json();
    const { message, isInternalNote } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ success: false, error: "Response message cannot be empty." }, { status: 400 });
    }

    const db = getDb();
    const responseId = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      await db.prepare(`
        INSERT INTO ticket_responses (id, ticket_id, user_id, message, is_internal_note, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(responseId, id, user.id, message.trim(), Boolean(isInternalNote), now);
    } catch {
      // In-memory fallback
    }

    // Direct push to mockStore
    getMockStore().ticketResponses.push({
      id: responseId,
      ticket_id: id,
      user_id: user.id,
      message: message.trim(),
      is_internal_note: Boolean(isInternalNote),
      created_at: now,
      user_name: user.fullName || "Elena Ramos",
      user_role: user.role || "Operations Lead",
    });

    await recordAuditLog({
      actor: user,
      action: "TICKET_RESPONSE_ADDED",
      entityType: "support_ticket",
      entityId: id,
      changeSummary: `Posted ${isInternalNote ? "internal note" : "reply"} to ticket ${id}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, message: "Response posted successfully." });
  } catch (error) {
    console.error("Ticket response POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to post response" }, { status: 500 });
  }
}
