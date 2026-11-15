import { cookies } from "next/headers";
import crypto from "node:crypto";
import { getDb } from "@/lib/admin/db";

export interface UserSessionPayload {
  userId: string;
  email: string;
  accountType: "talent" | "company";
  fullName: string;
  avatarUrl?: string;
  status?: "active" | "suspended" | "deactivated";
  accessToken?: string;
  exp: number; // Unix timestamp in seconds
}

export const USER_SESSION_COOKIE = "ricoz_user_session";
export const ACCESS_TOKEN_COOKIE = "insforge_access_token";
export const REFRESH_TOKEN_COOKIE = "insforge_refresh_token";

const SECRET = process.env.INSFORGE_API_KEY || "ricoz-enterprise-auth-secret-key-32ch";

/**
 * Sign session payload with HMAC-SHA256
 */
export function signSession(payload: UserSessionPayload): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET).update(b64).digest("base64url");
  return `${b64}.${signature}`;
}

/**
 * Verify and decode session token
 */
export function verifySession(token: string): UserSessionPayload | null {
  try {
    const [b64, signature] = token.split(".");
    if (!b64 || !signature) return null;

    const expectedSig = crypto.createHmac("sha256", SECRET).update(b64).digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const json = Buffer.from(b64, "base64url").toString("utf8");
    const payload = JSON.parse(json) as UserSessionPayload;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Read the current authenticated public user session from cookies.
 * Performs real-time status check against PostgreSQL.
 * Suspended, deactivated, or deleted accounts lose access immediately,
 * even when an old valid HMAC cookie exists.
 */
export async function getCurrentUserSession(): Promise<UserSessionPayload | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(USER_SESSION_COOKIE);
  if (!sessionCookie?.value) return null;

  const payload = verifySession(sessionCookie.value);
  if (!payload) return null;

  try {
    const db = getDb();
    const userRow = (await db.prepare(
      "SELECT status FROM public.user_profiles WHERE id = ?"
    ).get(payload.userId)) as { status?: string } | undefined;

    // Reject non-existent, suspended, or deactivated accounts immediately
    if (!userRow || userRow.status !== "active") {
      return null;
    }

    return {
      ...payload,
      status: userRow.status as "active",
    };
  } catch (err) {
    console.error("Error verifying user session status in database:", err);
    return null;
  }
}

/**
 * Set public user session cookies
 */
export async function setUserSessionCookies(
  payload: UserSessionPayload,
  accessToken?: string | null,
  refreshToken?: string | null
) {
  const cookieStore = await cookies();
  const signedToken = signSession(payload);
  const maxAge = 60 * 60 * 24 * 7; // 7 days

  cookieStore.set(USER_SESSION_COOKIE, signedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  if (accessToken) {
    // JavaScript-readable for client SDK storage / realtime
    cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });
  }

  if (refreshToken) {
    // HTTP-only for server-owned refresh
    cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });
  }
}

/**
 * Clear public user session cookies (leaves admin session untouched)
 */
export async function clearUserSessionCookies() {
  const cookieStore = await cookies();
  cookieStore.set(USER_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  cookieStore.set(ACCESS_TOKEN_COOKIE, "", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  cookieStore.set(REFRESH_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Fetch full profile data from PostgreSQL
 */
export async function getFullUserProfile(userId: string) {
  const db = getDb();

  const userProfile = (await db.prepare(`
    SELECT id, account_type, email, full_name, avatar_url, is_verified, status, created_at
    FROM public.user_profiles
    WHERE id = ?
  `).get(userId)) as {
    id: string;
    account_type: "talent" | "company";
    email: string;
    full_name: string;
    avatar_url: string;
    is_verified: boolean;
    status: "active" | "suspended" | "deactivated";
    created_at: string;
  } | undefined;

  if (!userProfile) return null;

  let details: any = null;
  if (userProfile.account_type === "talent") {
    details = await db.prepare(`
      SELECT headline, bio, location, years_experience, hourly_rate, portfolio_url, skills, availability
      FROM public.talent_profiles
      WHERE user_id = ?
    `).get(userId);
  } else if (userProfile.account_type === "company") {
    details = await db.prepare(`
      SELECT company_name, contact_name, business_email, industry, company_size, website_url, billing_country
      FROM public.company_profiles
      WHERE user_id = ?
    `).get(userId);
  }

  return {
    ...userProfile,
    details,
  };
}
