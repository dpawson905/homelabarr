import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const app = db.select().from(apps).where(eq(apps.id, id)).get();

    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    return NextResponse.json(app);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch app";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = db.select().from(apps).where(eq(apps.id, id)).get();
    if (!existing) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.url !== undefined) updates.url = body.url;
    if (body.icon !== undefined) updates.icon = body.icon;
    if (body.description !== undefined) updates.description = body.description;
    if (body.statusCheckEnabled !== undefined) updates.statusCheckEnabled = body.statusCheckEnabled;
    if (body.statusCheckInterval !== undefined) updates.statusCheckInterval = body.statusCheckInterval;

    const updated = db
      .update(apps)
      .set(updates)
      .where(eq(apps.id, id))
      .returning()
      .get();

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update app";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await params;

    const existing = db.select().from(apps).where(eq(apps.id, id)).get();
    if (!existing) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    db.delete(apps).where(eq(apps.id, id)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete app";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
