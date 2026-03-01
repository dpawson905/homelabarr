---
phase: 04
plan: 02
completed: 2026-02-28
key_files:
  created:
    - lib/health-check.ts
    - app/api/apps/health/route.ts
    - app/api/apps/[id]/health/route.ts
  modified: []
decisions:
  - HEAD request tried first as lightweight probe; falls back to GET if HEAD fails or returns non-2xx
  - AbortController used for fetch timeout (default 10 seconds)
  - In-memory Map cache keyed by app ID with configurable max-age from statusCheckInterval
  - Disabled apps returned as { status: "disabled" } in bulk endpoint so clients know their state
  - Parallel Promise.all for bulk health checks (acceptable at homelab scale)
deviations:
  - Files were already committed in prior task (04-01 commit 2f97e8a) so no new commit was needed
---

# Phase 04 Plan 02: Health Check Infrastructure Summary

Server-side health check utility and API endpoints for monitoring app online/offline/degraded status with in-memory caching.

## Tasks Completed

| # | Task | Commit | Files | Status |
|---|------|--------|-------|--------|
| 1 | Build health check utility and API endpoints | 2f97e8a | lib/health-check.ts, app/api/apps/health/route.ts, app/api/apps/[id]/health/route.ts | complete |

## What Was Built

### lib/health-check.ts
- `HealthCheckResult` type with status (online/offline/degraded/disabled), latency, statusCode, checkedAt
- `checkAppHealth(url, timeout)` performs HEAD-then-GET with AbortController timeout
- In-memory cache (`getCachedHealth`, `setCachedHealth`) keyed by app ID with configurable max-age

### GET /api/apps/health
- Reads all apps via `getApps()` from lib/db/queries.ts
- Filters apps by statusCheckEnabled; disabled apps return `{ status: "disabled" }`
- For enabled apps: returns cached result if fresh, otherwise runs checkAppHealth in parallel
- Response: `{ statuses: { [appId]: HealthCheckResult | { status: "disabled" } } }`

### GET /api/apps/[id]/health
- Looks up single app by ID from database
- Returns 404 if not found, `{ status: "disabled" }` if status check off
- Returns cached or fresh HealthCheckResult for enabled apps

## Deviations From Plan

All three files were already created and committed in the prior 04-01 task (commit 2f97e8a). The implementation matches the plan exactly, so no additional commit was required. The files were verified to type-check cleanly (`npx tsc --noEmit` passes) and the project builds successfully (`npx next build` succeeds with both routes visible in the route table).

## Decisions Made

- HEAD-before-GET strategy: HEAD is lighter but some servers don't support it, so GET is used as fallback
- AbortController timeout defaults to 10 seconds, configurable per call
- Cache uses a simple Map (sufficient for single-process homelab deployment)
- Disabled apps included in bulk response so the client can distinguish "disabled" from "offline"
- Promise.all for parallel checks (safe at homelab scale with a handful of apps)

## Issues / Blockers

None. Pre-existing type errors in widget-grid.tsx and app-links-widget.tsx were present during tsc but resolved during the build (the WidgetPlaceholder reference was from stale build cache; the app-form-dialog module exists on disk and builds correctly).
