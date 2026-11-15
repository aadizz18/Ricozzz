import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { getDb } from "@/lib/admin/db";
import { recordAuditLog } from "@/lib/admin/audit";

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission("website.view", req);
    if ("errorResponse" in auth) return auth.errorResponse;

    const db = getDb();
    const sections = await db.prepare(`
      SELECT id, section_key, page_slug, title, subtitle, content_payload, is_published, display_order, created_at, updated_at
      FROM website_content_sections
      ORDER BY page_slug ASC, display_order ASC
    `).all();

    return NextResponse.json({
      success: true,
      sections,
    });
  } catch (error) {
    console.error("Website sections GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch content sections" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requirePermission("website.edit", req);
    if ("errorResponse" in auth) return auth.errorResponse;
    const { user } = auth;

    const body = await req.json();
    const { id, title, subtitle, contentPayload, isPublished, displayOrder } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Section ID is required." },
        { status: 400 }
      );
    }

    const db = getDb();
    const existing = (await db.prepare(
      "SELECT id, section_key, title, is_published FROM website_content_sections WHERE id = ?"
    ).get(id)) as { id: string; section_key: string; title: string; is_published: boolean } | undefined;

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Section not found." },
        { status: 404 }
      );
    }

    const nextTitle = title !== undefined ? title.trim() : existing.title;
    const nextSubtitle = subtitle !== undefined ? subtitle.trim() : null;
    const nextPublished = isPublished !== undefined ? Boolean(isPublished) : existing.is_published;

    if (contentPayload !== undefined) {
      await db.prepare(`
        UPDATE website_content_sections SET
          title = ?,
          subtitle = ?,
          content_payload = ?::jsonb,
          is_published = ?,
          updated_at = NOW()
        WHERE id = ?
      `).run(nextTitle, nextSubtitle, JSON.stringify(contentPayload), nextPublished, id);
    } else {
      await db.prepare(`
        UPDATE website_content_sections SET
          title = ?,
          subtitle = ?,
          is_published = ?,
          updated_at = NOW()
        WHERE id = ?
      `).run(nextTitle, nextSubtitle, nextPublished, id);
    }

    await recordAuditLog({
      actor: user,
      action: "WEBSITE_SECTION_UPDATED",
      entityType: "website_section",
      entityId: id,
      changeSummary: `Updated section "${existing.section_key}" (published: ${nextPublished})`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: `Section "${existing.section_key}" updated successfully.`,
    });
  } catch (error) {
    console.error("Website sections PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update content section" },
      { status: 500 }
    );
  }
}
