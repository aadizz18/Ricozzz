import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/auth/userAuth";
import { getDb } from "@/lib/admin/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/notifications
 * Retrieves all stored notifications for the authenticated user from PostgreSQL.
 */
export async function GET() {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const db = getDb();
    const rows = (await db.prepare(`
      SELECT id, title, message, type, link, is_read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(session.userId)) as Array<{
      id: string;
      title: string;
      message: string;
      type: string;
      link: string | null;
      is_read: boolean;
      created_at: string;
    }>;

    const unreadCount = rows.filter((r) => !r.is_read).length;

    return NextResponse.json({
      success: true,
      notifications: rows,
      unreadCount,
    });
  } catch (error: any) {
    console.error("GET /api/user/notifications error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve notifications." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/notifications
 * Updates notification read state for the authenticated user.
 * Supports:
 * - { notificationId: string, isRead?: boolean }
 * - { markAllRead: true }
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { notificationId, markAllRead } = body;
    const db = getDb();

    if (markAllRead) {
      await db.prepare(`
        UPDATE notifications
        SET is_read = TRUE
        WHERE user_id = ? AND is_read = FALSE
      `).run(session.userId);

      return NextResponse.json({
        success: true,
        message: "All notifications marked as read.",
      });
    }

    if (!notificationId || typeof notificationId !== "string") {
      return NextResponse.json(
        { success: false, error: "Notification ID is required." },
        { status: 400 }
      );
    }

    await db.prepare(`
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = ? AND user_id = ?
    `).run(notificationId, session.userId);

    return NextResponse.json({
      success: true,
      message: "Notification marked as read.",
    });
  } catch (error: any) {
    console.error("PATCH /api/user/notifications error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update notification." },
      { status: 500 }
    );
  }
}
