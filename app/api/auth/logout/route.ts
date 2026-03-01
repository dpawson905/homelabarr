import { NextResponse } from "next/server";
import {
  getSessionFromCookies,
  deleteSession,
  clearSessionCookie,
} from "@/lib/auth/session";

export async function POST(): Promise<NextResponse> {
  try {
    const session = await getSessionFromCookies();
    if (session) {
      deleteSession(session.token);
    }
    await clearSessionCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Logout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
