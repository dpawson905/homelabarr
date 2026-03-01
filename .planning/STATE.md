# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** A visually polished, fully customizable dashboard that looks and feels better than Homarr, with the same depth of service integrations and drag-and-drop widget management.
**Current focus:** Phase 7 — System & Docker Widgets

## Current Position

Phase: 7 of 10 (System & Docker Widgets)
Status: Ready to plan
Last activity: 2026-03-01 — Phase 6 executed successfully

## Preferences

execution-model: opus

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

- Used oklch relative color syntax for selection/scrollbar theming (auto-adapts to light/dark)
- Pulsing teal dot as sidebar brand accent (adapts to collapsed mode)
- Auto-fixed spinner.tsx type mismatch with HugeiconsIcon
- Drizzle ORM with better-sqlite3 (synchronous driver — no await on DB queries)
- Select-based Drizzle API (.select().from().all()/.get()) for sync driver compatibility
- SQLite WAL mode enabled for concurrent reads
- Transactional widget+config creation via db.transaction()
- Settings upsert via onConflictDoUpdate
- Server Components query DB directly (no API fetch for initial page loads)
- Board type from schema used for sidebar props (single source of truth)
- react-grid-layout v2 requires `react-grid-layout/legacy` import path for WidthProvider + Responsive
- Debounced layout persistence at 500ms using ref-based timeout
- Optimistic local state for immediate drag/resize feedback
- New widgets placed at y=Infinity for bottom placement by react-grid-layout
- Board routing at /board/[id] with root / redirecting to default board
- Server/client component split: BoardEmptyState and AddWidgetButton extracted as client components
- WidgetRenderer pattern: switch-based dispatcher routes widget type to correct component, fallback to WidgetPlaceholder
- Health checks use HEAD-then-GET fallback with AbortController timeout and in-memory cache
- Health status polling at 60s interval in AppLinksWidget, server cache respects per-app statusCheckInterval
- Status dots: green/pulse=online, red=offline, amber=degraded, gray=disabled
- cmdk Command components used inline (not modal) for search widget
- WIDGET_DEFAULT_SIZES lookup in add-widget-dialog.tsx for type-specific sizing
- Single-user auth: password hash stored in settings table (no users table needed)
- bcryptjs (pure JS) for password hashing, cost factor 12
- Session tokens: crypto.randomBytes(32).toString("hex"), stored in sessions table
- Session cookies: httpOnly, sameSite=lax, secure in production
- Remember me: 30-day sessions vs 24-hour default
- Middleware checks cookie presence only (edge runtime can't access SQLite); full validation server-side
- AES-256-GCM for secrets encryption with scrypt-derived key
- Encryption key: ENCRYPTION_SECRET env var or auto-generated ./data/.encryption-key file
- Settings page at /settings with password change + secrets manager
- Sonner Toaster added to root layout for app-wide toast notifications
- Widget config passed as props from WidgetRenderer to config-aware widgets (Clock, Notes, Weather, Calendar, RSS)
- ClockWidget: Intl.DateTimeFormat for timezone-aware time display, 1s interval, inline settings panel
- NotesWidget: debounced auto-save (500ms) via useRef timeout, save status indicator
- WeatherWidget: Open-Meteo API proxy at /api/widgets/weather, 10-min refresh, geolocation setup
- CalendarWidget: events stored in widgetConfigs JSON, agenda view with date grouping, inline add/edit form
- RssWidget: server-side feed parsing via rss-parser at /api/widgets/rss, multi-feed aggregation, 5-min API cache

### Blockers/Concerns

None yet.

---
*Last updated: 2026-03-01 — Phase 6 complete*
