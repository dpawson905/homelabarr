---
phase: 04
plan: 01
completed: 2026-02-28
key_files:
  created:
    - components/widget-renderer.tsx
    - components/widgets/app-links-widget.tsx
    - components/widgets/app-card.tsx
    - components/app-form-dialog.tsx
  modified:
    - components/widget-grid.tsx
decisions:
  - Used Input instead of Textarea for description field to keep the form compact
  - AppCard renders as anchor tag for native new-tab behavior with target="_blank"
  - Status dot rendered as gray placeholder (Plan 02 adds real health check coloring)
  - Used confirm() for delete confirmation to keep implementation simple
  - WidgetRenderer uses unused _widgetId and _config params with underscore prefix for future use
deviations: []
---

# Phase 04 Plan 01: App-Links Widget and App Form Summary

Replace the placeholder widget with a real app-links widget that displays app bookmark cards and supports CRUD operations via a form dialog.

## Tasks Completed

| # | Task | Commit | Files | Status |
|---|------|--------|-------|--------|
| 1 | Build WidgetRenderer dispatcher and AppLinksWidget | 2f97e8a | widget-renderer.tsx, app-links-widget.tsx, app-card.tsx, widget-grid.tsx | complete |
| 2 | Build Add/Edit App form dialog | a691ac9 | app-form-dialog.tsx | complete |

## What Was Built

**WidgetRenderer** (`components/widget-renderer.tsx`): A dispatcher component that maps widget types to their implementations. The "app-links" type renders AppLinksWidget; all other types fall back to the existing WidgetPlaceholder.

**AppLinksWidget** (`components/widgets/app-links-widget.tsx`): A client component that fetches apps from GET /api/apps, renders them in a responsive grid of AppCard components, shows a header with "Apps" title and add button, and displays a friendly empty state when no apps exist. Manages dialog state for add/edit operations and refreshes the app list after mutations.

**AppCard** (`components/widgets/app-card.tsx`): A presentational card component that opens the app URL in a new tab. Shows the app icon (emoji) or a letter avatar fallback, the app name, optional description, a gray status indicator dot (placeholder for health checks), and hover-revealed edit/delete action buttons.

**AppFormDialog** (`components/app-form-dialog.tsx`): A form dialog supporting both create (POST) and edit (PATCH) modes. Fields include name (required), URL (required, validated for http/https prefix), icon (optional emoji), description (optional), status check toggle (Switch), and check interval (shown conditionally). Follows the exact same patterns as board-dialogs.tsx.

**widget-grid.tsx**: Updated to import WidgetRenderer instead of WidgetPlaceholder, passing widget type, id, and config through.

## Deviations From Plan

None

## Decisions Made

- Used `Input` instead of `Textarea` for description to keep the form compact and consistent with other fields.
- AppCard is rendered as an `<a>` tag rather than a `<div>` with onClick for semantic correctness and native browser new-tab behavior.
- The status indicator dot is rendered as a static gray dot (`bg-muted-foreground/30`) as specified, awaiting Plan 02 for real health check coloring.
- Used `confirm()` for delete confirmation to keep the UX simple and avoid adding another dialog component.
- WidgetRenderer accepts `widgetId` and `config` props (prefixed with underscore) to support future widget types that will need configuration.

## Issues / Blockers

None
