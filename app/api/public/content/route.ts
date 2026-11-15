import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/admin/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();

    // 1. Fetch all published content sections
    const sectionsRows = (await db.prepare(`
      SELECT section_key, page_slug, title, subtitle, content_payload, display_order, updated_at
      FROM website_content_sections
      WHERE is_published = TRUE
      ORDER BY display_order ASC
    `).all()) as Array<{
      section_key: string;
      page_slug: string;
      title: string;
      subtitle: string | null;
      content_payload: any;
      display_order: number;
      updated_at: string;
    }>;

    // Index sections by section_key for easy lookup
    const sections: Record<string, any> = {};
    for (const row of sectionsRows) {
      sections[row.section_key] = {
        title: row.title,
        subtitle: row.subtitle,
        payload: row.content_payload,
        updatedAt: row.updated_at,
      };
    }

    // 2. Fetch global website settings
    const settingsRows = (await db.prepare(`
      SELECT key, value FROM website_settings
    `).all()) as Array<{ key: string; value: any }>;

    const settings: Record<string, any> = {};
    for (const row of settingsRows) {
      settings[row.key] = row.value;
    }

    // 3. Fetch published testimonials
    const testimonials = await db.prepare(`
      SELECT id, client_name, company, role, quote, rating, avatar_url, is_featured, display_order
      FROM website_testimonials
      WHERE is_published = TRUE
      ORDER BY is_featured DESC, display_order ASC
    `).all();

    return NextResponse.json(
      {
        success: true,
        sections,
        settings,
        testimonials,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Public content GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve published website content." },
      { status: 500 }
    );
  }
}
