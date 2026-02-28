import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apps } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    const allApps = db.select().from(apps).orderBy(asc(apps.name)).all();
    return NextResponse.json({ apps: allApps });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch apps" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        { error: "name is required and must be a string" },
        { status: 400 }
      );
    }

    if (!body.url || typeof body.url !== "string") {
      return NextResponse.json(
        { error: "url is required and must be a string" },
        { status: 400 }
      );
    }

    const created = db
      .insert(apps)
      .values({
        name: body.name,
        url: body.url,
        icon: body.icon ?? null,
        description: body.description ?? null,
        statusCheckEnabled: body.statusCheckEnabled ?? 0,
        statusCheckInterval: body.statusCheckInterval ?? 300,
      })
      .returning()
      .get();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create app" },
      { status: 500 }
    );
  }
}
