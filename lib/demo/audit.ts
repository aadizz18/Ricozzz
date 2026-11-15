/**
 * RICOZ Admin — Simulated & Authoritative Audit Logging Service
 */

import { AuditLog } from "@/lib/admin/types";
import { getStorageItem, setStorageItem, STORAGE_KEYS, isBrowser } from "./storage";
import { DEFAULT_AUDIT_LOGS } from "./seedData";

let auditSyncing = false;

export function getAuditLogs(filters?: {
  entityType?: string;
  search?: string;
}): AuditLog[] {
  if (isBrowser() && !auditSyncing) {
    auditSyncing = true;
    const query = new URLSearchParams();
    if (filters?.entityType) query.set("entityType", filters.entityType);
    if (filters?.search) query.set("search", filters.search);

    fetch(`/api/admin/audit-log?${query.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.logs) && data.logs.length > 0) {
          const mapped = data.logs.map((l: any) => ({
            id: l.id,
            actorId: l.actor_id,
            actorName: l.actor_name,
            actorRole: l.actor_role,
            action: l.action,
            entityType: l.entity_type,
            entityId: l.entity_id,
            changeSummary: l.change_summary,
            ipAddress: l.ip_address,
            createdAt: l.created_at,
          }));
          setStorageItem(STORAGE_KEYS.AUDIT_LOGS, mapped);
        }
      })
      .catch(() => {})
      .finally(() => {
        auditSyncing = false;
      });
  }

  let logs = getStorageItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, DEFAULT_AUDIT_LOGS);

  if (filters?.entityType) {
    logs = logs.filter((l) => (l.entityType || "").toLowerCase() === filters.entityType!.toLowerCase());
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    logs = logs.filter(
      (l) =>
        (l.action || "").toLowerCase().includes(q) ||
        (l.actorName || "").toLowerCase().includes(q) ||
        (l.changeSummary || "").toLowerCase().includes(q) ||
        (l.entityId || "").toLowerCase().includes(q)
    );
  }

  // Sort descending by date
  return [...logs].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

export function logAuditEvent(
  action: string,
  entityType: string,
  entityId: string,
  changeSummary: string,
  actor?: { id: string; name: string; role: string }
): AuditLog {
  const currentLogs = getStorageItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, DEFAULT_AUDIT_LOGS);

  // If no actor provided, try to read current session
  let actorId = actor?.id || "usr-demo";
  let actorName = actor?.name || "Demo User";
  let actorRole = actor?.role || "super_admin";

  if (!actor && typeof window !== "undefined") {
    try {
      const rawSession = window.localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        if (parsed?.id) {
          actorId = parsed.id;
          actorName = parsed.fullName || parsed.name || "Demo User";
          actorRole = parsed.role || "super_admin";
        }
      }
    } catch {
      // Ignore
    }
  }

  const newLog: AuditLog = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    actorId,
    actorName,
    actorRole,
    action,
    entityType,
    entityId,
    changeSummary,
    ipAddress: "127.0.0.1",
    createdAt: new Date().toISOString(),
  };

  const updatedLogs = [newLog, ...currentLogs];
  setStorageItem(STORAGE_KEYS.AUDIT_LOGS, updatedLogs);
  return newLog;
}
