---
phase: 02-database-configuration-layer
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - lib/db/index.ts
  - lib/db/schema.ts
  - drizzle.config.ts
autonomous: true

must_haves:
  truths:
    - Drizzle ORM is installed and configured to use SQLite via better-sqlite3
    - Database schema defines tables for boards, widgets, widget_configs, apps, and settings
    - Running drizzle-kit generates migration SQL files
    - The database file is created at data/homelabarr.db on first access
    - Schema supports all fields needed by future phases (widget positions, sizes, board layouts, app URLs, settings key-value pairs)
  artifacts:
    - lib/db/index.ts (database connection singleton)
    - lib/db/schema.ts (Drizzle table definitions)
    - drizzle.config.ts (drizzle-kit configuration)
    - drizzle/ directory (generated migrations)
  key_links:
    - lib/db/index.ts imports schema from lib/db/schema.ts
    - drizzle.config.ts points to lib/db/schema.ts as the schema source
    - drizzle.config.ts points to data/homelabarr.db as the database file
---

<objective>
Install Drizzle ORM with better-sqlite3, define the complete database schema, and set up migrations so all dashboard state can be persisted to SQLite.

Purpose: Establish the persistence foundation that every subsequent feature depends on. Without this, nothing survives a server restart.
Output: A working database layer with schema, migrations, and a connection singleton ready for use by API routes.
</objective>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md

Key context:
- No database packages are installed yet. Need to install drizzle-orm, better-sqlite3, drizzle-kit, and @types/better-sqlite3.
- The project uses Next.js 16 App Router with TypeScript. The tsconfig has `"paths": {"@/*": ["./*"]}` so imports like `@/lib/db` will work.
- The database file should live at `data/homelabarr.db` (gitignored). This keeps the DB file in a predictable location for Docker volume mounting later.
- Add `data/` to .gitignore.
- The schema must support the full roadmap: boards (multi-board support), widgets (with grid positions/sizes for Phase 3), widget configurations (JSON blob per widget), apps (bookmarks with URL, icon, status for Phase 4), and settings (key-value store for app-wide config).
- Drizzle ORM is the right choice: lightweight, TypeScript-first, great SQLite support, drizzle-kit for migrations, and works well with Next.js server components and API routes.

Schema design notes:
- **boards**: id (text UUID primary key), name, icon (optional), position (integer for ordering), created_at, updated_at. A default board should be seeded.
- **widgets**: id (text UUID primary key), board_id (FK to boards), type (string identifying widget kind, e.g. "clock", "app-bookmark", "system-stats"), x, y, w, h (integers for grid position/size), created_at, updated_at. Position fields default to 0 -- Phase 3 will use them.
- **widget_configs**: id (text UUID primary key), widget_id (FK to widgets, unique -- one config per widget), config (text, JSON stringified), created_at, updated_at. The config column stores a JSON blob whose shape depends on widget type.
- **apps**: id (text UUID primary key), name, url, icon (optional, string -- icon identifier), description (optional), status_check_enabled (integer boolean, default 0), status_check_interval (integer seconds, default 300), created_at, updated_at. Apps can be referenced by app-bookmark widgets via widget_configs.
- **settings**: key (text primary key), value (text), updated_at. Simple key-value store for global settings like theme preference, default board, etc.

