import { NextResponse } from "next/server";
import {
  getSessionFromCookies,
  deleteSession,
  clearSessionCookie,
} from "@/lib/auth/session";

export async function POST(): Promise<NextResponse> {
  try {
    // Get the current session
    const session = await getSessionFromCookies();

    // Delete session from database if it exists
    if (session) {
      deleteSession(session.token);
    }

    // Always clear the cookie
    await clearSessionCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Logout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
