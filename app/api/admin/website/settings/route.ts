import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { getDb } from "@/lib/admin/db";
import { recordAuditLog } from "@/lib/admin/audit";

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission("website.view", req);
    if ("errorResponse" in auth) return auth.errorResponse;

    const db = getDb();
    const rows = (await db.prepare(`
      SELECT key, value, description, updated_at
      FROM website_settings
      ORDER BY key ASC
    `).all()) as Array<{ key: string; value: any; description: string | null; updated_at: string }>;

    const settings: Record<string, any> = {};
    for (const r of rows) {
      settings[r.key] = {
        value: r.value,
        description: r.description,
        updatedAt: r.updated_at,
      };
    }

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Website settings GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch website settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requirePermission("website.edit", req);
    if ("errorResponse" in auth) return auth.errorResponse;
    const { user } = auth;

    const body = await req.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { success: false, error: "Key and Value are required." },
        { status: 400 }
      );
    }

    const db = getDb();
    await db.prepare(`
      INSERT INTO website_settings (key, value, updated_at)
      VALUES (?, ?::jsonb, NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
    `).run(key, JSON.stringify(value));

    await recordAuditLog({
      actor: user,
      action: "WEBSITE_SETTINGS_UPDATED",
      entityType: "website_setting",
      entityId: key,
      changeSummary: `Updated website setting "${key}"`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: `Setting "${key}" updated successfully.`,
    });
  } catch (error) {
    console.error("Website settings PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update website settings" },
      { status: 500 }
    );
  }
}
