import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { isPasswordSet, hashPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { password, confirmPassword } = body as {
      password: string;
      confirmPassword: string;
    };

    // Only allow setup when no password exists
    if (isPasswordSet()) {
      return NextResponse.json(
        { error: "Password has already been configured" },
        { status: 400 }
      );
    }

    // Validate inputs
    if (!password || !confirmPassword) {
      return NextResponse.json(
        { error: "Password and confirmation are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }

    // Hash and store password
    const hash = hashPassword(password);
    db.insert(settings)
      .values({ key: "passwordHash", value: hash })
      .run();

    // Auto-login after setup: create session and set cookie
    const token = createSession(false);
    await setSessionCookie(token, false);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Setup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
