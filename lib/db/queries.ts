import { db } from "@/lib/db";
import { boards, settings, apps, widgets, widgetConfigs } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";

export function getBoards() {
  return db.select().from(boards).orderBy(asc(boards.position)).all();
}

export function getBoardById(id: string) {
  return db.select().from(boards).where(eq(boards.id, id)).get() ?? null;
}

export function getDefaultBoardId(): string | null {
  const setting = db
    .select()
    .from(settings)
    .where(eq(settings.key, "defaultBoardId"))
    .get();
  if (setting) return setting.value;

  const firstBoard = db
    .select({ id: boards.id })
    .from(boards)
    .orderBy(asc(boards.position))
    .limit(1)
    .get();
  return firstBoard?.id ?? null;
}

export function getWidgetsByBoardId(boardId: string) {
  const widgetRows = db
    .select()
    .from(widgets)
    .where(eq(widgets.boardId, boardId))
    .orderBy(asc(widgets.y), asc(widgets.x))
    .all();

  return widgetRows.map((widget) => {
    const configRow = db
      .select()
      .from(widgetConfigs)
      .where(eq(widgetConfigs.widgetId, widget.id))
      .get();

    if (!configRow) return { ...widget, config: null };

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(configRow.config);
    } catch {
      parsed = {};
    }

    return { ...widget, config: parsed };
  });
}

export function getSettings(): Record<string, string> {
  const rows = db.select().from(settings).all();
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export function getApps() {
  return db.select().from(apps).orderBy(asc(apps.name)).all();
}
