/**
 * RICOZ Admin — Frontend Demo SOPs & Knowledge Service
 */

import { SOP, Department, AdminUser } from "@/lib/admin/types";
import { getStorageItem, setStorageItem, STORAGE_KEYS, isBrowser } from "./storage";
import { DEFAULT_SOPS, DEFAULT_DEPARTMENTS, DEFAULT_USERS } from "./seedData";
import { logAuditEvent } from "./audit";

let sopsSyncing = false;

export function getSOPs(filters?: {
  departmentId?: string;
  category?: string;
  status?: string;
  search?: string;
}): SOP[] {
  // Trigger background server sync
  if (isBrowser() && !sopsSyncing) {
    sopsSyncing = true;
    const query = new URLSearchParams();
    if (filters?.departmentId) query.set("departmentId", filters.departmentId);
    if (filters?.search) query.set("search", filters.search);

    fetch(`/api/admin/sops?${query.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.sops) && data.sops.length > 0) {
          setStorageItem(STORAGE_KEYS.SOPS, data.sops);
        }
      })
      .catch(() => {})
      .finally(() => {
        sopsSyncing = false;
      });
  }

  let sops = getStorageItem<SOP[]>(STORAGE_KEYS.SOPS, DEFAULT_SOPS);
  const depts = getStorageItem<Department[]>(STORAGE_KEYS.DEPARTMENTS, DEFAULT_DEPARTMENTS);
  const users = getStorageItem<AdminUser[]>(STORAGE_KEYS.USERS, DEFAULT_USERS);

  sops = sops.map((s) => {
    const dept = depts.find((d) => d.id === s.departmentId);
    const owner = users.find((u) => u.id === s.ownerId);

    return {
      ...s,
      departmentName: dept ? dept.name : s.departmentName,
      ownerName: owner ? owner.fullName : s.ownerName,
    };
  });

  if (filters?.departmentId) {
    sops = sops.filter((s) => s.departmentId === filters.departmentId);
  }

  if (filters?.category) {
    sops = sops.filter((s) => s.category.toLowerCase() === filters.category!.toLowerCase());
  }

  if (filters?.status) {
    sops = sops.filter((s) => s.status === filters.status);
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    sops = sops.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        (s.contentMarkdown || "").toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
    );
  }

  return sops;
}

export function getSOPById(id: string): SOP | null {
  const sops = getSOPs();
  return sops.find((s) => s.id === id || s.slug === id) || null;
}

export function createSOP(data: Partial<SOP>): SOP {
  const sops = getStorageItem<SOP[]>(STORAGE_KEYS.SOPS, DEFAULT_SOPS);
  const depts = getStorageItem<Department[]>(STORAGE_KEYS.DEPARTMENTS, DEFAULT_DEPARTMENTS);
  const dept = depts.find((d) => d.id === data.departmentId);
  const now = new Date().toISOString();

  const slug = data.slug || (data.title || "sop").toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const newSop: SOP = {
    id: `sop-${Date.now().toString(36)}`,
    title: data.title || "Untitled Standard Operating Procedure",
    slug,
    departmentId: data.departmentId || "dept-ops",
    departmentName: dept ? dept.name : "Operations",
    category: data.category || "General Operations",
    summary: data.summary || "",
    contentMarkdown: data.contentMarkdown || "## Procedure Content\n\nOutline step-by-step instructions.",
    version: data.version || "v1.0",
    status: data.status || "active",
    ownerId: "usr-super",
    ownerName: "Aadinath Achary",
    createdAt: now,
    updatedAt: now,
  };

  setStorageItem(STORAGE_KEYS.SOPS, [newSop, ...sops]);

  logAuditEvent("sop.create", "sop", newSop.id, `Authored SOP "${newSop.title}" (${newSop.version})`);

  if (isBrowser()) {
    fetch("/api/admin/sops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newSop.title,
        departmentId: newSop.departmentId,
        category: newSop.category,
        summary: newSop.summary,
        contentMarkdown: newSop.contentMarkdown,
        version: newSop.version,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((resData) => {
        if (resData?.sopId) {
          newSop.id = resData.sopId;
        }
      })
      .catch(() => {});
  }

  return newSop;
}

export function updateSOP(id: string, data: Partial<SOP>): SOP | null {
  const sops = getStorageItem<SOP[]>(STORAGE_KEYS.SOPS, DEFAULT_SOPS);
  const idx = sops.findIndex((s) => s.id === id);
  if (idx === -1) return null;

  const updated: SOP = {
    ...sops[idx],
    ...data,
    updatedAt: new Date().toISOString(),
  };

  sops[idx] = updated;
  setStorageItem(STORAGE_KEYS.SOPS, sops);

  logAuditEvent("sop.update", "sop", id, `Updated SOP "${updated.title}"`);

  if (isBrowser()) {
    fetch(`/api/admin/sops/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).catch(() => {});
  }

  return updated;
}

export function deleteSOP(id: string): boolean {
  const sops = getStorageItem<SOP[]>(STORAGE_KEYS.SOPS, DEFAULT_SOPS);
  const target = sops.find((s) => s.id === id);
  const filtered = sops.filter((s) => s.id !== id);
  setStorageItem(STORAGE_KEYS.SOPS, filtered);

  logAuditEvent("sop.delete", "sop", id, `Deleted SOP "${target?.title || id}"`);

  if (isBrowser()) {
    fetch(`/api/admin/sops/${id}`, {
      method: "DELETE",
    }).catch(() => {});
  }

  return true;
}
