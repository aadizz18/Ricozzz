import { getDb } from "../lib/admin/db.ts";

async function main() {
  const db = getDb();
  const notifs = await db.prepare(`
    SELECT id, message, created_at
    FROM public.notifications
    WHERE message LIKE '%Geneva Horology Group%'
    ORDER BY created_at DESC
  `).all();
  console.log("NOTIF_IDS_COUNT:", notifs.length);
  console.log(JSON.stringify(notifs, null, 2));
}

main().catch(console.error);
