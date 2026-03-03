---
phase: 10
plan: 01
completed: 2026-03-01
key_files:
  created:
    - lib/export/schema.ts
    - lib/export/export.ts
    - lib/export/import.ts
    - app/api/config/export/route.ts
    - app/api/config/import/route.ts
  modified: []
decisions:
  - Export format version 1 with nested boards->widgets structure
  - Replace mode preserves passwordHash, merge mode skips duplicate apps by name+url
deviations: []
---

# Phase 10 Plan 01: Export/Import API Summary

Versioned JSON export/import engine with merge and replace modes, transactional import, and API endpoints for download/upload of dashboard configurations.

## Tasks Completed

| # | Task | Commit | Files | Status |
|---|------|--------|-------|--------|
| 1 | Define export schema types and build export logic | 8c73177 | schema.ts, export.ts | complete |
| 2 | Build import logic and API endpoints | 5063b9e | import.ts, export/route.ts, import/route.ts | complete |

## What Was Built

- `schema.ts`: HomelabarrExport type with version, boards (nested widgets+configs), apps, settings. EXCLUDED_SETTINGS_KEYS constant.
- `export.ts`: buildExport() queries all boards/widgets/apps/settings, excludes security-sensitive data (sessions, secrets, passwordHash, defaultBoardId)
- `import.ts`: importConfig() with replace mode (transactional delete-all + insert) and merge mode (additive insert, skip duplicate apps). ImportValidationError for structured error handling.
- Export route: GET returns JSON with Content-Disposition for file download
- Import route: POST accepts {config, mode}, returns ImportResult with counts

## Deviations From Plan

None

## Decisions Made

- Export format version 1, no internal IDs (regenerated on import)
- Replace mode preserves passwordHash, sets defaultBoardId to first imported board
- Merge mode skips apps with same name+url, only inserts missing settings keys

## Issues / Blockers

None
