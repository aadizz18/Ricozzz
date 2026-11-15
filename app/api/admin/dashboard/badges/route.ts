import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/admin/db";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if ("errorResponse" in auth) return auth.errorResponse;
    const { user } = auth;

    const db = getDb();
    const today = new Date().toISOString().split("T")[0];

    // Overdue tasks
    const overdueRow = (await db.prepare(`
      SELECT count(*) as count FROM tasks 
      WHERE status != 'completed' AND due_date < ?
    `).get(today)) as { count: string | number } | undefined;

    // Open/Escalated tickets
    const ticketRow = (await db.prepare(`
      SELECT count(*) as count FROM support_tickets 
      WHERE status IN ('open', 'escalated')
    `).get()) as { count: string | number } | undefined;

    // Pending vendors
    const vendorRow = (await db.prepare(`
      SELECT count(*) as count FROM vendors 
      WHERE verification_status = 'pending_review'
    `).get()) as { count: string | number } | undefined;

    // Unread notifications for current user
    const notifRow = (await db.prepare(`
      SELECT count(*) as count FROM notifications 
      WHERE user_id = ? AND is_read = FALSE
    `).get(user.id)) as { count: string | number } | undefined;

    const counts = {
      overdueTasks: Number(overdueRow?.count || 0),
      openTickets: Number(ticketRow?.count || 0),
      pendingVendors: Number(vendorRow?.count || 0),
      unreadNotifications: Number(notifRow?.count || 0),
    };

    return NextResponse.json({
      success: true,
      counts,
      badges: counts,
    });
  } catch (error) {
    console.error("Dashboard badges API error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch badge counts" }, { status: 500 });
  }
}
