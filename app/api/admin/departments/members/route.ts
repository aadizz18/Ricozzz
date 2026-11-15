import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { getDb } from "@/lib/admin/db";
import { getInsforgeAdminClient } from "@/lib/insforge";
import { recordAuditLog } from "@/lib/admin/audit";

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission("departments.view", req);
    if ("errorResponse" in auth) return auth.errorResponse;

    const db = getDb();
    const today = new Date().toISOString().split("T")[0];

    const members = await db.prepare(`
      SELECT 
        u.id, u.email, u.full_name, u.role, u.department_id, u.status, u.avatar, u.last_login_at, u.created_at,
        d.name as department_name,
        (SELECT count(*) FROM tasks t WHERE t.assignee_id = u.id AND t.status != 'completed') as active_tasks,
        (SELECT count(*) FROM tasks t WHERE t.assignee_id = u.id AND t.status = 'completed') as completed_tasks,
        (SELECT count(*) FROM tasks t WHERE t.assignee_id = u.id AND t.status != 'completed' AND t.due_date < ?) as overdue_tasks
      FROM admin_users u
      LEFT JOIN departments d ON u.department_id = d.id
      ORDER BY (u.role = 'super_admin') DESC, u.full_name ASC
    `).all(today);

    return NextResponse.json({
      success: true,
      members,
    });
  } catch (error) {
    console.error("Team members GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch team members" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePermission("users.create", req);
    if ("errorResponse" in auth) return auth.errorResponse;
    const { user } = auth;

    const body = await req.json();
    const { email, fullName, role, departmentId, password } = body;

    if (!email || !fullName || !role || !password) {
      return NextResponse.json({ success: false, error: "Email, Full Name, Role, and Password are required." }, { status: 400 });
    }

    const db = getDb();
    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists in admin_users
    const existing = await db.prepare("SELECT id FROM admin_users WHERE LOWER(email) = ?").get(normalizedEmail);
    if (existing) {
      return NextResponse.json({ success: false, error: "A user with this email address already exists." }, { status: 400 });
    }

    // Verify role exists
    const roleRow = (await db.prepare("SELECT id, hierarchy_level FROM admin_roles WHERE slug = ? AND is_active = true").get(role)) as { id: string; hierarchy_level: number } | undefined;
    if (!roleRow) {
      return NextResponse.json({ success: false, error: "Specified role is invalid or inactive." }, { status: 422 });
    }

    // Prevent privilege escalation: user cannot assign a role higher or equal to their own unless Super Admin
    if (user.role !== "super_admin") {
      const actorRole = (await db.prepare("SELECT hierarchy_level FROM admin_roles WHERE slug = ?").get(user.role)) as { hierarchy_level: number } | undefined;
      const actorLevel = actorRole?.hierarchy_level ?? 99;
      if (roleRow.hierarchy_level <= actorLevel) {
        return NextResponse.json(
          { success: false, error: "Privilege escalation blocked: Cannot create user with equal or higher authority." },
          { status: 403 }
        );
      }
    }

    // Provision identity in InsForge Auth (auth.users)
    const adminClient = getInsforgeAdminClient();
    let authUserId: string;

    const existingAuthUser = (await db.prepare("SELECT id FROM auth.users WHERE LOWER(email) = ?").get(normalizedEmail)) as { id: string } | undefined;
    if (existingAuthUser) {
      authUserId = existingAuthUser.id;
      await db.prepare("UPDATE auth.users SET email_verified = true WHERE id = ?").run(authUserId);
    } else {
      const signupRes = await adminClient.auth.signUp({
        email: normalizedEmail,
        password,
        name: fullName.trim(),
      });

      if (signupRes.error) {
        return NextResponse.json({ success: false, error: `Auth registration failed: ${signupRes.error.message}` }, { status: 400 });
      }

      await db.prepare("UPDATE auth.users SET email_verified = true WHERE LOWER(email) = ?").run(normalizedEmail);
      const createdAuthUser = (await db.prepare("SELECT id FROM auth.users WHERE LOWER(email) = ?").get(normalizedEmail)) as { id: string } | undefined;
      if (!createdAuthUser) {
        return NextResponse.json({ success: false, error: "Failed to provision identity record." }, { status: 500 });
      }
      authUserId = createdAuthUser.id;
    }

    const initials = fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "U";
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO admin_users (id, email, full_name, role, department_id, status, avatar, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `).run(authUserId, normalizedEmail, fullName.trim(), role, departmentId || null, initials, now, now);

    if (departmentId) {
      await db.prepare(`
        INSERT INTO admin_department_members (admin_user_id, department_id, membership_role, is_primary, created_at)
        VALUES (?, ?, 'member', true, ?)
        ON CONFLICT (admin_user_id, department_id) DO UPDATE SET is_primary = true
      `).run(authUserId, departmentId, now);
    }

    await recordAuditLog({
      actor: user,
      action: "USER_PROVISIONED",
      entityType: "admin_user",
      entityId: authUserId,
      changeSummary: `Provisioned user ${fullName} (${role}) in department ${departmentId || "unassigned"}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: "Team member provisioned successfully.",
      user: {
        id: authUserId,
        email: normalizedEmail,
        fullName,
        role,
        departmentId,
      },
    });
  } catch (error) {
    console.error("Team member POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to provision user" }, { status: 500 });
  }
}
