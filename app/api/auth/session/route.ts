import { NextResponse } from "next/server";
import { isPasswordSet } from "@/lib/auth/password";
import { getSessionFromCookies } from "@/lib/auth/session";

export async function GET(): Promise<NextResponse> {
  try {
    // If no password has been set, setup is required
    if (!isPasswordSet()) {
      return NextResponse.json({
        authenticated: false,
        setupRequired: true,
      });
    }

    // Check for a valid session
    const session = await getSessionFromCookies();
    if (session) {
      return NextResponse.json({ authenticated: true });
    }

    return NextResponse.json({
      authenticated: false,
      setupRequired: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to check session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
