import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  console.log(`[middleware] ${request.method} ${pathname}`);
  const session = request.cookies.get(SESSION_COOKIE_NAME);
  if (!session?.value) {
    console.log(`[middleware] No session, redirecting to /login`);
    return NextResponse.redirect(new URL("/login", request.url));
  }
  console.log(`[middleware] Session OK, proceeding`);
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api/auth|_next|favicon\\.ico|icons).*)"],
};
