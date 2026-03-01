import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { widgetConfigs, widgets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { getWidgetWithConfig, serializeConfig } from "../helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const widget = getWidgetWithConfig(id);

    if (!widget) {
      return NextResponse.json({ error: "Widget not found" }, { status: 404 });
    }

    return NextResponse.json(widget);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch widget";
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

    const existing = db.select().from(widgets).where(eq(widgets.id, id)).get();
    if (!existing) {
      return NextResponse.json({ error: "Widget not found" }, { status: 404 });
    }

    const widgetFields: Record<string, unknown> = {};
    if (body.type !== undefined) widgetFields.type = body.type;
    if (body.x !== undefined) widgetFields.x = body.x;
    if (body.y !== undefined) widgetFields.y = body.y;
    if (body.w !== undefined) widgetFields.w = body.w;
    if (body.h !== undefined) widgetFields.h = body.h;
    if (body.boardId !== undefined) widgetFields.boardId = body.boardId;

    const hasWidgetUpdates = Object.keys(widgetFields).length > 0;
    const hasConfigUpdate = body.config !== undefined;

    db.transaction((tx) => {
      if (hasWidgetUpdates) {
        tx.update(widgets)
          .set({ ...widgetFields, updatedAt: new Date().toISOString() })
          .where(eq(widgets.id, id))
          .run();
      }

      if (hasConfigUpdate) {
        tx.update(widgetConfigs)
          .set({
            config: serializeConfig(body.config),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(widgetConfigs.widgetId, id))
          .run();
      }
    });

    return NextResponse.json(getWidgetWithConfig(id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update widget";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await params;

    const existing = db.select().from(widgets).where(eq(widgets.id, id)).get();
    if (!existing) {
      return NextResponse.json({ error: "Widget not found" }, { status: 404 });
    }

    db.delete(widgets).where(eq(widgets.id, id)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete widget";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
