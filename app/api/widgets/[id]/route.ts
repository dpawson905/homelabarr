import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { widgets, widgetConfigs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function parseConfig(configStr: string): unknown {
  try {
    return JSON.parse(configStr);
  } catch {
    return {};
  }
}

function getWidgetWithConfig(id: string) {
  const row = db
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
    .where(eq(widgets.id, id))
    .get();

  if (!row) return null;

  return { ...row, config: row.config ? parseConfig(row.config) : {} };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const widget = getWidgetWithConfig(id);

    if (!widget) {
      return NextResponse.json({ error: "Widget not found" }, { status: 404 });
    }

    return NextResponse.json(widget);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch widget" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = db
      .select()
      .from(widgets)
      .where(eq(widgets.id, id))
      .get();

    if (!existing) {
      return NextResponse.json({ error: "Widget not found" }, { status: 404 });
    }

    const widgetFields: Record<string, unknown> = {};
    const hasWidgetUpdates =
      body.type !== undefined ||
      body.x !== undefined ||
      body.y !== undefined ||
      body.w !== undefined ||
      body.h !== undefined ||
      body.boardId !== undefined;

    if (body.type !== undefined) widgetFields.type = body.type;
    if (body.x !== undefined) widgetFields.x = body.x;
    if (body.y !== undefined) widgetFields.y = body.y;
    if (body.w !== undefined) widgetFields.w = body.w;
    if (body.h !== undefined) widgetFields.h = body.h;
    if (body.boardId !== undefined) widgetFields.boardId = body.boardId;

    const hasConfigUpdate = body.config !== undefined;

    if (hasWidgetUpdates && hasConfigUpdate) {
      db.transaction((tx) => {
        tx.update(widgets)
          .set({ ...widgetFields, updatedAt: new Date().toISOString() })
          .where(eq(widgets.id, id))
          .run();

        const configValue =
          typeof body.config === "string"
            ? body.config
            : JSON.stringify(body.config);

        tx.update(widgetConfigs)
          .set({ config: configValue, updatedAt: new Date().toISOString() })
          .where(eq(widgetConfigs.widgetId, id))
          .run();
      });
    } else if (hasWidgetUpdates) {
      db.update(widgets)
        .set({ ...widgetFields, updatedAt: new Date().toISOString() })
        .where(eq(widgets.id, id))
        .run();
    } else if (hasConfigUpdate) {
      const configValue =
        typeof body.config === "string"
          ? body.config
          : JSON.stringify(body.config);

      db.update(widgetConfigs)
        .set({ config: configValue, updatedAt: new Date().toISOString() })
        .where(eq(widgetConfigs.widgetId, id))
        .run();
    }

    const updated = getWidgetWithConfig(id);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update widget" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = db
      .select()
      .from(widgets)
      .where(eq(widgets.id, id))
      .get();

    if (!existing) {
      return NextResponse.json({ error: "Widget not found" }, { status: 404 });
    }

    db.delete(widgets).where(eq(widgets.id, id)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete widget" },
      { status: 500 }
    );
  }
}
