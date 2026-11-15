import { getDb } from "../lib/admin/db.ts";

async function main() {
  const db = getDb();

  const enquiries = await db.prepare(`
    SELECT id, full_name, email, company, created_at
    FROM public.website_enquiries
    WHERE email LIKE '%@luxury-client.ch%'
    ORDER BY created_at DESC
  `).all();
  console.log("ALL ENQUIRIES:", JSON.stringify(enquiries, null, 2));

  const clients = await db.prepare(`
    SELECT id, name, contact_name, contact_email, created_at
    FROM public.clients
    WHERE contact_email LIKE '%@luxury-client.ch%'
    ORDER BY created_at DESC
  `).all();
  console.log("ALL CLIENTS:", JSON.stringify(clients, null, 2));

  const ratelimits = await db.prepare(`
    SELECT id, key, expire_at, created_at
    FROM public.api_rate_limits
    WHERE key LIKE '%203.0.113%' OR key LIKE '%198.51.100%' OR key LIKE '%127.0.0.1%'
    ORDER BY created_at DESC
  `).all();
  console.log("ALL RATELIMITS:", JSON.stringify(ratelimits, null, 2));
}

main().catch(console.error);
