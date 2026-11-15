import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb } from "@/lib/admin/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fullName,
      email,
      company,
      mandateType = "Brand Architecture & Rebrand",
      timeline = "Within 4 weeks",
      projectBrief,
      budgetRange,
      website_url, // Honeypot field 1
      hp_field, // Honeypot field 2
    } = body;

    // 1. Honeypot Bot Trap: Reject bot submissions that populate hidden fields
    if (website_url || hp_field) {
      console.warn("Honeypot triggered on /api/public/enquiry from IP:", getClientIp(req));
      return NextResponse.json(
        { success: false, error: "Bot activity detected. Submission rejected." },
        { status: 400 }
      );
    }

    // 2. Distributed Rate Limiter: Max 10 inquiries per 10 minutes per IP
    const clientIp = getClientIp(req);
    const rateLimit = await checkRateLimit("public_enquiry", clientIp, 10, 600);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many inquiries submitted from this connection. Please wait ${rateLimit.resetInSeconds} seconds before retrying.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.resetInSeconds),
          },
        }
      );
    }

    // Strict input validation
    if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Please provide your full name." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid corporate email address." },
        { status: 400 }
      );
    }

    if (!company || typeof company !== "string" || company.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Please provide your company or organization name." },
        { status: 400 }
      );
    }

    if (!projectBrief || typeof projectBrief !== "string" || projectBrief.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: "Please provide at least a brief description (min 10 characters) of your project mandate." },
        { status: 400 }
      );
    }

    const db = getDb();
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanCompany = company.trim();
    const cleanBrief = projectBrief.trim();
    const cleanMandate = (mandateType || "").trim();
    const cleanTimeline = (timeline || "").trim();
    const cleanBudget = budgetRange ? String(budgetRange).trim() : null;

    const enquiryId = crypto.randomUUID();
    const now = new Date().toISOString();

    // 1. Check or link prospect in clients table
    let clientId: string | null = null;
    const existingClient = (await db.prepare(
      "SELECT id FROM clients WHERE contact_email = ? LIMIT 1"
    ).get(cleanEmail)) as { id: string } | undefined;

    if (existingClient) {
      clientId = existingClient.id;
    } else {
      clientId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO clients (
          id, name, industry, contact_name, contact_email, phone,
          company_size, onboarding_stage, notes, created_at, updated_at
        ) VALUES (?, ?, 'Enterprise', ?, ?, '', '50-200', 'inquiry', ?, NOW(), NOW())
      `).run(
        clientId,
        cleanCompany,
        cleanName,
        cleanEmail,
        `Public Website Concierge Briefing (${cleanMandate}): ${cleanBrief}`
      );
    }

    // 2. Insert into website_enquiries
    await db.prepare(`
      INSERT INTO website_enquiries (
        id, full_name, email, company, mandate_type, timeline,
        project_brief, budget_range, status, client_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, NOW(), NOW())
    `).run(
      enquiryId,
      cleanName,
      cleanEmail,
      cleanCompany,
      cleanMandate,
      cleanTimeline,
      cleanBrief,
      cleanBudget,
      clientId
    );

    // 3. Notify Operations Leads / Admins
    const adminUser = (await db.prepare(
      "SELECT id FROM admin_users WHERE role IN ('super_admin', 'ops_admin') AND status = 'active' ORDER BY (role = 'super_admin') DESC LIMIT 1"
    ).get()) as { id: string } | undefined;

    if (adminUser) {
      const notifId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, link, is_read, created_at)
        VALUES (?, ?, 'New Client Mandate Inquiry', ?, 'system', '/admin/website?tab=enquiries', FALSE, NOW())
      `).run(
        notifId,
        adminUser.id,
        `${cleanName} from ${cleanCompany} submitted a new mandate inquiry: "${cleanMandate}"`
      );
    }

    // 4. Log in immutable audit trail
    const auditId = crypto.randomUUID();
    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    await db.prepare(`
      INSERT INTO audit_logs (
        id, actor_id, actor_name, actor_role, action, entity_type,
        entity_id, change_summary, ip_address, created_at
      ) VALUES (?, NULL, 'Website Visitor', 'anonymous', 'WEBSITE_ENQUIRY_RECEIVED', 'website_enquiry', ?, ?, ?, NOW())
    `).run(
      auditId,
      enquiryId,
      `Received new briefing inquiry from ${cleanName} (${cleanCompany}) for ${cleanMandate}.`,
      ipAddress
    );

    return NextResponse.json(
      {
        success: true,
        enquiryId,
        message: "Your briefing inquiry has been securely received. Our concierge team will review within 24 hours.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Public enquiry POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit enquiry. Please try again." },
      { status: 500 }
    );
  }
}
