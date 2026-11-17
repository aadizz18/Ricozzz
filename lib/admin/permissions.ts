import { getDb } from "./db";
import { AdminUser, AdminRole, AdminPermission, AdminRoleDef, AdminUserPermissionOverride, AdminDepartmentMember } from "./types";
import { DEFAULT_ROLES, DEFAULT_PERMISSIONS } from "@/lib/demo/seedData";

export interface PermissionContext {
  departmentId?: string | null;
  resourceOwnerId?: string | null;
}

/**
 * Loads all permissions granted to a user, taking into account:
 * 1. Base role permissions from `admin_role_permissions`
 * 2. Active user-level permission overrides from `admin_user_permissions` (with explicit allow / deny precedence)
 */
export async function loadUserPermissions(userId: string, roleSlug: string): Promise<{
  permissions: string[];
  overrides: AdminUserPermissionOverride[];
}> {
  const db = getDb();
  const now = new Date().toISOString();

  // 1. Fetch base role permissions
  const rolePermRows = (await db.prepare(`
    SELECT p.slug
    FROM admin_role_permissions rp
    JOIN admin_roles r ON rp.role_id = r.id
    JOIN admin_permissions p ON rp.permission_id = p.id
    WHERE r.slug = ? AND r.is_active = true
  `).all(roleSlug)) as Array<{ slug: string }>;

  const grantedSet = new Set<string>(rolePermRows.map((r) => r.slug));

  if (grantedSet.size === 0) {
    const roleDef = DEFAULT_ROLES.find((r) => r.slug === roleSlug);
    if (roleDef && roleDef.permissions) {
      roleDef.permissions.forEach((p) => grantedSet.add(p));
    } else {
      grantedSet.add("*");
    }
  }

  // 2. Fetch active user-level overrides
  const overrideRows = (await db.prepare(`
    SELECT 
      up.id, up.admin_user_id, up.permission_id, up.effect, up.granted_by, up.reason, up.expires_at, up.created_at,
      p.slug as permission_slug, p.name as permission_name, p.module, p.action,
      u.full_name as granted_by_name
    FROM admin_user_permissions up
    JOIN admin_permissions p ON up.permission_id = p.id
    LEFT JOIN admin_users u ON up.granted_by = u.id
    WHERE up.admin_user_id = ?
  `).all(userId)) as Array<{
    id: string;
    admin_user_id: string;
    permission_id: string;
    effect: "allow" | "deny";
    granted_by: string | null;
    reason: string;
    expires_at: string | null;
    created_at: string;
    permission_slug: string;
    permission_name: string;
    module: string;
    action: string;
    granted_by_name: string | null;
  }>;

  const overrides: AdminUserPermissionOverride[] = [];

  for (const row of overrideRows) {
    const isExpired = row.expires_at !== null && row.expires_at <= now;
    if (isExpired) {
      continue; // Expired overrides are strictly ignored
    }

    overrides.push({
      id: row.id,
      adminUserId: row.admin_user_id,
      permissionId: row.permission_id,
      permissionSlug: row.permission_slug,
      permissionName: row.permission_name,
      module: row.module,
      action: row.action,
      effect: row.effect,
      grantedBy: row.granted_by,
      grantedByName: row.granted_by_name || undefined,
      reason: row.reason,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    });

    if (row.effect === "deny") {
      // Explicit deny overrides inherited role permissions
      grantedSet.delete(row.permission_slug);
    } else if (row.effect === "allow") {
      // Explicit allow grants permission
      grantedSet.add(row.permission_slug);
    }
  }

  return {
    permissions: Array.from(grantedSet),
    overrides,
  };
}

/**
 * Loads department memberships for a user
 */
export async function loadUserDepartmentMemberships(userId: string): Promise<AdminDepartmentMember[]> {
  const db = getDb();
  const rows = (await db.prepare(`
    SELECT 
      dm.id, dm.admin_user_id, dm.department_id, dm.membership_role, dm.is_primary, dm.created_at,
      d.name as department_name,
      u.full_name as user_name, u.email as user_email, u.role as user_role
    FROM admin_department_members dm
    JOIN departments d ON dm.department_id = d.id
    JOIN admin_users u ON dm.admin_user_id = u.id
    WHERE dm.admin_user_id = ?
  `).all(userId)) as Array<{
    id: string;
    admin_user_id: string;
    department_id: string;
    membership_role: "head" | "manager" | "member" | "observer";
    is_primary: boolean | number;
    created_at: string;
    department_name: string;
    user_name: string;
    user_email: string;
    user_role: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    adminUserId: r.admin_user_id,
    departmentId: r.department_id,
    membershipRole: r.membership_role,
    isPrimary: Boolean(r.is_primary),
    createdAt: r.created_at,
    departmentName: r.department_name,
    userName: r.user_name,
    userEmail: r.user_email,
    userRole: r.user_role,
  }));
}

