// ─── Export Format Types ────────────────────────────────────────────────────
// These types define the portable JSON format used for dashboard backup/restore.
// Internal IDs are excluded -- they get regenerated on import.

export interface HomelabarrExport {
  version: 1;
  exportedAt: string; // ISO 8601
  boards: ExportBoard[];
  apps: ExportApp[];
  settings: Record<string, string>;
}

export interface ExportBoard {
  name: string;
  icon: string | null;
  position: number;
  widgets: ExportWidget[];
}

export interface ExportWidget {
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  config: Record<string, unknown>;
}

export interface ExportApp {
  name: string;
  url: string;
  icon: string | null;
  description: string | null;
  statusCheckEnabled: boolean;
  statusCheckInterval: number;
}

// ─── Import Result ──────────────────────────────────────────────────────────

export interface ImportResult {
  boardsImported: number;
  widgetsImported: number;
  appsImported: number;
  settingsImported: number;
  warnings: string[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Settings keys that must never be included in an export */
export const EXCLUDED_SETTINGS_KEYS = ["passwordHash", "defaultBoardId"];
