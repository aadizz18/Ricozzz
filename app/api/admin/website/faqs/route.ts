import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { requirePermission } from "@/lib/admin/auth";
import { getDb } from "@/lib/admin/db";
import { recordAuditLog } from "@/lib/admin/audit";

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission("website.view", req);
    if ("errorResponse" in auth) return auth.errorResponse;

    const db = getDb();
    const faqs = await db.prepare(`
      SELECT id, slug, category, question, answer, is_published, display_order, created_at, updated_at
      FROM website_faqs
      ORDER BY display_order ASC, created_at DESC
    `).all();

    return NextResponse.json({
      success: true,
      faqs,
    });
  } catch (error) {
    console.error("Website FAQs GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch FAQs" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePermission("website.edit", req);
    if ("errorResponse" in auth) return auth.errorResponse;
    const { user } = auth;

    const body = await req.json();
    const { question, answer, category = "general", isPublished = true } = body;

    if (!question || !answer) {
      return NextResponse.json(
        { success: false, error: "Question and Answer are required." },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = crypto.randomUUID();
    const slug = question.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) + "-" + id.slice(0, 6);

    const maxOrderRow = (await db.prepare("SELECT COALESCE(MAX(display_order), 0) as max_order FROM website_faqs").get()) as { max_order: number };
    const displayOrder = Number(maxOrderRow?.max_order || 0) + 1;

    await db.prepare(`
      INSERT INTO website_faqs (id, slug, category, question, answer, is_published, display_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `).run(id, slug, category, question.trim(), answer.trim(), Boolean(isPublished), displayOrder);

    await recordAuditLog({
      actor: user,
      action: "WEBSITE_FAQ_CREATED",
      entityType: "website_faq",
      entityId: id,
      changeSummary: `Created FAQ "${question.trim()}"`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json(
      {
        success: true,
        faqId: id,
        message: "FAQ created successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Website FAQ POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create FAQ" },
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
    const { id, question, answer, category, isPublished, displayOrder } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "FAQ ID is required." },
        { status: 400 }
      );
    }

    const db = getDb();
    const existing = (await db.prepare("SELECT id, question, is_published FROM website_faqs WHERE id = ?").get(id)) as { id: string; question: string; is_published: boolean } | undefined;
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "FAQ not found." },
        { status: 404 }
      );
    }

    const nextQ = question !== undefined ? question.trim() : existing.question;
    const nextPub = isPublished !== undefined ? Boolean(isPublished) : existing.is_published;

    await db.prepare(`
      UPDATE website_faqs SET
        question = ?,
        answer = COALESCE(?, answer),
        category = COALESCE(?, category),
        is_published = ?,
        display_order = COALESCE(?, display_order),
        updated_at = NOW()
      WHERE id = ?
    `).run(nextQ, answer ? answer.trim() : null, category ? category.trim() : null, nextPub, displayOrder !== undefined ? Number(displayOrder) : null, id);

    await recordAuditLog({
      actor: user,
      action: "WEBSITE_FAQ_UPDATED",
      entityType: "website_faq",
      entityId: id,
      changeSummary: `Updated FAQ "${existing.question}" (published: ${nextPub})`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: "FAQ updated successfully.",
    });
  } catch (error) {
    console.error("Website FAQ PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update FAQ" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requirePermission("website.edit", req);
    if ("errorResponse" in auth) return auth.errorResponse;
    const { user } = auth;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "FAQ ID is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    await db.prepare("DELETE FROM website_faqs WHERE id = ?").run(id);

    await recordAuditLog({
      actor: user,
      action: "WEBSITE_FAQ_DELETED",
      entityType: "website_faq",
      entityId: id,
      changeSummary: `Deleted FAQ ${id}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: "FAQ deleted successfully.",
    });
  } catch (error) {
    console.error("Website FAQ DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete FAQ" },
      { status: 500 }
    );
  }
}
