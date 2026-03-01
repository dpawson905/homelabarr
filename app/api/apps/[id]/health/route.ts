import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  checkAppHealth,
  getCachedHealth,
  setCachedHealth,
} from "@/lib/health-check";

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

    if (app.statusCheckEnabled !== 1) {
      return NextResponse.json({ status: "disabled" });
    }

    // Check cache first
    const cached = getCachedHealth(app.id, app.statusCheckInterval);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Cache miss or stale -- perform a fresh check
    const result = await checkAppHealth(app.url);
    setCachedHealth(app.id, result);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to check app health";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
