import { getDb } from "../lib/admin/db.ts";

async function main() {
  const db = getDb();
  console.log("=== NOTIFICATIONS CHECK ===");
  const notifs = await db.prepare(`
    SELECT id, title, message, link, created_at
    FROM public.notifications
    WHERE link LIKE '%enquiries%' OR message LIKE '%Geneva Horology%'
    ORDER BY created_at DESC
  `).all();
  console.log("Test notifications found:", notifs.length);
  console.log(JSON.stringify(notifs.slice(0, 5), null, 2));
}

main().catch(console.error);
