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
    const testimonials = await db.prepare(`
      SELECT id, client_name, company, role, quote, rating, avatar_url, is_featured, is_published, display_order, created_at, updated_at
      FROM website_testimonials
      ORDER BY display_order ASC, created_at DESC
    `).all();

    return NextResponse.json({
      success: true,
      testimonials,
    });
  } catch (error) {
    console.error("Website testimonials GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch testimonials" },
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
    const { clientName, company, role, quote, rating = 5, isFeatured = false, isPublished = true } = body;

    if (!clientName || !company || !role || !quote) {
      return NextResponse.json(
        { success: false, error: "Client name, company, role, and quote are required." },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = crypto.randomUUID();
    const maxOrderRow = (await db.prepare("SELECT COALESCE(MAX(display_order), 0) as max_order FROM website_testimonials").get()) as { max_order: number };
    const displayOrder = Number(maxOrderRow?.max_order || 0) + 1;

    await db.prepare(`
      INSERT INTO website_testimonials (id, client_name, company, role, quote, rating, is_featured, is_published, display_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `).run(id, clientName.trim(), company.trim(), role.trim(), quote.trim(), Number(rating) || 5, Boolean(isFeatured), Boolean(isPublished), displayOrder);

    await recordAuditLog({
      actor: user,
      action: "WEBSITE_TESTIMONIAL_CREATED",
      entityType: "website_testimonial",
      entityId: id,
      changeSummary: `Created testimonial from ${clientName} (${company})`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json(
      {
        success: true,
        testimonialId: id,
        message: "Testimonial created successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Website testimonial POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create testimonial" },
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
    const { id, clientName, company, role, quote, rating, isFeatured, isPublished, displayOrder } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Testimonial ID is required." },
        { status: 400 }
      );
    }

    const db = getDb();
    const existing = (await db.prepare("SELECT id, client_name, company, is_published FROM website_testimonials WHERE id = ?").get(id)) as { id: string; client_name: string; company: string; is_published: boolean } | undefined;
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Testimonial not found." },
        { status: 404 }
      );
    }

    const nextPublished = isPublished !== undefined ? Boolean(isPublished) : existing.is_published;

    await db.prepare(`
      UPDATE website_testimonials SET
        client_name = COALESCE(?, client_name),
        company = COALESCE(?, company),
        role = COALESCE(?, role),
        quote = COALESCE(?, quote),
        rating = COALESCE(?, rating),
        is_featured = COALESCE(?, is_featured),
        is_published = ?,
        display_order = COALESCE(?, display_order),
        updated_at = NOW()
      WHERE id = ?
    `).run(
      clientName ? clientName.trim() : null,
      company ? company.trim() : null,
      role ? role.trim() : null,
      quote ? quote.trim() : null,
      rating !== undefined ? Number(rating) : null,
      isFeatured !== undefined ? Boolean(isFeatured) : null,
      nextPublished,
      displayOrder !== undefined ? Number(displayOrder) : null,
      id
    );

    await recordAuditLog({
      actor: user,
      action: "WEBSITE_TESTIMONIAL_UPDATED",
      entityType: "website_testimonial",
      entityId: id,
      changeSummary: `Updated testimonial from ${existing.client_name} (published: ${nextPublished})`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: "Testimonial updated successfully.",
    });
  } catch (error) {
    console.error("Website testimonial PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update testimonial" },
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
        { success: false, error: "Testimonial ID is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    await db.prepare("DELETE FROM website_testimonials WHERE id = ?").run(id);

    await recordAuditLog({
      actor: user,
      action: "WEBSITE_TESTIMONIAL_DELETED",
      entityType: "website_testimonial",
      entityId: id,
      changeSummary: `Deleted testimonial ${id}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: "Testimonial deleted successfully.",
    });
  } catch (error) {
    console.error("Website testimonial DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete testimonial" },
      { status: 500 }
    );
  }
}
