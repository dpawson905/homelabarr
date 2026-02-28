import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { boards } from "@/lib/db/schema";
import { asc, sql } from "drizzle-orm";

export async function GET() {
  try {
    const allBoards = db.select().from(boards).orderBy(asc(boards.position)).all();
    return NextResponse.json({ boards: allBoards });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch boards" },
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

    let position = body.position;
    if (position === undefined || position === null) {
      const result = db
        .select({ maxPos: sql<number>`coalesce(max(${boards.position}), -1)` })
        .from(boards)
        .get();
      position = (result?.maxPos ?? -1) + 1;
    }

    const created = db
      .insert(boards)
      .values({
        name: body.name,
        icon: body.icon ?? null,
        position,
      })
      .returning()
      .get();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create board" },
      { status: 500 }
    );
  }
}
