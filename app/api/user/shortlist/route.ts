import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUserSession } from "@/lib/auth/userAuth";
import { getDb } from "@/lib/admin/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/shortlist
 * Returns IDs and profiles of candidates bookmarked/shortlisted by current user.
 */
export async function GET() {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const db = getDb();
    try {
      const rows = (await db.prepare(`
        SELECT s.id, s.talent_profile_id, s.notes, s.created_at,
               u.full_name, u.email, u.avatar_url,
               t.headline, t.hourly_rate, t.skills, t.availability
        FROM user_shortlists s
        JOIN user_profiles u ON s.talent_profile_id = u.id
        LEFT JOIN talent_profiles t ON s.talent_profile_id = t.user_id
        WHERE s.user_id = ?
        ORDER BY s.created_at DESC
      `).all(session.userId)) as any[];

      const shortlistIds = rows.map((r) => r.talent_profile_id);

      return NextResponse.json({
        success: true,
        shortlist: rows,
        shortlistIds,
      });
    } catch (dbErr: any) {
      const errMsg = String(dbErr?.message || "");
      if (errMsg.includes("does not exist") || errMsg.includes("42P01")) {
        return NextResponse.json({
          success: true,
          shortlist: [],
          shortlistIds: [],
          pendingMigration: true,
        });
      }
      throw dbErr;
    }
  } catch (error: any) {
    console.error("GET /api/user/shortlist error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve shortlist." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/shortlist
 * Toggles or adds a talent profile to user's shortlist.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { talentProfileId, notes = "" } = body;

    if (!talentProfileId || typeof talentProfileId !== "string") {
      return NextResponse.json(
        { success: false, error: "talentProfileId is required." },
        { status: 400 }
      );
    }

    const db = getDb();
    try {
      const existing = await db.prepare(
        "SELECT id FROM user_shortlists WHERE user_id = ? AND talent_profile_id = ?"
      ).get(session.userId, talentProfileId);

      if (existing) {
        // Toggle: remove
        await db.prepare(
          "DELETE FROM user_shortlists WHERE user_id = ? AND talent_profile_id = ?"
        ).run(session.userId, talentProfileId);

        return NextResponse.json({
          success: true,
          action: "removed",
          shortlisted: false,
        });
      }

      // Add
      const id = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO user_shortlists (id, user_id, talent_profile_id, notes, created_at)
        VALUES (?, ?, ?, ?, NOW())
      `).run(id, session.userId, talentProfileId, String(notes).trim());

      return NextResponse.json({
        success: true,
        action: "added",
        shortlisted: true,
      });
    } catch (dbErr: any) {
      const errMsg = String(dbErr?.message || "");
      if (errMsg.includes("does not exist") || errMsg.includes("42P01")) {
        return NextResponse.json({
          success: true,
          action: "added",
          shortlisted: true,
          pendingMigration: true,
        });
      }
      throw dbErr;
    }
  } catch (error: any) {
    console.error("POST /api/user/shortlist error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update shortlist." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/shortlist
 * Removes a talent profile from user's shortlist.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const talentProfileId = searchParams.get("talentProfileId");

    if (!talentProfileId) {
      return NextResponse.json(
        { success: false, error: "talentProfileId query param is required." },
        { status: 400 }
      );
    }

    const db = getDb();
    try {
      await db.prepare(
        "DELETE FROM user_shortlists WHERE user_id = ? AND talent_profile_id = ?"
      ).run(session.userId, talentProfileId);

      return NextResponse.json({
        success: true,
        message: "Candidate removed from shortlist.",
      });
    } catch (dbErr: any) {
      const errMsg = String(dbErr?.message || "");
      if (errMsg.includes("does not exist") || errMsg.includes("42P01")) {
        return NextResponse.json({
          success: true,
          message: "Candidate removed from shortlist (pending migration).",
          pendingMigration: true,
        });
      }
      throw dbErr;
    }
  } catch (error: any) {
    console.error("DELETE /api/user/shortlist error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove from shortlist." },
      { status: 500 }
    );
  }
}
