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
    const auth = await requirePermission("tasks.edit", req);
    if ("errorResponse" in auth) return auth.errorResponse;
    const { user } = auth;

    const { id } = await params;
    const body = await req.json();
    const { comment, isBlockerUpdate } = body;

    if (!comment || typeof comment !== "string" || !comment.trim()) {
      return NextResponse.json({ success: false, error: "Comment text cannot be empty." }, { status: 400 });
    }

    const db = getDb();
    const commentId = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      await db.prepare(`
        INSERT INTO task_comments (id, task_id, user_id, comment, is_blocker_update, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `).run(commentId, id, user.id, comment.trim(), Boolean(isBlockerUpdate));
    } catch {
      // In-memory fallback
    }

    // Direct push to mockStore
    getMockStore().taskComments.push({
      id: commentId,
      task_id: id,
      user_id: user.id,
      comment: comment.trim(),
      is_blocker_update: Boolean(isBlockerUpdate),
      created_at: now,
      user_name: user.fullName || "Elena Ramos",
      user_avatar: user.avatar || "ER",
      user_role: user.role || "Operations Lead",
    });

    await recordAuditLog({
      actor: user,
      action: "TASK_COMMENT_ADDED",
      entityType: "task",
      entityId: id,
      changeSummary: `Added comment to task ${id}${isBlockerUpdate ? " (blocker update)" : ""}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, message: "Comment added successfully." });
  } catch (error) {
    console.error("Task comment error:", error);
    return NextResponse.json({ success: false, error: "Failed to post comment" }, { status: 500 });
  }
}
