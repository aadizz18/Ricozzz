import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { getDb } from "@/lib/admin/db";
import { getMockStore } from "@/lib/admin/mockStore";

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission("notifications.view", req);
    if ("errorResponse" in auth) return auth.errorResponse;
    const { user } = auth;

    const db = getDb();
    let notifications = await db.prepare(`
      SELECT id, user_id, title, message, type, link, is_read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(user.id);

    if (!notifications || notifications.length === 0) {
      notifications = getMockStore().notifications;
    }

    return NextResponse.json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error("Notifications GET error, returning mock notifications:", error);
    return NextResponse.json({ success: true, notifications: getMockStore().notifications });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requirePermission("notifications.manage", req);
    if ("errorResponse" in auth) return auth.errorResponse;
    const { user } = auth;

    const db = getDb();
    const body = await req.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      await db.prepare("UPDATE notifications SET is_read = TRUE WHERE user_id = ?").run(user.id);
    } else if (notificationId) {
      await db.prepare("UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?").run(notificationId, user.id);
    }

    return NextResponse.json({ success: true, message: "Notifications updated." });
  } catch (error) {
    console.error("Notifications PATCH error:", error);
    return NextResponse.json({ success: false, error: "Failed to update notifications" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requirePermission("notifications.manage", req);
    if ("errorResponse" in auth) return auth.errorResponse;
    const { user } = auth;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Notification id required" }, { status: 400 });
    }

    const db = getDb();
    await db.prepare("DELETE FROM notifications WHERE id = ? AND user_id = ?").run(id, user.id);
    return NextResponse.json({ success: true, message: "Notification deleted." });
  } catch (error) {
    console.error("Notifications DELETE error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete notification" }, { status: 500 });
  }
}
