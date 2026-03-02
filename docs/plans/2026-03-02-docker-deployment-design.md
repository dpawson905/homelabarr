# Docker Deployment Design

**Date:** 2026-03-02
**Status:** Approved

## Context

Homelabarr is a Next.js 16 homelab dashboard with:
- SQLite database via `better-sqlite3` (native binary)
- AES-256-GCM encrypted secrets stored in `./data/`
- Docker widget using `/var/run/docker.sock`
- System stats widget using `systeminformation`

## Goals

- Install via Docker (Portainer stack or `docker compose up`)
- Data persists across restarts/upgrades via host volume mount
- Build from source (no registry)

## Approach: Multi-stage build (Option B)

Both stages use `node:20-alpine` to ensure the `better-sqlite3` native binary compiled in the builder matches the runner architecture.

### Stage 1: builder

1. Copy `package.json` + `package-lock.json`, run `npm ci` (compiles native `better-sqlite3` binding)
2. Copy source files
3. Run `npm run build` (Next.js standalone output)

### Stage 2: runner

Copies from builder:
- `.next/standalone` — minimal Node.js server
- `.next/static` — static assets (must be placed at `.next/standalone/.next/static`)
- `public/` — public assets
- `drizzle/` — migration SQL files (needed at runtime for auto-migrate on boot)
- Native `better-sqlite3` binding from `node_modules`

Runs as non-root user `nextjs` (uid 1001).

An `entrypoint.sh` script runs `drizzle-kit migrate` then execs `node server.js`.

## Files

| File | Action |
|---|---|
| `Dockerfile` | Create — multi-stage build |
| `docker-compose.yml` | Create — Portainer-friendly stack |
| `.dockerignore` | Create — exclude node_modules, data, .git |
| `entrypoint.sh` | Create — migrate + start |
| `next.config.ts` | Modify — add `output: "standalone"` |

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `NODE_ENV` | `production` | Next.js mode |
| `PORT` | `3000` | App listen port |
| `ENCRYPTION_SECRET` | _(auto-generated)_ | Encryption key for secrets. If omitted, a key is auto-generated and saved to the volume. Set this explicitly if you want portable/reproducible encryption across rebuilds. |

## Volumes

| Host path | Container path | Purpose |
|---|---|---|
| `./data` | `/app/data` | SQLite DB + encryption key |
| `/var/run/docker.sock` | `/var/run/docker.sock` | Docker widget host access |

## Out of Scope

- Remote Docker host support (future)
- CI/CD pipeline + image registry (future)
- `--pid=host` for host-level system stats (revisit if container-scoped stats are insufficient)
