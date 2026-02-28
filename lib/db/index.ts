import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { dirname } from "path";
import * as schema from "./schema";

const DB_PATH = "./data/homelabarr.db";

// Ensure the data directory exists
mkdirSync(dirname(DB_PATH), { recursive: true });

// Create the better-sqlite3 connection and enable WAL mode
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");

// Create the Drizzle ORM instance with schema
export const db = drizzle(sqlite, { schema });

// Re-export all schema types for convenience
export type {
  Board,
  NewBoard,
  Widget,
  NewWidget,
  WidgetConfig,
  NewWidgetConfig,
  App,
  NewApp,
  Setting,
  NewSetting,
} from "./schema";
