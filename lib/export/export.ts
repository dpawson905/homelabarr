import { db } from "@/lib/db";
import { boards, widgets, widgetConfigs, apps, settings } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import {
  type HomelabarrExport,
  type ExportBoard,
  type ExportApp,
  EXCLUDED_SETTINGS_KEYS,
} from "./schema";

/**
 * Build a complete export snapshot of the dashboard configuration.
 *
 * The export includes all boards (with nested widgets and their configs),
 * all apps, and all non-sensitive settings. Internal IDs are stripped --
 * they get regenerated on import.
 *
 * This function is synchronous (better-sqlite3 driver).
 */
export function buildExport(): HomelabarrExport {
  // 1. Query all boards ordered by position
  const allBoards = db
    .select()
    .from(boards)
    .orderBy(asc(boards.position))
    .all();

  // 2. For each board, query its widgets with configs
  const exportBoards: ExportBoard[] = allBoards.map((board) => {
    const widgetRows = db
      .select({
        type: widgets.type,
        x: widgets.x,
        y: widgets.y,
        w: widgets.w,
        h: widgets.h,
        config: widgetConfigs.config,
      })
      .from(widgets)
      .leftJoin(widgetConfigs, eq(widgets.id, widgetConfigs.widgetId))
      .where(eq(widgets.boardId, board.id))
      .orderBy(asc(widgets.y), asc(widgets.x))
      .all();

    return {
      name: board.name,
      icon: board.icon,
      position: board.position,
      widgets: widgetRows.map((w) => ({
        type: w.type,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        config: parseConfig(w.config),
      })),
    };
  });

  // 3. Query all apps
  const allApps = db.select().from(apps).orderBy(asc(apps.name)).all();
  const exportApps: ExportApp[] = allApps.map((app) => ({
    name: app.name,
    url: app.url,
    icon: app.icon,
    description: app.description,
    statusCheckEnabled: app.statusCheckEnabled === 1,
    statusCheckInterval: app.statusCheckInterval,
  }));

  // 4. Query all settings, filtering out security-sensitive keys
  const allSettings = db.select().from(settings).all();
  const exportSettings: Record<string, string> = {};
  for (const s of allSettings) {
    if (!EXCLUDED_SETTINGS_KEYS.includes(s.key)) {
      exportSettings[s.key] = s.value;
    }
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    boards: exportBoards,
    apps: exportApps,
    settings: exportSettings,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseConfig(configStr: string | null): Record<string, unknown> {
  if (!configStr) return {};
  try {
    return JSON.parse(configStr) as Record<string, unknown>;
  } catch {
    return {};
  }
}