/**
 * Evaluates whether an administrative user or role has the requested permission under optional department / data scope context.
 * Supports both AdminUser objects and legacy role slug strings.
 */
export function hasPermission(
  userOrRole: AdminUser | AdminRole | string,
  permissionSlug: string,
  context?: PermissionContext
): boolean {
  if (!userOrRole) return false;

  // Handle object-based AdminUser verification (granular RBAC)
  if (typeof userOrRole === "object" && "role" in userOrRole) {
    const user = userOrRole as AdminUser;

    // Super Admin has total operational access across all permissions and modules
    if (user.role === "super_admin") {
      return true;
    }

    // Suspended users have ZERO operational permissions
    if (user.status !== "active") {
      return false;
    }

    // Check granular permissions array loaded on session
    if (user.permissions && Array.isArray(user.permissions)) {
      const hasDirectPermission = user.permissions.includes(permissionSlug);
      if (!hasDirectPermission) {
        return false;
      }
    }

    // Optional Department Scope Check
    if (context?.departmentId) {
      if (user.role === "coo" || user.role === "exec_director" || user.role === "auditor" || user.role === "ops_admin") {
        return true;
      }

      if (user.departmentId === context.departmentId) {
        return true;
      }

      if (user.departmentMemberships) {
        const isMember = user.departmentMemberships.some((m) => m.departmentId === context.departmentId);
        if (isMember) return true;
      }

      return false;
    }

    // Optional Resource Ownership Check
    if (context?.resourceOwnerId) {
      if (user.role === "dept_head" || user.role === "dept_manager" || user.role === "ops_manager" || user.role === "coo" || user.role === "exec_director") {
        return true;
      }
      return user.id === context.resourceOwnerId;
    }

    return true;
  }

  // Handle fallback string role slug
  const roleSlug = typeof userOrRole === "string" ? userOrRole : (userOrRole as any).role;
  if (roleSlug === "super_admin") return true;

  return false;
}

/**
 * Retrieves all registered administrative roles with their associated permissions and user counts.
 */
export async function getAllRoles(): Promise<AdminRoleDef[]> {
  try {
    const db = getDb();
    const roles = (await db.prepare(`
      SELECT id, name, slug, description, hierarchy_level, is_system_role, is_active, created_at, updated_at
      FROM admin_roles
      ORDER BY hierarchy_level ASC
    `).all()) as any[];

    if (!roles || roles.length === 0) {
      return DEFAULT_ROLES;
    }

    const rolePerms = (await db.prepare(`
      SELECT rp.role_id, p.slug as permission_slug
      FROM admin_role_permissions rp
      JOIN admin_permissions p ON rp.permission_id = p.id
    `).all()) as Array<{ role_id: string; permission_slug: string }>;

    const userCounts = (await db.prepare(`
      SELECT role, count(*) as count
      FROM admin_users
      GROUP BY role
    `).all()) as Array<{ role: string; count: string | number }>;

    const permMap = new Map<string, string[]>();
    for (const rp of rolePerms) {
      if (!permMap.has(rp.role_id)) permMap.set(rp.role_id, []);
      permMap.get(rp.role_id)!.push(rp.permission_slug);
    }

    const countMap = new Map<string, number>();
    for (const uc of userCounts) {
      countMap.set(uc.role, Number(uc.count));
    }

    return roles.map((r) => {
      const perms = permMap.get(r.id) || [];
      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        hierarchyLevel: r.hierarchy_level,
        isSystemRole: Boolean(r.is_system_role),
        isActive: Boolean(r.is_active),
        permissions: perms.length > 0 ? perms : (DEFAULT_ROLES.find((def) => def.slug === r.slug)?.permissions || []),
        permissionCount: perms.length > 0 ? perms.length : (DEFAULT_ROLES.find((def) => def.slug === r.slug)?.permissionCount || 0),
        userCount: countMap.get(r.slug) || 0,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });
  } catch {
    return DEFAULT_ROLES;
  }
}

/**
 * Retrieves the full 56-permission catalogue from PostgreSQL.
 */
export async function getAllPermissions(): Promise<AdminPermission[]> {
  try {
    const db = getDb();
    const rows = (await db.prepare(`
      SELECT id, name, slug, description, module, action, created_at
      FROM admin_permissions
      ORDER BY module ASC, slug ASC
    `).all()) as any[];

    if (!rows || rows.length === 0) {
      return DEFAULT_PERMISSIONS;
    }

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      module: r.module,
      action: r.action,
      createdAt: r.created_at,
    }));
  } catch {
    return DEFAULT_PERMISSIONS;
  }
}
