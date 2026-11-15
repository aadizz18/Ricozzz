import { NextRequest, NextResponse } from "next/server";
import { getInsforgeClient } from "@/lib/insforge";
import { getDb } from "@/lib/admin/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { setUserSessionCookies, getFullUserProfile } from "@/lib/auth/userAuth";

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);

    // Rate Limiting: Max 10 verification attempts per 5 minutes per IP
    const rateLimit = await checkRateLimit("public_verify_otp", clientIp, 10, 300);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many verification attempts. Please wait ${rateLimit.resetInSeconds} seconds before retrying.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.resetInSeconds) },
        }
      );
    }

    const body = await req.json();
    const { email, otp } = body;

    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const cleanOtp = typeof otp === "string" ? otp.trim() : "";

    if (!cleanEmail || !cleanOtp || cleanOtp.length < 4) {
      return NextResponse.json(
        { success: false, error: "Please provide both your registered email and the verification code." },
        { status: 400 }
      );
    }

    // Call InsForge SDK verifyEmail
    const insforge = getInsforgeClient();
    const verifyResult = await insforge.auth.verifyEmail({
      email: cleanEmail,
      otp: cleanOtp,
    });

    if (verifyResult.error) {
      console.warn("InsForge verifyEmail rejected code for", cleanEmail, verifyResult.error.message);
      return NextResponse.json(
        { success: false, error: verifyResult.error.message || "Invalid or expired verification code." },
        { status: verifyResult.error.statusCode || 400 }
      );
    }

    const user = verifyResult.data?.user;
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Verification succeeded but user details were not returned." },
        { status: 500 }
      );
    }

    // Update is_verified in public.user_profiles
    const db = getDb();
    await db.prepare(`
      UPDATE public.user_profiles
      SET is_verified = true, updated_at = NOW()
      WHERE id = ?
    `).run(user.id);

    // Fetch user profile
    const profile = await getFullUserProfile(user.id);
    const accountType = profile?.account_type || "talent";

    // Set secure user session cookies
    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days
    await setUserSessionCookies(
      {
        userId: user.id,
        email: cleanEmail,
        accountType,
        fullName: profile?.full_name || cleanEmail,
        avatarUrl: profile?.avatar_url || "",
        exp,
      },
      verifyResult.data?.accessToken,
      null
    );

    const redirectUrl = accountType === "talent" ? "/dashboard/designer" : "/dashboard/company";

    return NextResponse.json({
      success: true,
      message: "Email successfully verified and authenticated.",
      user,
      profile,
      accountType,
      redirectUrl,
    });
  } catch (error: any) {
    console.error("Public verifyEmail error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify email. Please try again." },
      { status: 500 }
    );
  }
}
