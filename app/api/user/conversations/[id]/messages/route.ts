import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUserSession } from "@/lib/auth/userAuth";
import { getDb } from "@/lib/admin/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/conversations/[id]/messages
 * Retrieves all messages in a specific conversation thread.
 * Only accessible by thread participants.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const db = getDb();

    try {
      const conv = (await db.prepare(`
        SELECT * FROM conversations WHERE id = ?
      `).get(id)) as { participant_a: string; participant_b: string } | undefined;

      if (!conv) {
        return NextResponse.json(
          { success: false, error: "Conversation not found." },
          { status: 404 }
        );
      }

      if (conv.participant_a !== session.userId && conv.participant_b !== session.userId) {
        return NextResponse.json(
          { success: false, error: "Unauthorized: You are not a participant in this conversation." },
          { status: 403 }
        );
      }

      // Mark unread messages sent by peer as read
      await db.prepare(`
        UPDATE messages
        SET is_read = TRUE
        WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE
      `).run(id, session.userId);

      const messages = (await db.prepare(`
        SELECT m.*, u.full_name as sender_name, u.avatar_url as sender_avatar
        FROM messages m
        JOIN user_profiles u ON m.sender_id = u.id
        WHERE m.conversation_id = ?
        ORDER BY m.created_at ASC
      `).all(id)) as any[];

      return NextResponse.json({
        success: true,
        messages,
      });
    } catch (dbErr: any) {
      const errMsg = String(dbErr?.message || "");
      if (errMsg.includes("does not exist") || errMsg.includes("42P01")) {
        return NextResponse.json({
          success: true,
          messages: [],
          pendingMigration: true,
        });
      }
      throw dbErr;
    }
  } catch (error: any) {
    console.error("GET /api/user/conversations/[id]/messages error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve messages." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/conversations/[id]/messages
 * Appends a new message to the conversation thread.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { success: false, error: "Message content cannot be empty." },
        { status: 400 }
      );
    }

    const db = getDb();
    try {
      const conv = (await db.prepare(`
        SELECT * FROM conversations WHERE id = ?
      `).get(id)) as { participant_a: string; participant_b: string } | undefined;

      if (!conv) {
        return NextResponse.json(
          { success: false, error: "Conversation not found." },
          { status: 404 }
        );
      }

      if (conv.participant_a !== session.userId && conv.participant_b !== session.userId) {
        return NextResponse.json(
          { success: false, error: "Unauthorized: You are not a participant in this conversation." },
          { status: 403 }
        );
      }

      const msgId = crypto.randomUUID();
      const cleanContent = content.trim();

      await db.prepare(`
        INSERT INTO messages (id, conversation_id, sender_id, content, is_read, created_at)
        VALUES (?, ?, ?, ?, FALSE, NOW())
      `).run(msgId, id, session.userId, cleanContent);

      await db.prepare(`
        UPDATE conversations
        SET last_message_text = ?, last_message_at = NOW(), updated_at = NOW()
        WHERE id = ?
      `).run(cleanContent.slice(0, 100), id);

      const recipientId = conv.participant_a === session.userId ? conv.participant_b : conv.participant_a;
      await db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, link, is_read, created_at)
        VALUES (?, ?, 'New Direct Message', ?, 'system', '/dashboard/company/messages', FALSE, NOW())
      `).run(
        crypto.randomUUID(),
        recipientId,
        `You received a message from ${session.fullName}`
      );

      return NextResponse.json(
        {
          success: true,
          messageId: msgId,
          message: {
            id: msgId,
            conversation_id: id,
            sender_id: session.userId,
            sender_name: session.fullName,
            content: cleanContent,
            created_at: new Date().toISOString(),
          },
        },
        { status: 201 }
      );
    } catch (dbErr: any) {
      const errMsg = String(dbErr?.message || "");
      if (errMsg.includes("does not exist") || errMsg.includes("42P01")) {
        return NextResponse.json({
          success: true,
          messageId: `msg-${Date.now()}`,
          pendingMigration: true,
        });
      }
      throw dbErr;
    }
  } catch (error: any) {
    console.error("POST /api/user/conversations/[id]/messages error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send message." },
      { status: 500 }
    );
  }
}
