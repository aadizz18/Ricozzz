import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUserSession } from "@/lib/auth/userAuth";
import { getDb } from "@/lib/admin/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/projects
 * Retrieves projects relevant to the current user:
 * - For company accounts: projects owned by the company.
 * - For talent accounts: open/discoverable project opportunities.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all";

    try {
      let rows: any[] = [];
      if (session.accountType === "company") {
        rows = (await db.prepare(`
          SELECT * FROM client_projects
          WHERE company_user_id = ?
          ORDER BY created_at DESC
        `).all(session.userId)) as any[];
      } else {
        // Talent users see matching / discoverable opportunities
        rows = (await db.prepare(`
          SELECT * FROM client_projects
          WHERE status IN ('Matching', 'Active', 'Discovery')
          ORDER BY created_at DESC
        `).all()) as any[];
      }

      return NextResponse.json({
        success: true,
        projects: rows,
      });
    } catch (dbErr: any) {
      const errMsg = String(dbErr?.message || "");
      if (errMsg.includes("does not exist") || errMsg.includes("42P01")) {
        // Table not yet migrated to PostgreSQL
        return NextResponse.json({
          success: true,
          projects: [],
          pendingMigration: true,
          note: "client_projects table pending migration execution.",
        });
      }
      throw dbErr;
    }
  } catch (error: any) {
    console.error("GET /api/user/projects error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve projects." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/projects
 * Creates a new client project brief / mandate.
 * Requires an authenticated 'company' account.
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

    if (session.accountType !== "company") {
      return NextResponse.json(
        { success: false, error: "Only enterprise company accounts can create project briefs." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      title,
      companyName,
      industry = "Technology",
      status = "Discovery",
      timeline = "8-10 weeks",
      startDate = "Within 2 weeks",
      budgetRange = "$60,000 - $90,000",
      budgetTier = "$$$$",
      rebrandingGoals = [],
      targetAudience = "",
      brandPersonality = [],
      requiredServices = [],
      preferredStyles = [],
      availabilityRequirement = "Immediate",
      projectBrief = "",
    } = body;

    if (!title || typeof title !== "string" || title.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: "Project title must be at least 3 characters." },
        { status: 400 }
      );
    }

    const db = getDb();
    const projectId = crypto.randomUUID();
    const now = new Date().toISOString();

    const newProject = {
      id: projectId,
      company_user_id: session.userId,
      title: title.trim(),
      company_name: (companyName || session.fullName || "Enterprise Client").trim(),
      industry: String(industry).trim(),
      status: String(status).trim(),
      timeline: String(timeline).trim(),
      start_date: String(startDate).trim(),
      budget_range: String(budgetRange).trim(),
      budget_tier: String(budgetTier).trim(),
      rebranding_goals: rebrandingGoals,
      target_audience: String(targetAudience).trim(),
      brand_personality: brandPersonality,
      required_services: requiredServices,
      preferred_styles: preferredStyles,
      availability_requirement: String(availabilityRequirement).trim(),
      project_brief: String(projectBrief).trim(),
      created_at: now,
      updated_at: now,
    };

    let tableExists = true;
    try {
      await db.prepare(`
        INSERT INTO client_projects (
          id, company_user_id, title, company_name, industry, status,
          timeline, start_date, budget_range, budget_tier, rebranding_goals,
          target_audience, brand_personality, required_services, preferred_styles,
          availability_requirement, project_brief, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?::jsonb, ?::jsonb, ?::jsonb, ?, ?, NOW(), NOW())
      `).run(
        newProject.id,
        newProject.company_user_id,
        newProject.title,
        newProject.company_name,
        newProject.industry,
        newProject.status,
        newProject.timeline,
        newProject.start_date,
        newProject.budget_range,
        newProject.budget_tier,
        JSON.stringify(newProject.rebranding_goals),
        newProject.target_audience,
        JSON.stringify(newProject.brand_personality),
        JSON.stringify(newProject.required_services),
        JSON.stringify(newProject.preferred_styles),
        newProject.availability_requirement,
        newProject.project_brief
      );
    } catch (insertErr: any) {
      const errMsg = String(insertErr?.message || "");
      if (errMsg.includes("does not exist") || errMsg.includes("42P01")) {
        tableExists = false;
      } else {
        throw insertErr;
      }
    }

    // Always record mandate into public website enquiries so admin team sees it immediately
    try {
      const enquiryId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO website_enquiries (
          id, full_name, email, company, mandate_type, timeline,
          project_brief, budget_range, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', NOW(), NOW())
      `).run(
        enquiryId,
        session.fullName,
        session.email,
        newProject.company_name,
        newProject.title,
        newProject.timeline,
        `Rebrand Mandate: ${newProject.project_brief || newProject.title}. Services: ${JSON.stringify(newProject.required_services)}.`,
        newProject.budget_range
      );

      // Notify operations lead
      const adminLead = (await db.prepare(
        "SELECT id FROM admin_users WHERE role IN ('super_admin', 'ops_admin') AND status = 'active' LIMIT 1"
      ).get()) as { id: string } | undefined;

      if (adminLead) {
        await db.prepare(`
          INSERT INTO notifications (id, user_id, title, message, type, link, is_read, created_at)
          VALUES (?, ?, 'New Enterprise Mandate Published', ?, 'system', '/admin/website?tab=enquiries', FALSE, NOW())
        `).run(
          crypto.randomUUID(),
          adminLead.id,
          `${newProject.company_name} published project: "${newProject.title}"`
        );
      }
    } catch (enquiryErr) {
      console.warn("Could not dual-sync project to website_enquiries:", enquiryErr);
    }

    return NextResponse.json(
      {
        success: true,
        project: newProject,
        pendingMigration: !tableExists,
        message: "Project mandate successfully registered.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/user/projects error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create project mandate." },
      { status: 500 }
    );
  }
}
