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
 * Includes all boards (with nested widgets and their configs), all apps,
 * and all non-sensitive settings. Internal IDs are stripped and get
 * regenerated on import.
 *
 * This function is synchronous (better-sqlite3 driver).
 */
export function buildExport(): HomelabarrExport {
  const exportBoards = buildExportBoards();
  const exportApps = buildExportApps();
  const exportSettings = buildExportSettings();

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    boards: exportBoards,
    apps: exportApps,
    settings: exportSettings,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildExportBoards(): ExportBoard[] {
  const allBoards = db.select().from(boards).orderBy(asc(boards.position)).all();

  return allBoards.map((board) => {
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
}

function buildExportApps(): ExportApp[] {
  const allApps = db.select().from(apps).orderBy(asc(apps.name)).all();

  return allApps.map((app) => ({
    name: app.name,
    url: app.url,
    icon: app.icon,
    description: app.description,
    statusCheckEnabled: app.statusCheckEnabled === 1,
    statusCheckInterval: app.statusCheckInterval,
  }));
}

function buildExportSettings(): Record<string, string> {
  const allSettings = db.select().from(settings).all();
  const result: Record<string, string> = {};

  for (const s of allSettings) {
    if (!EXCLUDED_SETTINGS_KEYS.includes(s.key)) {
      result[s.key] = s.value;
    }
  }

  return result;
}

function parseConfig(configStr: string | null): Record<string, unknown> {
  if (!configStr) return {};
  try {
    return JSON.parse(configStr) as Record<string, unknown>;
  } catch {
    return {};
  }
}
