import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_SESSION_COOKIE = "ricoz_admin_session";
const USER_SESSION_COOKIE = "ricoz_user_session";

interface PublicUserToken {
  userId: string;
  email: string;
  accountType: "talent" | "company";
  exp: number;
}

function parseUserSessionCookie(cookieValue: string | undefined): PublicUserToken | null {
  if (!cookieValue) return null;
  try {
    const parts = cookieValue.split(".");
    if (parts.length !== 2) return null;

    // Decode base64url payload
    const base64 = parts[0].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    const payload = JSON.parse(json) as PublicUserToken;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // -------------------------------------------------------------
  // 1. ADMIN PANEL ROUTE PROTECTION (Strictly Isolated)
  // -------------------------------------------------------------
  if (pathname === "/admin/login" || pathname === "/api/admin/auth/login") {
    return NextResponse.next();
  }

  const adminCookie = req.cookies.get(ADMIN_SESSION_COOKIE);
  const hasValidAdminCookie = Boolean(
    adminCookie && adminCookie.value && adminCookie.value.length >= 16
  );

  // Intercept unauthenticated API requests to /api/admin/*
  if (pathname.startsWith("/api/admin")) {
    if (!hasValidAdminCookie) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // Intercept unauthenticated browser requests to /admin/*
  if (pathname.startsWith("/admin")) {
    if (!hasValidAdminCookie) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // -------------------------------------------------------------
  // 2. PUBLIC WORKSPACE ACCOUNT PROTECTION (/dashboard/*)
  // -------------------------------------------------------------
  if (pathname.startsWith("/dashboard")) {
    const userCookie = req.cookies.get(USER_SESSION_COOKIE);
    const userToken = parseUserSessionCookie(userCookie?.value);

    // If unauthenticated or token is expired, redirect to public login
    if (!userToken) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Enforce role segregation between talent and company workspaces
    if (pathname.startsWith("/dashboard/designer") && userToken.accountType === "company") {
      return NextResponse.redirect(new URL("/dashboard/company", req.url));
    }
    if (pathname.startsWith("/dashboard/company") && userToken.accountType === "talent") {
      return NextResponse.redirect(new URL("/dashboard/designer", req.url));
    }
  }

  // -------------------------------------------------------------
  // 3. SECURITY HEADERS
  // -------------------------------------------------------------
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/dashboard/:path*",
  ],
};
