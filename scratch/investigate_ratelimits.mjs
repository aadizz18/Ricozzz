import { getDb } from "../lib/admin/db.ts";

async function main() {
  const db = getDb();
  console.log("=== API_RATE_LIMITS ===");
  const limits = await db.prepare(`
    SELECT id, key, expire_at, created_at
    FROM public.api_rate_limits
    ORDER BY created_at DESC
    LIMIT 25
  `).all();
  console.log("Count:", limits.length);
  console.log(JSON.stringify(limits, null, 2));
}

main().catch(console.error);
