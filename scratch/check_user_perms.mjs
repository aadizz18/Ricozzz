import { getDb } from "../lib/admin/db.ts";

async function main() {
  const db = getDb();
  const perms = await db.prepare(`
    SELECT slug, name, module, action
    FROM public.admin_permissions
    WHERE module = 'users'
    ORDER BY slug
  `).all();
  console.log("USER_PERMISSIONS:", JSON.stringify(perms, null, 2));
}

main().catch(console.error);
