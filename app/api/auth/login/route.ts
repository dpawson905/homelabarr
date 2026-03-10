import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/auth/rate-limit";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // Rate limit by IP — 5 attempts per 15 minutes
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
    const rateCheck = checkRateLimit(ip);
    if (rateCheck.limited) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(rateCheck.retryAfterSeconds) },
        }
      );
    }

    const body = await request.json();
    const { password, rememberMe = false } = body as {
      password: string;
      rememberMe?: boolean;
    };

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    const row = db
      .select()
      .from(settings)
      .where(eq(settings.key, "passwordHash"))
      .get();

    if (!row) {
      return NextResponse.json(
        { error: "Setup required. No password has been configured." },
        { status: 400 }
      );
    }

    if (!verifyPassword(password, row.value)) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const token = createSession(rememberMe);
    await setSessionCookie(token, rememberMe);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
