import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/admin/db";
import { getInsforgeAdminClient } from "@/lib/insforge";
import { requirePermission } from "@/lib/admin/auth";
import { recordAuditLog } from "@/lib/admin/audit";

export async function GET(req: NextRequest) {
  const auth = await requirePermission("users.view", req);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const db = getDb();
    const rows = (await db.prepare(`
      SELECT 
        u.id, u.email, u.full_name, u.role, u.department_id, u.status, u.avatar, u.last_login_at, u.created_at,
        d.name as department_name,
        r.name as role_name, r.hierarchy_level,
        (SELECT COUNT(*) FROM admin_sessions s WHERE s.user_id = u.id AND s.expires_at > NOW()) as active_sessions_count,
        (SELECT COUNT(*) FROM admin_user_permissions up WHERE up.admin_user_id = u.id) as overrides_count
      FROM admin_users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN admin_roles r ON u.role = r.slug
      ORDER BY r.hierarchy_level ASC, u.full_name ASC
    `).all()) as Array<{
      id: string;
      email: string;
      full_name: string;
      role: string;
      department_id: string | null;
      status: string;
      avatar: string;
      last_login_at: string | null;
      created_at: string;
      department_name: string | null;
      role_name: string | null;
      hierarchy_level: number | null;
      active_sessions_count: number | string;
      overrides_count: number | string;
    }>;

    const users = rows.map((r) => ({
      id: r.id,
      email: r.email,
      fullName: r.full_name,
      role: r.role,
      roleName: r.role_name || r.role,
      hierarchyLevel: r.hierarchy_level ?? 99,
      departmentId: r.department_id,
      departmentName: r.department_name || "Unassigned",
      status: r.status,
      avatar: r.avatar,
      lastLoginAt: r.last_login_at,
      createdAt: r.created_at,
      activeSessionsCount: Number(r.active_sessions_count || 0),
      overridesCount: Number(r.overrides_count || 0),
    }));

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("Team users GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch team members." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("users.create", req);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const body = await req.json();
    const { email, fullName, role, departmentId, password } = body;

    if (!email || !fullName || !role || !password) {
      return NextResponse.json(
        { success: false, error: "Email, Full Name, Role, and Temporary Password are required." },
        { status: 422 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters long." },
        { status: 422 }
      );
    }

    const db = getDb();
    const normalizedEmail = email.trim().toLowerCase();

    // Check email uniqueness in admin_users
    const existing = await db.prepare("SELECT id FROM admin_users WHERE LOWER(email) = ?").get(normalizedEmail);
    if (existing) {
      return NextResponse.json({ success: false, error: "A team member with this email already exists." }, { status: 409 });
    }

    // Verify role exists
    const roleRow = (await db.prepare("SELECT id, hierarchy_level FROM admin_roles WHERE slug = ? AND is_active = true").get(role)) as { id: string; hierarchy_level: number } | undefined;
    if (!roleRow) {
      return NextResponse.json({ success: false, error: "Specified role is invalid or inactive." }, { status: 422 });
    }

    // Prevent privilege escalation: user cannot assign a role higher or equal to their own unless Super Admin
    if (auth.user.role !== "super_admin") {
      const actorRole = (await db.prepare("SELECT hierarchy_level FROM admin_roles WHERE slug = ?").get(auth.user.role)) as { hierarchy_level: number } | undefined;
      const actorLevel = actorRole?.hierarchy_level ?? 99;
      if (roleRow.hierarchy_level <= actorLevel) {
        return NextResponse.json(
          { success: false, error: "Privilege escalation blocked: Cannot create user with equal or higher authority." },
          { status: 403 }
        );
      }
    }

    // Provision in InsForge Auth
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

    const initials = fullName
      .split(" ")
      .map((p: string) => p[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO admin_users (id, email, full_name, role, department_id, status, avatar, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `).run(authUserId, normalizedEmail, fullName.trim(), role, departmentId || null, initials, now, now);

    // If departmentId assigned, register primary department membership
    if (departmentId) {
      await db.prepare(`
        INSERT INTO admin_department_members (admin_user_id, department_id, membership_role, is_primary, created_at)
        VALUES (?, ?, 'member', true, ?)
        ON CONFLICT (admin_user_id, department_id) DO UPDATE SET is_primary = true
      `).run(authUserId, departmentId, now);
    }

    await recordAuditLog({
      actor: auth.user,
      action: "USER_CREATE",
      entityType: "admin_user",
      entityId: authUserId,
      changeSummary: `Created team member ${fullName} (${role}) in department ${departmentId || "unassigned"}.`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: "Team member provisioned successfully.",
      user: {
        id: authUserId,
        email: normalizedEmail,
        fullName: fullName.trim(),
        role,
        departmentId: departmentId || null,
        status: "active",
      },
    });
  } catch (error) {
    console.error("Team user POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to create team member." }, { status: 500 });
  }
}
