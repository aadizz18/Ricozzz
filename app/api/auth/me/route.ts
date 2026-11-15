import { NextResponse } from "next/server";
import { getCurrentUserSession, getFullUserProfile } from "@/lib/auth/userAuth";

export async function GET() {
  try {
    const session = await getCurrentUserSession();

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        profile: null,
        accountType: null,
      });
    }

    const profile = await getFullUserProfile(session.userId);

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId,
        email: session.email,
        fullName: session.fullName,
        accountType: session.accountType,
      },
      profile,
      accountType: session.accountType,
    });
  } catch (error: any) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json({
      authenticated: false,
      user: null,
      profile: null,
      accountType: null,
    });
  }
}
