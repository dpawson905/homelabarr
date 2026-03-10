import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

function isValidSession(token: string): boolean {
  const session = db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .get();

  if (!session) return false;
  return new Date(session.expiresAt) > new Date();
}

export function proxy(request: NextRequest): NextResponse | Response | undefined {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = !!token && isValidSession(token);

  // API routes: return 401 JSON instead of redirect
  if (pathname.startsWith("/api/")) {
    if (!isAuthenticated) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // Page routes: redirect to login
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - /login (login page)
     * - /api/auth/* (auth endpoints — login, logout, setup, session check)
     * - /api/icons/* (public icon serving)
     * - /_next (Next.js internals)
     * - /favicon.ico
     */
    "/((?!login|api/auth|api/icons|_next|favicon\\.ico).*)",
  ],
};
