import { NextRequest, NextResponse } from "next/server";
import { getInsforgeClient } from "@/lib/insforge";
import { getDb } from "@/lib/admin/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);

    // Rate Limiting: Max 5 registration attempts per 10 minutes per IP
    const rateLimit = await checkRateLimit("public_register", clientIp, 5, 600);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many registration attempts. Please wait ${rateLimit.resetInSeconds} seconds before retrying.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.resetInSeconds) },
        }
      );
    }

    const body = await req.json();
    const {
      accountType,
      email,
      password,
      fullName,
      companyName,
      contactName,
      acceptTerms,
    } = body;

    // 1. Account type validation: MUST be exactly 'talent' or 'company'
    if (accountType !== "talent" && accountType !== "company") {
      return NextResponse.json(
        { success: false, error: "Invalid account type. Please select either Talent or Company." },
        { status: 400 }
      );
    }

    // 2. Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid corporate or professional email address." },
        { status: 400 }
      );
    }

    // 3. Password validation (min 6 characters as configured in InsForge auth)
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters in length." },
        { status: 400 }
      );
    }

    // 4. Terms acceptance check
    if (!acceptTerms) {
      return NextResponse.json(
        { success: false, error: "You must accept the Terms of Service and Privacy Notice to register." },
        { status: 400 }
      );
    }

    // 5. Profile fields validation based on account type
    let resolvedName = "";
    if (accountType === "talent") {
      if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
        return NextResponse.json(
          { success: false, error: "Please provide your full legal or professional name." },
          { status: 400 }
        );
      }
      resolvedName = fullName.trim();
    } else {
      if (!companyName || typeof companyName !== "string" || companyName.trim().length < 2) {
        return NextResponse.json(
          { success: false, error: "Please provide your enterprise organization or company name." },
          { status: 400 }
        );
      }
      if (!contactName || typeof contactName !== "string" || contactName.trim().length < 2) {
        return NextResponse.json(
          { success: false, error: "Please provide the primary contact person's name." },
          { status: 400 }
        );
      }
      resolvedName = contactName.trim();
    }

    // 6. Check existing user in database
    const db = getDb();
    const existing = await db.prepare(
      "SELECT id FROM auth.users WHERE email = ? LIMIT 1"
    ).get(cleanEmail);

    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email address already exists. Please sign in instead." },
        { status: 409 }
      );
    }

    // 7. Register user via InsForge Auth SDK
    const insforge = getInsforgeClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ricoz.io";
    const signUpResult = await insforge.auth.signUp({
      email: cleanEmail,
      password,
      name: resolvedName,
      redirectTo: `${siteUrl}/login`,
    });

    if (signUpResult.error) {
      console.error("InsForge signUp error:", signUpResult.error);
      const errMsg = signUpResult.error.message || "Registration failed. Please check your details and try again.";
      return NextResponse.json(
        { success: false, error: errMsg },
        { status: signUpResult.error.statusCode || 400 }
      );
    }

    // Retrieve the created user from auth.users
    const createdUser = (await db.prepare(
      "SELECT id, email FROM auth.users WHERE email = ? LIMIT 1"
    ).get(cleanEmail)) as { id: string; email: string } | undefined;

    if (!createdUser) {
      throw new Error("User record was not found after registration.");
    }

    const userId = createdUser.id;

    // 8. Create corresponding Public User Profile (defaults to active status)
    await db.prepare(`
      INSERT INTO public.user_profiles (
        id, account_type, email, full_name, avatar_url, is_verified, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, '', false, 'active', NOW(), NOW())
    `).run(userId, accountType, cleanEmail, resolvedName);

    // 9. Create specialized profile
    if (accountType === "talent") {
      await db.prepare(`
        INSERT INTO public.talent_profiles (
          id, user_id, headline, bio, location, years_experience, hourly_rate, portfolio_url, skills, availability, created_at, updated_at
        ) VALUES (?, ?, 'Creative Director & Brand Specialist', '', '', 5, '$150/hr', '', '[]'::jsonb, 'Available now', NOW(), NOW())
      `).run(userId, userId);
    } else {
      await db.prepare(`
        INSERT INTO public.company_profiles (
          id, user_id, company_name, contact_name, business_email, industry, company_size, website_url, billing_country, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'Technology & Innovation', '10-50', '', '', NOW(), NOW())
      `).run(userId, userId, (companyName as string).trim(), resolvedName, cleanEmail);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Registration initiated successfully. Please enter the verification code sent to your email.",
        requireEmailVerification: true,
        email: cleanEmail,
        accountType,
        userId,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Public registration error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process registration. Please try again." },
      { status: 500 }
    );
  }
}
