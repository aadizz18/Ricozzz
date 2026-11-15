/**
 * RICOZ Production Serverless Distributed Rate Limiter
 * 
 * Works across distributed Vercel serverless instances using InsForge PostgreSQL,
 * with an in-memory fallback cache.
 */

import { NextRequest } from "next/server";
import { getDb } from "@/lib/admin/db";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

// In-memory sliding window fallback for extreme edge resilience
const inMemoryFallbackCache = new Map<string, { count: number; resetAt: number }>();

/**
 * Extract real client IP from standard proxy headers
 */
export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0].trim();
    if (firstIp) return firstIp;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();
  return "127.0.0.1";
}

/**
 * Check and record a rate-limit point for a given action and IP.
 * 
 * @param action - Action namespace (e.g. 'public_enquiry', 'ai_analysis')
 * @param ip - Client IP
 * @param maxRequests - Maximum requests permitted in the window (default: 5)
 * @param windowSeconds - Window duration in seconds (default: 600 = 10 mins)
 */
export async function checkRateLimit(
  action: string,
  ip: string,
  maxRequests: number = 5,
  windowSeconds: number = 600
): Promise<RateLimitResult> {
  const rateLimitKey = `${action}:${ip}`;
  const now = Date.now();

  try {
    const db = getDb();

    // 1. Check existing active rate limit points in PostgreSQL
    const countRow = (await db.prepare(`
      SELECT COUNT(*)::int as active_points
      FROM api_rate_limits
      WHERE key = ? AND expire_at > NOW()
    `).get(rateLimitKey)) as { active_points: number } | undefined;

    const currentPoints = countRow?.active_points ?? 0;

    if (currentPoints >= maxRequests) {
      // Find time until earliest expiration
      const resetRow = (await db.prepare(`
        SELECT EXTRACT(EPOCH FROM (MIN(expire_at) - NOW()))::int as seconds_left
        FROM api_rate_limits
        WHERE key = ? AND expire_at > NOW()
      `).get(rateLimitKey)) as { seconds_left: number } | undefined;

      const secondsLeft = Math.max(1, resetRow?.seconds_left ?? windowSeconds);

      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        resetInSeconds: secondsLeft,
      };
    }

    // 2. Insert new rate limit point
    await db.prepare(`
      INSERT INTO api_rate_limits (key, expire_at)
      VALUES (?, NOW() + (? || ' seconds')::interval)
    `).run(rateLimitKey, String(windowSeconds));

    // Opportunistic cleanup of expired rows (1 in 20 requests)
    if (Math.random() < 0.05) {
      db.prepare("DELETE FROM api_rate_limits WHERE expire_at < NOW()")
        .run()
        .catch(() => {});
    }

    return {
      success: true,
      limit: maxRequests,
      remaining: Math.max(0, maxRequests - currentPoints - 1),
      resetInSeconds: windowSeconds,
    };
  } catch (dbError) {
    console.warn("Postgres rate limiter error; falling back to in-memory rate check:", dbError);

    // Fallback: in-memory token bucket
    const record = inMemoryFallbackCache.get(rateLimitKey);

    if (!record || now > record.resetAt) {
      inMemoryFallbackCache.set(rateLimitKey, {
        count: 1,
        resetAt: now + windowSeconds * 1000,
      });
      return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        resetInSeconds: windowSeconds,
      };
    }

    if (record.count >= maxRequests) {
      const secondsLeft = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        resetInSeconds: secondsLeft,
      };
    }

    record.count += 1;
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - record.count,
      resetInSeconds: Math.ceil((record.resetAt - now) / 1000),
    };
  }
}
