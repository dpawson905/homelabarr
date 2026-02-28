import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { widgets, widgetConfigs, boards } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

function parseConfig(configStr: string): unknown {
  try {
    return JSON.parse(configStr);
  } catch {
    return {};
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get("boardId");

    let query = db
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

    if (boardId) {
      query = query.where(eq(widgets.boardId, boardId)) as typeof query;
    }

    const rows = query.all();

    const result = rows.map((row) => ({
      ...row,
      config: row.config ? parseConfig(row.config) : {},
    }));

    return NextResponse.json({ widgets: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch widgets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Validate board exists
    const board = db
      .select()
      .from(boards)
      .where(eq(boards.id, body.boardId))
      .get();

    if (!board) {
      return NextResponse.json(
        { error: "Board not found" },
        { status: 404 }
      );
    }

    const configValue =
      body.config !== undefined
        ? typeof body.config === "string"
          ? body.config
          : JSON.stringify(body.config)
        : "{}";

    const result = db.transaction((tx) => {
      const widget = tx
        .insert(widgets)
        .values({
          boardId: body.boardId,
          type: body.type,
          x: body.x ?? 0,
          y: body.y ?? 0,
          w: body.w ?? 1,
          h: body.h ?? 1,
        })
        .returning()
        .get();

      const config = tx
        .insert(widgetConfigs)
        .values({
          widgetId: widget.id,
          config: configValue,
        })
        .returning()
        .get();

      return { ...widget, config: parseConfig(config.config) };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create widget" },
      { status: 500 }
    );
  }
}
