/**
 * @deprecated
 * RICOZ DEMO DATA LAYER — DEPRECATED
 *
 * All 11 Admin Operations modules have been migrated to real InsForge PostgreSQL persistence
 * via @/lib/admin/apiClient and the Next.js serverless API routes (/api/admin/*).
 * This module remains only for historical reference and legacy test compatibility.
 */

export * from "./storage";
export * from "./seedData";
export * from "./auth";
export * from "./audit";
export * from "./departments";
export * from "./users";
export * from "./clients";
export * from "./vendors";
export * from "./tasks";
export * from "./support";
export * from "./sops";
export * from "./notifications";
export * from "./reports";
export * from "./dashboard";
