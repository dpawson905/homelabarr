import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSessionFromCookies } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export async function PUT(request: Request): Promise<NextResponse> {
  try {
    // Require authenticated session
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body as {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    };

    // Validate required fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "All password fields are required" },
        { status: 400 }
      );
    }

    // Get current password hash from settings
    const row = db
      .select()
      .from(settings)
      .where(eq(settings.key, "passwordHash"))
      .get();

    if (!row) {
      return NextResponse.json(
        { error: "No password configured" },
        { status: 400 }
      );
    }

    // Verify current password
    if (!verifyPassword(currentPassword, row.value)) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Validate new password length
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New passwords do not match" },
        { status: 400 }
      );
    }

    // Hash and update
    const newHash = hashPassword(newPassword);
    db.update(settings)
      .set({ value: newHash, updatedAt: new Date().toISOString() })
      .where(eq(settings.key, "passwordHash"))
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to change password";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
