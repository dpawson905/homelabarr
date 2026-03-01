import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

export function proxy(request: NextRequest): NextResponse {
  const session = request.cookies.get(SESSION_COOKIE_NAME);
  if (!session?.value) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api/auth|_next|favicon\\.ico|icons).*)"],
};
