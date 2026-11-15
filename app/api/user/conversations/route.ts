import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUserSession } from "@/lib/auth/userAuth";
import { getDb } from "@/lib/admin/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/conversations
 * Retrieves all conversation threads for current user.
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
    try {
      const rows = (await db.prepare(`
        SELECT c.*,
               CASE WHEN c.participant_a = ? THEN c.participant_b ELSE c.participant_a END as peer_id,
               u.full_name as peer_name,
               u.avatar_url as peer_avatar,
               u.account_type as peer_role,
               (SELECT count(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.is_read = FALSE) as unread_count
        FROM conversations c
        JOIN user_profiles u ON (CASE WHEN c.participant_a = ? THEN c.participant_b ELSE c.participant_a END) = u.id
        WHERE c.participant_a = ? OR c.participant_b = ?
        ORDER BY c.last_message_at DESC
      `).all(
        session.userId,
        session.userId,
        session.userId,
        session.userId,
        session.userId
      )) as any[];

      return NextResponse.json({
        success: true,
        conversations: rows,
      });
    } catch (dbErr: any) {
      const errMsg = String(dbErr?.message || "");
      if (errMsg.includes("does not exist") || errMsg.includes("42P01")) {
        return NextResponse.json({
          success: true,
          conversations: [],
          pendingMigration: true,
        });
      }
      throw dbErr;
    }
  } catch (error: any) {
    console.error("GET /api/user/conversations error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve conversations." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/conversations
 * Finds or initiates a conversation thread with another user.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { recipientId, projectId = null, initialMessage = "" } = body;

    if (!recipientId || typeof recipientId !== "string") {
      return NextResponse.json(
        { success: false, error: "recipientId is required." },
        { status: 400 }
      );
    }

    if (recipientId === session.userId) {
      return NextResponse.json(
        { success: false, error: "Cannot start a conversation with yourself." },
        { status: 400 }
      );
    }

    const db = getDb();
    try {
      // Check existing conversation
      const existing = (await db.prepare(`
        SELECT id FROM conversations
        WHERE (participant_a = ? AND participant_b = ?)
           OR (participant_a = ? AND participant_b = ?)
        LIMIT 1
      `).get(
        session.userId,
        recipientId,
        recipientId,
        session.userId
      )) as { id: string } | undefined;

      let convId = existing?.id;

      if (!convId) {
        convId = crypto.randomUUID();
        await db.prepare(`
          INSERT INTO conversations (
            id, participant_a, participant_b, project_id,
            last_message_text, last_message_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, NOW(), NOW(), NOW())
        `).run(
          convId,
          session.userId,
          recipientId,
          projectId,
          initialMessage.slice(0, 100)
        );
      }

      if (initialMessage.trim()) {
        const msgId = crypto.randomUUID();
        await db.prepare(`
          INSERT INTO messages (id, conversation_id, sender_id, content, is_read, created_at)
          VALUES (?, ?, ?, ?, FALSE, NOW())
        `).run(msgId, convId, session.userId, initialMessage.trim());

        await db.prepare(`
          UPDATE conversations
          SET last_message_text = ?, last_message_at = NOW(), updated_at = NOW()
          WHERE id = ?
        `).run(initialMessage.trim().slice(0, 100), convId);

        // Notify recipient
        await db.prepare(`
          INSERT INTO notifications (id, user_id, title, message, type, link, is_read, created_at)
          VALUES (?, ?, 'New Direct Message', ?, 'system', '/dashboard/company/messages', FALSE, NOW())
        `).run(
          crypto.randomUUID(),
          recipientId,
          `You received a new message from ${session.fullName}`
        );
      }

      return NextResponse.json({
        success: true,
        conversationId: convId,
      });
    } catch (dbErr: any) {
      const errMsg = String(dbErr?.message || "");
      if (errMsg.includes("does not exist") || errMsg.includes("42P01")) {
        return NextResponse.json({
          success: true,
          conversationId: `conv-${Date.now()}`,
          pendingMigration: true,
        });
      }
      throw dbErr;
    }
  } catch (error: any) {
    console.error("POST /api/user/conversations error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create conversation." },
      { status: 500 }
    );
  }
}
