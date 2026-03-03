// migrate.js — runs at container startup to apply pending drizzle migrations
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const DB_PATH = process.env.DB_PATH || "./data/homelabarr.db";
const MIGRATIONS_DIR = path.join(__dirname, "drizzle");
const JOURNAL_PATH = path.join(MIGRATIONS_DIR, "meta", "_journal.json");

// Ensure data dir exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

// Create migrations tracking table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS __drizzle_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash TEXT NOT NULL UNIQUE,
    created_at INTEGER
  )
`);

// Read journal to get ordered list of migrations
const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, "utf-8"));

for (const entry of journal.entries) {
  const hash = entry.tag;
  const already = db.prepare("SELECT id FROM __drizzle_migrations WHERE hash = ?").get(hash);
  if (already) continue;

  const sqlFile = path.join(MIGRATIONS_DIR, `${hash}.sql`);
  if (!fs.existsSync(sqlFile)) {
    console.error(`Migration file not found: ${sqlFile}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlFile, "utf-8");
  // Drizzle migration files use "--> statement-breakpoint" as delimiter
  const statements = sql.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean);

  try {
    db.transaction(() => {
      for (const stmt of statements) {
        db.exec(stmt);
      }
      db.prepare("INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)").run(hash, Date.now());
    })();
    console.log(`[migrate] Applied: ${hash}`);
  } catch (err) {
    // If tables already exist (e.g. migrating from a dev DB), mark as applied and continue
    if (err.code === "SQLITE_ERROR" && err.message.includes("already exists")) {
      db.prepare("INSERT OR IGNORE INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)").run(hash, Date.now());
      console.log(`[migrate] Skipped (already applied): ${hash}`);
    } else {
      throw err;
    }
  }
}

// Seed: create default board if none exists
const boardCount = db.prepare("SELECT COUNT(*) as c FROM boards").get().c;
if (boardCount === 0) {
  const { randomUUID } = require("crypto");
  const now = new Date().toISOString();
  const boardId = randomUUID();
  db.prepare("INSERT INTO boards (id, name, position, created_at, updated_at) VALUES (?, ?, 0, ?, ?)").run(boardId, "Default Board", now, now);
  db.prepare("INSERT INTO settings (key, value, updated_at) VALUES ('defaultBoardId', ?, ?)").run(boardId, now);
  console.log("[migrate] Seeded default board:", boardId);
}

db.close();
console.log("[migrate] Done.");
