import { db } from "@/lib/db";
import {
  boards,
  widgets,
  widgetConfigs,
  apps,
  settings,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import {
  type HomelabarrExport,
  type ExportBoard,
  type ImportResult,
  EXCLUDED_SETTINGS_KEYS,
} from "./schema";

// ─── Error Type ─────────────────────────────────────────────────────────────

export class ImportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportValidationError";
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Import a dashboard configuration, either merging with existing data
 * or replacing it entirely.
 *
 * All mutations are wrapped in a transaction for atomicity.
 */
export function importConfig(
  data: HomelabarrExport,
  mode: "merge" | "replace"
): ImportResult {
  validateImport(data);

  if (mode === "replace") {
    return importReplace(data);
  }
  return importMerge(data);
}

// ─── Validation ─────────────────────────────────────────────────────────────

function validateImport(data: HomelabarrExport): void {
  if (data.version !== 1) {
    throw new ImportValidationError(
      `Unsupported export version: ${data.version}. Only version 1 is supported.`
    );
  }

  if (!Array.isArray(data.boards)) {
    throw new ImportValidationError("Invalid export: 'boards' must be an array.");
  }

  if (!Array.isArray(data.apps)) {
    throw new ImportValidationError("Invalid export: 'apps' must be an array.");
  }

  if (
    typeof data.settings !== "object" ||
    data.settings === null ||
    Array.isArray(data.settings)
  ) {
    throw new ImportValidationError("Invalid export: 'settings' must be an object.");
  }

  for (const board of data.boards) {
    if (!Array.isArray(board.widgets)) continue;
    for (const widget of board.widgets) {
      if (!widget.type || typeof widget.type !== "string") {
        throw new ImportValidationError(
          `Invalid widget in board "${board.name}": 'type' must be a non-empty string.`
        );
      }
    }
  }
}

// ─── Replace Mode ──────────────────────────────────────────────────────────

function importReplace(data: HomelabarrExport): ImportResult {
  const warnings: string[] = [];
  let boardsImported = 0;
  let widgetsImported = 0;
  let appsImported = 0;
  let settingsImported = 0;

  db.transaction((tx) => {
    const now = new Date().toISOString();

    // Delete all existing data (order matters for foreign keys)
    tx.delete(widgetConfigs).run();
    tx.delete(widgets).run();
    tx.delete(boards).run();
    tx.delete(apps).run();

    // Preserve passwordHash; delete everything else from settings
    const existingSettings = tx.select().from(settings).all();
    for (const s of existingSettings) {
      if (s.key !== "passwordHash") {
        tx.delete(settings).where(eq(settings.key, s.key)).run();
      }
    }

    const counts = insertBoardsAndWidgets(tx, data.boards, now);
    boardsImported = counts.boards;
    widgetsImported = counts.widgets;

    for (const exportApp of data.apps) {
      tx.insert(apps)
        .values({
          id: crypto.randomUUID(),
          name: exportApp.name,
          url: exportApp.url,
          icon: exportApp.icon ?? null,
          description: exportApp.description ?? null,
          statusCheckEnabled: exportApp.statusCheckEnabled ? 1 : 0,
          statusCheckInterval: exportApp.statusCheckInterval ?? 300,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      appsImported++;
    }

    for (const [key, value] of Object.entries(data.settings)) {
      if (EXCLUDED_SETTINGS_KEYS.includes(key)) continue;
      tx.insert(settings).values({ key, value, updatedAt: now }).run();
      settingsImported++;
    }

    // Point defaultBoardId at the first imported board
    if (data.boards.length > 0) {
      const firstBoard = tx.select({ id: boards.id }).from(boards).limit(1).get();
      if (firstBoard) {
        tx.insert(settings)
          .values({ key: "defaultBoardId", value: firstBoard.id, updatedAt: now })
          .onConflictDoUpdate({
            target: settings.key,
            set: { value: firstBoard.id, updatedAt: now },
          })
          .run();
      }
    }
  });

  return { boardsImported, widgetsImported, appsImported, settingsImported, warnings };
}

// ─── Merge Mode ────────────────────────────────────────────────────────────

function importMerge(data: HomelabarrExport): ImportResult {
  const warnings: string[] = [];
  let boardsImported = 0;
  let widgetsImported = 0;
  let appsImported = 0;
  let settingsImported = 0;

  db.transaction((tx) => {
    const now = new Date().toISOString();

    const counts = insertBoardsAndWidgets(tx, data.boards, now);
    boardsImported = counts.boards;
    widgetsImported = counts.widgets;

    for (const exportApp of data.apps) {
      const existing = tx
        .select({ id: apps.id })
        .from(apps)
        .where(and(eq(apps.name, exportApp.name), eq(apps.url, exportApp.url)))
        .get();

      if (existing) {
        warnings.push(
          `Skipped app "${exportApp.name}" (${exportApp.url}) — already exists.`
        );
        continue;
      }

      tx.insert(apps)
        .values({
          id: crypto.randomUUID(),
          name: exportApp.name,
          url: exportApp.url,
          icon: exportApp.icon ?? null,
          description: exportApp.description ?? null,
          statusCheckEnabled: exportApp.statusCheckEnabled ? 1 : 0,
          statusCheckInterval: exportApp.statusCheckInterval ?? 300,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      appsImported++;
    }

    for (const [key, value] of Object.entries(data.settings)) {
      if (EXCLUDED_SETTINGS_KEYS.includes(key)) continue;

      const existing = tx
        .select({ key: settings.key })
        .from(settings)
        .where(eq(settings.key, key))
        .get();

      if (existing) {
        warnings.push(`Skipped setting "${key}" — already exists.`);
        continue;
      }

      tx.insert(settings).values({ key, value, updatedAt: now }).run();
      settingsImported++;
    }
  });

  return { boardsImported, widgetsImported, appsImported, settingsImported, warnings };
}

// ─── Shared Helpers ─────────────────────────────────────────────────────────

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function insertBoardsAndWidgets(
  tx: Tx,
  exportBoards: ExportBoard[],
  now: string
): { boards: number; widgets: number } {
  let boardCount = 0;
  let widgetCount = 0;

  for (const exportBoard of exportBoards) {
    const boardId = crypto.randomUUID();
    tx.insert(boards)
      .values({
        id: boardId,
        name: exportBoard.name,
        icon: exportBoard.icon ?? null,
        position: exportBoard.position,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    boardCount++;

    for (const exportWidget of exportBoard.widgets ?? []) {
      const widgetId = crypto.randomUUID();
      tx.insert(widgets)
        .values({
          id: widgetId,
          boardId,
          type: exportWidget.type,
          x: exportWidget.x ?? 0,
          y: exportWidget.y ?? 0,
          w: exportWidget.w ?? 1,
          h: exportWidget.h ?? 1,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      tx.insert(widgetConfigs)
        .values({
          id: crypto.randomUUID(),
          widgetId,
          config: JSON.stringify(exportWidget.config ?? {}),
          createdAt: now,
          updatedAt: now,
        })
        .run();

      widgetCount++;
    }
  }

  return { boards: boardCount, widgets: widgetCount };
}
