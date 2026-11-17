import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/admin/db";
import { requirePermission } from "@/lib/admin/auth";
import { recordAuditLog } from "@/lib/admin/audit";
import { getMockStore } from "@/lib/admin/mockStore";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("departments.assign_head", req);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const { id: departmentId } = await params;
    const body = await req.json();
    const { headUserId } = body;

    const db = getDb();
    let dept = (await db.prepare("SELECT * FROM departments WHERE id = ?").get(departmentId)) as Record<string, unknown> | undefined;
    if (!dept) {
      dept = getMockStore().departments.find((d) => d.id === departmentId);
    }

    if (!dept) {
      return NextResponse.json({ success: false, error: "Department not found." }, { status: 404 });
    }

    let headName = "None";
    if (headUserId) {
      let targetUser = (await db.prepare("SELECT id, full_name, email, status, role FROM admin_users WHERE id = ?").get(headUserId)) as Record<string, unknown> | undefined;
      if (!targetUser) {
        targetUser = getMockStore().users.find((u) => u.id === headUserId);
      }
      if (targetUser) {
        headName = String(targetUser.full_name || targetUser.fullName);
      }
    }

    try {
      await db.prepare("UPDATE departments SET head_user_id = ? WHERE id = ?").run(headUserId || null, departmentId);
    } catch {
      // In-memory update
    }

    const mockDept = getMockStore().departments.find((d) => d.id === departmentId);
    if (mockDept) {
      mockDept.headUserId = headUserId;
      mockDept.headUserName = headName;
    }

    await recordAuditLog({
      actor: auth.user,
      action: "DEPARTMENT_HEAD_ASSIGNED",
      entityType: "department",
      entityId: departmentId,
      changeSummary: `Assigned ${headName} (${headUserId || "unassigned"}) as Department Head for ${dept.name}.`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: `Department head for ${dept.name} updated successfully.`,
      departmentId,
      headUserId,
      headUserName: headName,
    });
  } catch (error) {
    console.error("Department head assignment error:", error);
    return NextResponse.json({ success: false, error: "Failed to reassign department head." }, { status: 500 });
  }
}
