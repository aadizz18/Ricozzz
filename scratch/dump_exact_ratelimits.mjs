import { getDb } from "../lib/admin/db.ts";

async function main() {
  const db = getDb();
  const ratelimits = await db.prepare(`
    SELECT id, key, created_at
    FROM public.api_rate_limits
    WHERE key LIKE 'public_enquiry:203.0.113.%'
       OR key LIKE 'public_register:198.51.100.%'
       OR key LIKE 'public_login:198.51.100.%'
       OR key LIKE 'public_register:::ffff:127.0.0.1'
       OR key LIKE 'public_forgot_pw:::ffff:127.0.0.1'
       OR key LIKE 'public_enquiry:::ffff:127.0.0.1'
    ORDER BY created_at DESC
  `).all();
  console.log("EXACT_RATELIMITS_COUNT:", ratelimits.length);
  console.log(JSON.stringify(ratelimits, null, 2));
}

main().catch(console.error);
