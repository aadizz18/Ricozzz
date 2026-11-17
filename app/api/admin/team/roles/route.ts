import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/admin/db";
import { requirePermission, requireSuperAdmin } from "@/lib/admin/auth";
import { getAllRoles } from "@/lib/admin/permissions";
import { recordAuditLog } from "@/lib/admin/audit";
import { DEFAULT_ROLES } from "@/lib/demo/seedData";

export async function GET(req: NextRequest) {
  const auth = await requirePermission("users.view", req);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const roles = await getAllRoles();
    return NextResponse.json({ success: true, roles: roles && roles.length > 0 ? roles : DEFAULT_ROLES });
  } catch (error) {
    console.error("Roles GET error, returning default roles:", error);
    return NextResponse.json({ success: true, roles: DEFAULT_ROLES });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const body = await req.json();
    const { roleId, permissionSlugs } = body;

    if (!roleId || !Array.isArray(permissionSlugs)) {
      return NextResponse.json({ success: false, error: "roleId and permissionSlugs array are required." }, { status: 422 });
    }

    const db = getDb();
    const role = (await db.prepare("SELECT * FROM admin_roles WHERE id = ?").get(roleId)) as Record<string, unknown> | undefined;
    if (!role) {
      return NextResponse.json({ success: false, error: "Role not found." }, { status: 404 });
    }

    if (role.slug === "super_admin") {
      return NextResponse.json({ success: false, error: "Super Admin permissions cannot be modified." }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Remove existing permissions for this role
    await db.prepare("DELETE FROM admin_role_permissions WHERE role_id = ?").run(roleId);

    // Re-assign specified permissions
    const insertStmt = db.prepare(`
      INSERT INTO admin_role_permissions (role_id, permission_id, created_at)
      SELECT ?, id, ?
      FROM admin_permissions
      WHERE slug = ?
    `);

    for (const slug of permissionSlugs) {
      await insertStmt.run(roleId, now, slug);
    }

    await db.prepare("UPDATE admin_roles SET updated_at = NOW() WHERE id = ?").run(roleId);

    await recordAuditLog({
      actor: auth.user,
      action: "ROLE_PERMISSIONS_UPDATE",
      entityType: "admin_role",
      entityId: roleId,
      changeSummary: `Updated permissions for role ${role.name} (${permissionSlugs.length} permissions assigned).`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: `Permissions updated for role ${role.name}.`,
    });
  } catch (error) {
    console.error("Roles PATCH error:", error);
    return NextResponse.json({ success: false, error: "Failed to update role permissions." }, { status: 500 });
  }
}
