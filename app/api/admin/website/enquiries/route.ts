import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { getDb } from "@/lib/admin/db";
import { recordAuditLog } from "@/lib/admin/audit";

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission("website.view", req);
    if ("errorResponse" in auth) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim().toLowerCase();

    const db = getDb();
    let query = `
      SELECT 
        e.id, e.full_name, e.email, e.company, e.mandate_type, e.timeline,
        e.project_brief, e.budget_range, e.status, e.client_id, e.created_at, e.updated_at,
        c.onboarding_stage as client_stage
      FROM website_enquiries e
      LEFT JOIN clients c ON e.client_id = c.id
      WHERE 1=1
    `;
    const params: string[] = [];

    if (status && status !== "all") {
      query += " AND e.status = ?";
      params.push(status);
    }

    if (search) {
      query += " AND (LOWER(e.full_name) LIKE ? OR LOWER(e.email) LIKE ? OR LOWER(e.company) LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += " ORDER BY e.created_at DESC";

    const enquiries = await db.prepare(query).all(...params);

    return NextResponse.json({
      success: true,
      enquiries,
    });
  } catch (error) {
    console.error("Website enquiries GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch website enquiries" },
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
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: "Enquiry ID and status are required." },
        { status: 400 }
      );
    }

    const validStatuses = ["new", "reviewed", "contacted", "converted", "archived"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status value." },
        { status: 400 }
      );
    }

    const db = getDb();
    const existing = (await db.prepare(
      "SELECT id, full_name, company, client_id FROM website_enquiries WHERE id = ?"
    ).get(id)) as { id: string; full_name: string; company: string; client_id: string | null } | undefined;

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Enquiry not found." },
        { status: 404 }
      );
    }

    await db.prepare(`
      UPDATE website_enquiries SET
        status = ?,
        updated_at = NOW()
      WHERE id = ?
    `).run(status, id);

    // If marked as converted, ensure client record moves to kickoff / active
    if (status === "converted" && existing.client_id) {
      await db.prepare(`
        UPDATE clients SET
          onboarding_stage = 'contract_review',
          updated_at = NOW()
        WHERE id = ?
      `).run(existing.client_id);
    }

    await recordAuditLog({
      actor: user,
      action: "WEBSITE_ENQUIRY_UPDATED",
      entityType: "website_enquiry",
      entityId: id,
      changeSummary: `Updated status to "${status}" for inquiry from ${existing.full_name} (${existing.company}).`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      enquiry: { id, status },
      message: `Enquiry status updated to ${status}.`,
    });
  } catch (error) {
    console.error("Website enquiries PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update enquiry status" },
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
        { success: false, error: "Enquiry ID is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    await db.prepare("DELETE FROM website_enquiries WHERE id = ?").run(id);

    await recordAuditLog({
      actor: user,
      action: "WEBSITE_ENQUIRY_DELETED",
      entityType: "website_enquiry",
      entityId: id,
      changeSummary: `Deleted website enquiry ${id}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: "Enquiry deleted successfully.",
    });
  } catch (error) {
    console.error("Website enquiries DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete enquiry" },
      { status: 500 }
    );
  }
}
