import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { boards, widgetConfigs, widgets } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";

import { parseConfig, serializeConfig } from "./helpers";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const boardId = new URL(request.url).searchParams.get("boardId");

    const baseQuery = db
      .select({
        id: widgets.id,
        boardId: widgets.boardId,
        type: widgets.type,
        x: widgets.x,
        y: widgets.y,
        w: widgets.w,
        h: widgets.h,
        createdAt: widgets.createdAt,
        updatedAt: widgets.updatedAt,
        config: widgetConfigs.config,
      })
      .from(widgets)
      .leftJoin(widgetConfigs, eq(widgets.id, widgetConfigs.widgetId))
      .orderBy(asc(widgets.y), asc(widgets.x));

    const rows = boardId
      ? baseQuery.where(eq(widgets.boardId, boardId)).all()
      : baseQuery.all();

    const result = rows.map((row) => ({
      ...row,
      config: row.config ? parseConfig(row.config) : {},
    }));

    return NextResponse.json({ widgets: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch widgets";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    if (!body.boardId || typeof body.boardId !== "string") {
      return NextResponse.json(
        { error: "boardId is required and must be a string" },
        { status: 400 }
      );
    }

    if (!body.type || typeof body.type !== "string") {
      return NextResponse.json(
        { error: "type is required and must be a string" },
        { status: 400 }
      );
    }

    const board = db.select().from(boards).where(eq(boards.id, body.boardId)).get();
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const configValue = body.config !== undefined ? serializeConfig(body.config) : "{}";

    const result = db.transaction((tx) => {
      // Place new widgets below existing ones to avoid overlap
      const existing = tx
        .select({ y: widgets.y, h: widgets.h })
        .from(widgets)
        .where(eq(widgets.boardId, body.boardId))
        .all();
      const bottomY = existing.reduce((max, w) => Math.max(max, w.y + w.h), 0);

      const widget = tx
        .insert(widgets)
        .values({
          boardId: body.boardId,
          type: body.type,
          x: body.x ?? 0,
          y: Number.isFinite(body.y) ? body.y : bottomY,
          w: body.w ?? 1,
          h: body.h ?? 1,
        })
        .returning()
        .get();

      const config = tx
        .insert(widgetConfigs)
        .values({ widgetId: widget.id, config: configValue })
        .returning()
        .get();

      return { ...widget, config: parseConfig(config.config) };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create widget";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
