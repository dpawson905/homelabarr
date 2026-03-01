import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ key: string }> };

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const { key } = await params;
    const setting = db.select().from(settings).where(eq(settings.key, key)).get();

    if (!setting) {
      return NextResponse.json({ error: "Setting not found" }, { status: 404 });
    }

    return NextResponse.json({ key: setting.key, value: setting.value });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch setting";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const { key } = await params;
    const body = await request.json();

    if (body.value === undefined) {
      return NextResponse.json({ error: "value is required" }, { status: 400 });
    }

    const value = typeof body.value === "string" ? body.value : String(body.value);

    const result = db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt: new Date().toISOString() },
      })
      .returning()
      .get();

    return NextResponse.json({ key: result.key, value: result.value });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upsert setting";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
