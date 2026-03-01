import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { dirname } from "path";
import * as schema from "./schema";

const DB_PATH = "./data/homelabarr.db";

mkdirSync(dirname(DB_PATH), { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });

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
  Session,
  NewSession,
  Secret,
  NewSecret,
} from "./schema";
