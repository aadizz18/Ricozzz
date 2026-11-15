import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/auth/userAuth";
import { getDb } from "@/lib/admin/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/projects/[id]
 * Retrieves details for a specific project.
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
      const project = await db.prepare(`
        SELECT * FROM client_projects WHERE id = ?
      `).get(id);

      if (!project) {
        return NextResponse.json(
          { success: false, error: "Project not found." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        project,
      });
    } catch (dbErr: any) {
      const errMsg = String(dbErr?.message || "");
      if (errMsg.includes("does not exist") || errMsg.includes("42P01")) {
        return NextResponse.json(
          { success: false, error: "Project records pending database migration.", pendingMigration: true },
          { status: 404 }
        );
      }
      throw dbErr;
    }
  } catch (error: any) {
    console.error("GET /api/user/projects/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve project." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/projects/[id]
 * Updates project details. Strictly enforced: only owning company can edit.
 */
export async function PATCH(
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
    const db = getDb();

    try {
      const existing = (await db.prepare(
        "SELECT company_user_id FROM client_projects WHERE id = ?"
      ).get(id)) as { company_user_id: string } | undefined;

      if (!existing) {
        return NextResponse.json(
          { success: false, error: "Project not found." },
          { status: 404 }
        );
      }

      if (existing.company_user_id !== session.userId) {
        return NextResponse.json(
          { success: false, error: "Unauthorized: You do not own this project." },
          { status: 403 }
        );
      }

      const updates: string[] = [];
      const values: any[] = [];

      if (body.title) {
        updates.push("title = ?");
        values.push(body.title.trim());
      }
      if (body.status) {
        updates.push("status = ?");
        values.push(body.status.trim());
      }
      if (body.timeline) {
        updates.push("timeline = ?");
        values.push(body.timeline.trim());
      }
      if (body.budgetRange) {
        updates.push("budget_range = ?");
        values.push(body.budgetRange.trim());
      }
      if (body.projectBrief) {
        updates.push("project_brief = ?");
        values.push(body.projectBrief.trim());
      }

      if (updates.length === 0) {
        return NextResponse.json({ success: true, message: "No updates provided." });
      }

      updates.push("updated_at = NOW()");
      values.push(id);

      await db.prepare(`
        UPDATE client_projects
        SET ${updates.join(", ")}
        WHERE id = ?
      `).run(...values);

      return NextResponse.json({
        success: true,
        message: "Project updated successfully.",
      });
    } catch (dbErr: any) {
      const errMsg = String(dbErr?.message || "");
      if (errMsg.includes("does not exist") || errMsg.includes("42P01")) {
        return NextResponse.json(
          { success: false, error: "client_projects table pending migration." },
          { status: 500 }
        );
      }
      throw dbErr;
    }
  } catch (error: any) {
    console.error("PATCH /api/user/projects/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update project." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/projects/[id]
 * Archives project (soft delete). Strictly enforced: only owning company can delete.
 */
export async function DELETE(
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
      const existing = (await db.prepare(
        "SELECT company_user_id FROM client_projects WHERE id = ?"
      ).get(id)) as { company_user_id: string } | undefined;

      if (!existing) {
        return NextResponse.json(
          { success: false, error: "Project not found." },
          { status: 404 }
        );
      }

      if (existing.company_user_id !== session.userId) {
        return NextResponse.json(
          { success: false, error: "Unauthorized: You do not own this project." },
          { status: 403 }
        );
      }

      await db.prepare(
        "UPDATE client_projects SET status = 'Archived', updated_at = NOW() WHERE id = ?"
      ).run(id);

      return NextResponse.json({
        success: true,
        message: "Project archived successfully.",
      });
    } catch (dbErr: any) {
      const errMsg = String(dbErr?.message || "");
      if (errMsg.includes("does not exist") || errMsg.includes("42P01")) {
        return NextResponse.json(
          { success: false, error: "client_projects table pending migration." },
          { status: 500 }
        );
      }
      throw dbErr;
    }
  } catch (error: any) {
    console.error("DELETE /api/user/projects/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to archive project." },
      { status: 500 }
    );
  }
}
