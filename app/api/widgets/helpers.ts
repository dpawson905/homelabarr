import { db } from "@/lib/db";
import { widgets, widgetConfigs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export function parseConfig(configStr: string): unknown {
  try {
    return JSON.parse(configStr);
  } catch {
    return {};
  }
}

export function serializeConfig(config: unknown): string {
  return typeof config === "string" ? config : JSON.stringify(config);
}

export function getWidgetWithConfig(id: string) {
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
