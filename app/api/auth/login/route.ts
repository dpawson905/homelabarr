import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isPasswordSet, verifyPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { password, rememberMe } = body as {
      password: string;
      rememberMe?: boolean;
    };

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    // Password must already be set to login
    if (!isPasswordSet()) {
      return NextResponse.json(
        { error: "Setup required. No password has been configured." },
        { status: 400 }
      );
    }

    // Get the stored hash
    const row = db
      .select()
      .from(settings)
      .where(eq(settings.key, "passwordHash"))
      .get();

    if (!row) {
      return NextResponse.json(
        { error: "Password hash not found" },
        { status: 500 }
      );
    }

    // Verify password
    if (!verifyPassword(password, row.value)) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    // Create session and set cookie
    const remember = rememberMe ?? false;
    const token = createSession(remember);
    await setSessionCookie(token, remember);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
