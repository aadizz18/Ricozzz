import { NextRequest, NextResponse } from "next/server";
import { getInsforgeClient } from "@/lib/insforge";
import { getDb } from "@/lib/admin/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { setUserSessionCookies, getFullUserProfile } from "@/lib/auth/userAuth";

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);

    // Rate Limiting: Max 10 login attempts per 5 minutes per IP
    const rateLimit = await checkRateLimit("public_login", clientIp, 10, 300);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many login attempts. Please wait ${rateLimit.resetInSeconds} seconds before retrying.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.resetInSeconds) },
        }
      );
    }

    const body = await req.json();
    const { email, password } = body;

    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!cleanEmail || !password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Please enter both your work email and password." },
        { status: 400 }
      );
    }

    // Call InsForge Auth SDK
    const insforge = getInsforgeClient();
    const signInResult = await insforge.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (signInResult.error) {
      console.warn("Public sign-in error for", cleanEmail, signInResult.error.message);
      // Check if email verification is required (HTTP 403)
      if (signInResult.error.statusCode === 403 || signInResult.error.message?.includes("verify your email")) {
        return NextResponse.json(
          {
            success: false,
            requireEmailVerification: true,
            email: cleanEmail,
            error: "Email verification required. Please enter the 6-digit verification code sent to your email.",
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { success: false, error: "Invalid email or password. Please check your credentials." },
        { status: 401 }
      );
    }

    const user = signInResult.data?.user;
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication succeeded but user identity was not returned." },
        { status: 500 }
      );
    }

    // Fetch user profile from public.user_profiles
    const db = getDb();
    let profile = await getFullUserProfile(user.id);

    // If profile does not exist yet (e.g. existing user), auto-provision profile record
    if (!profile) {
      const defaultAccountType = cleanEmail.includes("designer") || cleanEmail.includes("talent") ? "talent" : "company";
      const userName = (user as any).profile?.name || cleanEmail.split("@")[0] || "RICOZ Member";

      await db.prepare(`
        INSERT INTO public.user_profiles (id, account_type, email, full_name, avatar_url, is_verified, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, '', true, 'active', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET is_verified = true
      `).run(user.id, defaultAccountType, cleanEmail, userName);

      if (defaultAccountType === "talent") {
        await db.prepare(`
          INSERT INTO public.talent_profiles (id, user_id, headline, bio, location, years_experience, hourly_rate, portfolio_url, skills, availability, created_at, updated_at)
          VALUES (?, ?, 'Creative Director & Brand Specialist', '', '', 5, '$150/hr', '', '[]'::jsonb, 'Available now', NOW(), NOW())
          ON CONFLICT (id) DO NOTHING
        `).run(user.id, user.id);
      } else {
        await db.prepare(`
          INSERT INTO public.company_profiles (id, user_id, company_name, contact_name, business_email, industry, company_size, website_url, billing_country, created_at, updated_at)
          VALUES (?, ?, 'Enterprise Client', ?, ?, 'Technology & Innovation', '10-50', '', '', NOW(), NOW())
          ON CONFLICT (id) DO NOTHING
        `).run(user.id, user.id, userName, cleanEmail);
      }

      profile = await getFullUserProfile(user.id);
    }

    // Verify account status
    if (profile?.status === "suspended") {
      return NextResponse.json(
        {
          success: false,
          error: "Your account has been suspended. Please contact concierge@ricoz.io for assistance.",
        },
        { status: 403 }
      );
    }

    if (profile?.status === "deactivated") {
      return NextResponse.json(
        {
          success: false,
          error: "This account has been deactivated.",
        },
        { status: 403 }
      );
    }

    const accountType = profile?.account_type || "company";
    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days

    // Set secure user session cookies
    await setUserSessionCookies(
      {
        userId: user.id,
        email: cleanEmail,
        accountType,
        fullName: profile?.full_name || cleanEmail,
        avatarUrl: profile?.avatar_url || "",
        exp,
      },
      signInResult.data?.accessToken,
      null
    );

    const redirectUrl = accountType === "talent" ? "/dashboard/designer" : "/dashboard/company";

    return NextResponse.json({
      success: true,
      message: "Successfully signed in.",
      user: {
        id: user.id,
        email: cleanEmail,
      },
      profile,
      accountType,
      redirectUrl,
    });
  } catch (error: any) {
    console.error("Public sign-in exception:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during sign in. Please try again." },
      { status: 500 }
    );
  }
}
