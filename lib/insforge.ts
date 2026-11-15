import { createClient, createAdminClient } from "@insforge/sdk";

// Centralized InsForge client factory for RICOZ
const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || "https://2cbr24z5.us-east.insforge.app";
const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "";
const adminApiKey = process.env.INSFORGE_API_KEY || "";

/**
 * Public/Browser InsForge client.
 * Uses anonKey. Operations are subject to RLS and public policies.
 */
export function getInsforgeClient() {
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_INSFORGE_URL is not configured.");
  }
  return createClient({
    baseUrl,
    anonKey: anonKey || undefined,
  });
}

/**
 * User-scoped server InsForge client.
 * Takes the authenticated user's JWT / access token.
 * All operations execute with the user's identity and subject to user RLS.
 */
export function getInsforgeUserClient(accessToken: string) {
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_INSFORGE_URL is not configured.");
  }
  return createClient({
    baseUrl,
    accessToken,
  });
}

/**
 * Server-only InsForge Admin Client (Project-Admin privileges).
 * Uses INSFORGE_API_KEY. NEVER expose this to client components.
 */
export function getInsforgeAdminClient() {
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_INSFORGE_URL is not configured.");
  }
  if (!adminApiKey) {
    throw new Error("INSFORGE_API_KEY is not configured on the server.");
  }
  return createAdminClient({
    baseUrl,
    apiKey: adminApiKey,
  });
}
