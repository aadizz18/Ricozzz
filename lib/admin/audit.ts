import { getDb } from "./db";
import { AdminUser } from "./types";
import crypto from "node:crypto";

export interface AuditLogParams {
  actor?: AdminUser | null;
  action: string;
  entityType: string;
  entityId: string;
  changeSummary: string;
  ipAddress?: string | null;
}

export async function recordAuditLog(params: AuditLogParams): Promise<void> {
  try {
    const db = getDb();
    const id = crypto.randomUUID();

    const actorId = params.actor && params.actor.id ? params.actor.id : null;
    const actorName = params.actor ? params.actor.fullName : "System";
    const actorRole = params.actor ? params.actor.role : "system";

    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, entity_type, entity_id, change_summary, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `);

    await stmt.run(
      id,
      actorId,
      actorName,
      actorRole,
      params.action,
      params.entityType,
      params.entityId,
      params.changeSummary,
      params.ipAddress || "127.0.0.1"
    );
  } catch (error) {
    console.error("Failed to record audit log:", error);
  }
}