Use `text` type for UUIDs (SQLite has no native UUID). Use `integer` for booleans (SQLite convention). Use `text` with `$defaultFn(() => new Date().toISOString())` for timestamps, or use Drizzle's built-in timestamp handling for SQLite.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install Drizzle ORM and SQLite dependencies</name>
  <files>
    package.json
    .gitignore
    drizzle.config.ts
  </files>
  <action>
  Install the required packages:
  - `npm install drizzle-orm better-sqlite3` (runtime dependencies)
  - `npm install -D drizzle-kit @types/better-sqlite3` (dev dependencies)

  Create `drizzle.config.ts` in the project root:
  - Import `defineConfig` from `drizzle-kit`
  - Export a config that specifies:
    - `schema: "./lib/db/schema.ts"`
    - `out: "./drizzle"` (migration output directory)
    - `dialect: "sqlite"`
    - `dbCredentials: { url: "./data/homelabarr.db" }`

  Add to `.gitignore` (create if it doesn't exist, or append):
  - `data/` (the SQLite database directory)
  - `drizzle/` should NOT be gitignored -- migrations should be committed for reproducibility

  Add npm scripts to package.json:
  - `"db:generate": "drizzle-kit generate"`
  - `"db:migrate": "drizzle-kit migrate"`
  - `"db:studio": "drizzle-kit studio"`
  </action>
  <verify>
  - Run `npx tsc --noEmit` to verify drizzle.config.ts has no type errors
  - Run `cat package.json` and confirm drizzle-orm, better-sqlite3 in dependencies; drizzle-kit, @types/better-sqlite3 in devDependencies
  - Confirm drizzle.config.ts exists and exports a valid config
  - Confirm .gitignore contains `data/`
  - Confirm package.json has db:generate, db:migrate, db:studio scripts
  </verify>
  <done>
  - drizzle-orm and better-sqlite3 are installed as dependencies
  - drizzle-kit and @types/better-sqlite3 are installed as devDependencies
  - drizzle.config.ts exists with correct schema path, output directory, and SQLite dialect
  - .gitignore excludes data/ directory
  - package.json has db:generate, db:migrate, db:studio scripts
  </done>
</task>

<task type="auto">
  <name>Task 2: Define the database schema and create the connection singleton</name>
  <files>
    lib/db/schema.ts
    lib/db/index.ts
  </files>
  <action>
  **lib/db/schema.ts:**
  Define all tables using Drizzle's SQLite schema builder (`drizzle-orm/sqlite-core`).

  Tables to define:

  1. **boards** table:
     - `id`: text, primary key, default to `crypto.randomUUID()`
     - `name`: text, not null
     - `icon`: text (nullable, for future icon picker)
     - `position`: integer, not null, default 0 (for ordering boards in the sidebar)
     - `createdAt`: text, not null, default to ISO timestamp
     - `updatedAt`: text, not null, default to ISO timestamp

  2. **widgets** table:
     - `id`: text, primary key, default to `crypto.randomUUID()`
     - `boardId`: text, not null, references boards.id with onDelete cascade
     - `type`: text, not null (widget type identifier like "clock", "app-bookmark", etc.)
     - `x`: integer, not null, default 0 (grid column position)
     - `y`: integer, not null, default 0 (grid row position)
     - `w`: integer, not null, default 1 (grid column span)
     - `h`: integer, not null, default 1 (grid row span)
     - `createdAt`: text, not null, default to ISO timestamp
     - `updatedAt`: text, not null, default to ISO timestamp

  3. **widgetConfigs** table:
     - `id`: text, primary key, default to `crypto.randomUUID()`
     - `widgetId`: text, not null, unique, references widgets.id with onDelete cascade
     - `config`: text, not null, default "{}" (JSON string)
     - `createdAt`: text, not null, default to ISO timestamp
     - `updatedAt`: text, not null, default to ISO timestamp

  4. **apps** table:
     - `id`: text, primary key, default to `crypto.randomUUID()`
     - `name`: text, not null
     - `url`: text, not null
     - `icon`: text (nullable)
     - `description`: text (nullable)
     - `statusCheckEnabled`: integer, not null, default 0 (boolean)
     - `statusCheckInterval`: integer, not null, default 300 (seconds)
     - `createdAt`: text, not null, default to ISO timestamp
     - `updatedAt`: text, not null, default to ISO timestamp

  5. **settings** table:
     - `key`: text, primary key
     - `value`: text, not null
     - `updatedAt`: text, not null, default to ISO timestamp

  Use `$defaultFn(() => crypto.randomUUID())` for UUID defaults and `$defaultFn(() => new Date().toISOString())` for timestamp defaults.

  Define Drizzle `relations` for boards -> widgets and widgets -> widgetConfigs so relational queries work.

  Export all tables and relations. Also export TypeScript types using Drizzle's `$inferSelect` and `$inferInsert` for each table (e.g., `export type Board = typeof boards.$inferSelect`, `export type NewBoard = typeof boards.$inferInsert`).

  **lib/db/index.ts:**
  Create a database connection singleton:
  - Import `drizzle` from `drizzle-orm/better-sqlite3`
  - Import `Database` from `better-sqlite3`
  - Import all schema from `./schema`
  - Import `existsSync`, `mkdirSync` from `node:fs` and `dirname` from `node:path`
  - Define `DB_PATH` as `./data/homelabarr.db`
  - Before creating the connection, ensure the `data/` directory exists (use mkdirSync with recursive: true if it doesn't)
  - Create the better-sqlite3 Database instance
  - Enable WAL mode for better concurrent read performance: `sqlite.pragma("journal_mode = WAL")`
  - Create the drizzle instance with the schema passed in: `drizzle(sqlite, { schema })`
  - Export the drizzle instance as `db`
  - Export the schema types for convenience

  Use a module-level singleton pattern (the module cache ensures only one instance). No need for globalThis tricks since this runs on the server only.
  </action>
  <verify>
  - Run `npx tsc --noEmit` to verify no TypeScript errors in schema.ts and index.ts
  - Run `npm run db:generate` to verify Drizzle can read the schema and generate migration SQL
  - Confirm the drizzle/ directory was created with migration files
  - Confirm lib/db/schema.ts exports boards, widgets, widgetConfigs, apps, settings tables
  - Confirm lib/db/schema.ts exports Board, NewBoard, Widget, NewWidget, etc. types
  - Confirm lib/db/index.ts exports `db`
  </verify>
  <done>
  - lib/db/schema.ts defines all five tables with correct columns, defaults, and foreign keys
  - lib/db/schema.ts exports Drizzle relations for relational queries
  - lib/db/schema.ts exports TypeScript select/insert types for each table
  - lib/db/index.ts creates a singleton database connection with WAL mode enabled
  - lib/db/index.ts auto-creates the data/ directory if it doesn't exist
  - `npm run db:generate` successfully produces migration SQL in the drizzle/ directory
  - TypeScript compiles without errors
  </done>
</task>

<task type="auto">
  <name>Task 3: Run migrations and seed a default board</name>
  <files>
    lib/db/seed.ts
  </files>
  <action>
  Create a seed script that initializes the database with required default data.

  **lib/db/seed.ts:**
  - Import `db` from `./index`
  - Import `boards, settings` from `./schema`
  - Import `sql` from `drizzle-orm`

  The seed script should:
  1. Insert a default board named "Default Board" with position 0, but only if no boards exist yet (use an INSERT ... WHERE NOT EXISTS pattern, or check with a select first). This ensures the seed is idempotent -- safe to run multiple times.
  2. Insert a default setting with key "defaultBoardId" and value set to the default board's ID, only if the setting doesn't exist yet.

  Make the script executable: export a `seed()` async function AND make it runnable directly with `npx tsx lib/db/seed.ts` (check if the file is being run directly using a standard ESM/CJS check, and call seed() if so).

  Add an npm script: `"db:seed": "npx tsx lib/db/seed.ts"`

  Also add a convenience script that does everything: `"db:setup": "npm run db:generate && npm run db:migrate && npm run db:seed"`

  **Important integration point:** The db connection in lib/db/index.ts needs the migrations to have been applied before any queries work. For development, the executor should run `npm run db:migrate` after generating migrations, then `npm run db:seed`. Verify the full flow works end-to-end.
  </action>
  <verify>
  - Run `npm run db:migrate` and confirm it applies migrations without errors
  - Run `npm run db:seed` (or `npx tsx lib/db/seed.ts`) and confirm it creates the default board
  - Run `npm run db:seed` a second time and confirm it's idempotent (no duplicate boards)
  - Run `npx tsc --noEmit` to verify no TypeScript errors
  - Confirm the data/homelabarr.db file exists after running
  - Confirm package.json has db:seed and db:setup scripts
  </verify>
  <done>
  - lib/db/seed.ts exists and exports a seed() function
  - Running `npm run db:seed` creates a default board and defaultBoardId setting
  - The seed is idempotent -- running it twice produces no duplicates
  - `npm run db:setup` runs the full generate -> migrate -> seed pipeline
  - The database file exists at data/homelabarr.db with all tables created
  - TypeScript compiles without errors
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with no errors
2. `npm run db:setup` completes successfully (generate + migrate + seed)
3. The SQLite database at data/homelabarr.db contains tables: boards, widgets, widget_configs, apps, settings
4. The boards table contains one row: "Default Board" at position 0
5. The settings table contains one row: key="defaultBoardId" with the default board's ID as value
6. `npm run db:seed` is idempotent -- running twice produces no duplicate data
7. The drizzle/ directory contains generated migration SQL files
8. WAL mode is enabled on the database (can verify with: `sqlite3 data/homelabarr.db "PRAGMA journal_mode;"` returning "wal")
</verification>

<success_criteria>
- Drizzle ORM is fully configured with SQLite and better-sqlite3
- Five tables exist: boards, widgets, widget_configs, apps, settings
- Schema supports all data needed through Phase 10 (positions, sizes, configs, apps, settings)
- Migrations are generated and applied cleanly
- A default board is seeded so the dashboard has content on first load
- The database connection is a reliable singleton with WAL mode
- All TypeScript types are exported for use by API routes in Plan 02
</success_criteria>

<output>
After completion, create `.planning/phases/02-database-configuration-layer/02-01-SUMMARY.md`
</output>
