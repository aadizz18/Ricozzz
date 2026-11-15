import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/admin/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    let query = `
      SELECT id, slug, category, question, answer, display_order
      FROM website_faqs
      WHERE is_published = TRUE
    `;
    const params: string[] = [];

    if (category) {
      query += " AND category = ?";
      params.push(category);
    }

    query += " ORDER BY display_order ASC";

    const faqs = await db.prepare(query).all(...params);

    return NextResponse.json(
      {
        success: true,
        faqs,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Public FAQs GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch published FAQs." },
      { status: 500 }
    );
  }
}
