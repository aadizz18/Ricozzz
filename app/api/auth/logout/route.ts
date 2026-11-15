import { NextResponse } from "next/server";
import { clearUserSessionCookies } from "@/lib/auth/userAuth";

export async function POST() {
  try {
    await clearUserSessionCookies();
    return NextResponse.json({
      success: true,
      message: "Successfully logged out.",
    });
  } catch (error: any) {
    console.error("POST /api/auth/logout error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to log out cleanly." },
      { status: 500 }
    );
  }
}
