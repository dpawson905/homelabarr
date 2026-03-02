# Docker Deployment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Package Homelabarr as a Docker image deployable via Portainer or `docker compose up`, with persistent SQLite data on a host volume mount.

**Architecture:** Multi-stage build using `node:20-alpine` for both builder and runner stages (same base ensures `better-sqlite3` native binary compatibility). Next.js `output: "standalone"` produces a minimal server bundle. An entrypoint script runs DB migrations then starts the app.

**Tech Stack:** Docker, Node.js 20 Alpine, Next.js standalone output, better-sqlite3 (native binary), drizzle-kit migrate, docker-compose v2

---

### Task 1: Enable Next.js standalone output

**Files:**
- Modify: `next.config.ts`

**Step 1: Add `output: "standalone"` to next config**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["dockerode", "systeminformation"],
};

export default nextConfig;
```

**Step 2: Verify the build produces standalone output**

```bash
npm run build
ls .next/standalone
```

Expected: you see `server.js`, `node_modules/`, `package.json` inside `.next/standalone/`

**Step 3: Commit**

```bash
git add next.config.ts
git commit -m "feat(docker): enable Next.js standalone output"
```

---

### Task 2: Create .dockerignore

**Files:**
- Create: `.dockerignore`

**Step 1: Create the file**

```
node_modules
.next
data
.git
.gitignore
*.md
docs
npm-debug.log*
.env*
```

Key exclusions:
- `node_modules` — rebuilt inside container
- `.next` — rebuilt inside container
- `data/` — never bake the DB or encryption key into the image

**Step 2: Commit**

```bash
git add .dockerignore
git commit -m "feat(docker): add .dockerignore"
```

---

### Task 3: Create entrypoint script

**Files:**
- Create: `entrypoint.sh`

**Step 1: Create the script**

```bash
#!/bin/sh
set -e

echo "Running database migrations..."
npx drizzle-kit migrate

echo "Seeding database (no-op if already seeded)..."
node -e "
const { db } = require('./lib/db/index');
" 2>/dev/null || true

echo "Starting Homelabarr..."
exec node server.js
```

Wait — in the standalone output there's no `lib/db/index` resolvable from the server root. The seed script uses `tsx` and path aliases. Instead, run migration only (seed is handled by the app on first request if needed, or we call the compiled seed differently).

**Step 1 (revised): Create the entrypoint**

```bash
#!/bin/sh
set -e

echo "Running database migrations..."
cd /app
npx drizzle-kit migrate --config=drizzle.config.ts

echo "Starting Homelabarr..."
exec node .next/standalone/server.js
```

Actually `drizzle-kit` needs the config file and TypeScript support. Use the simpler approach: run migrations via a small JS script that applies the SQL files directly.

**Step 1 (final): Create entrypoint.sh**

```bash
#!/bin/sh
set -e

echo "[homelabarr] Running database migrations..."
node /app/migrate.js

echo "[homelabarr] Starting server..."
exec node /app/server.js
```

**Step 2: Create migrate.js (a standalone Node script that applies drizzle migrations)**

`migrate.js` runs the SQL migration files using better-sqlite3 directly — no TypeScript, no path aliases needed:

```js
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

  db.transaction(() => {
    for (const stmt of statements) {
      db.exec(stmt);
    }
    db.prepare("INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)").run(hash, Date.now());
  })();

  console.log(`[migrate] Applied: ${hash}`);
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
```

**Step 3: Make entrypoint.sh executable and commit**

```bash
chmod +x entrypoint.sh
git add entrypoint.sh migrate.js
git commit -m "feat(docker): add entrypoint and migrate scripts"
```

---

### Task 4: Create the Dockerfile

**Files:**
- Create: `Dockerfile`

**Step 1: Create Dockerfile**

```dockerfile
# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy Next.js standalone server
COPY --from=builder /app/.next/standalone ./
# Copy static assets into the right place for the standalone server
COPY --from=builder /app/.next/static ./.next/static
# Copy public folder
COPY --from=builder /app/public ./public
# Copy drizzle migrations (needed by migrate.js at runtime)
COPY --from=builder /app/drizzle ./drizzle
# Copy migration + entrypoint scripts
COPY --from=builder /app/migrate.js ./migrate.js
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh

# better-sqlite3 native binding: the standalone bundler doesn't copy .node files,
# so we copy the whole better-sqlite3 package from the builder's node_modules.
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/bindings ./node_modules/bindings
COPY --from=builder /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
```

**Step 2: Commit**

```bash
git add Dockerfile
git commit -m "feat(docker): add multi-stage Dockerfile"
```

---

### Task 5: Create docker-compose.yml

**Files:**
- Create: `docker-compose.yml`

**Step 1: Create the file**

```yaml
services:
  homelabarr:
    build: .
    container_name: homelabarr
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - NODE_ENV=production
      - PORT=3000
      # Uncomment and set to persist encryption key across rebuilds:
      # - ENCRYPTION_SECRET=change-me-to-a-long-random-string
```

**Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "feat(docker): add docker-compose.yml"
```

---

### Task 6: Build and verify

**Step 1: Build the image**

```bash
docker compose build
```

Expected: build completes with no errors. Watch for:
- `better-sqlite3` compiling the native binding in the builder stage (normal, takes ~30s)
- Final image tagged as `homelabarr-homelabarr`

**Step 2: Start the container**

```bash
docker compose up
```

Watch the logs for:
```
[homelabarr] Running database migrations...
[migrate] Applied: 0000_noisy_hairball
[migrate] Applied: 0001_cooing_sunfire
[migrate] Seeded default board: <uuid>
[migrate] Done.
[homelabarr] Starting server...
```

**Step 3: Verify the app is running**

Open `http://localhost:3000` — you should see the Homelabarr dashboard.

**Step 4: Verify data persists across restart**

```bash
docker compose down
docker compose up
```

Logs should show `[migrate] Done.` with no "Applied" lines (migrations already ran). The dashboard should retain any boards/widgets you created.

**Step 5: Commit if any fixes were needed, then tag**

```bash
git add -A
git commit -m "fix(docker): <describe any fixes>"
```

---

## Troubleshooting Reference

**`Error: Cannot find module '../build/Release/better_sqlite3.node'`**
The native binding wasn't copied. Check the `COPY --from=builder` lines for `better-sqlite3`, `bindings`, and `file-uri-to-path` in the Dockerfile.

**`Cannot connect to Docker daemon`**
The Docker widget shows this when `/var/run/docker.sock` isn't mounted. Verify the volume in `docker-compose.yml`.

**Encryption key changes on rebuild**
Set `ENCRYPTION_SECRET` in `docker-compose.yml` to a fixed value. Without it, a new key is auto-generated each time the `data/` directory is empty.

**Migrations fail with `table already exists`**
The `__drizzle_migrations` tracking table prevents re-running migrations. If you see this, the tracking table is out of sync — run `docker compose down`, delete `./data/homelabarr.db`, and restart.
