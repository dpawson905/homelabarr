---
phase: 09
plan: 03
completed: 2026-03-01
key_files:
  created:
    - app/api/widgets/home-assistant/types.ts
    - app/api/widgets/home-assistant/route.ts
    - components/widgets/home-assistant-widget.tsx
  modified: []
decisions:
  - Entity IDs stored as JSON array in config
  - Uses homeassistant.toggle service for all toggleable domains
  - Domain-specific icons mapped for 11 HA domains
deviations: []
---

# Phase 09 Plan 03: Home Assistant Widget Summary

Home Assistant widget displaying entity states with domain icons, state coloring, relative timestamps, and toggle controls for lights/switches/fans using header-bearer auth and the homeassistant.toggle service.

## Tasks Completed

| # | Task | Commit | Files | Status |
|---|------|--------|-------|--------|
| 1 | Create Home Assistant types and API route | 7d58d2a | types.ts, route.ts | complete |
| 2 | Build Home Assistant widget component | da5b76e | home-assistant-widget.tsx | complete |

## What Was Built

- `types.ts`: EntityState, HomeAssistantResponse, ServiceCallRequest normalized types
- `route.ts`: GET handler fetching /api/states with header-bearer auth, filtering to configured entity IDs (or first 20 if none configured), mapping to EntityState with controllable flag; POST handler proxying service calls to /api/services/{domain}/{service} for toggle actions; Cache-Control: no-store
- `home-assistant-widget.tsx`: "use client" widget with settings panel (serviceUrl + secretName + entityIds textarea), entity list with domain-specific icons (11 domains mapped), state value coloring (on=green, off=muted, unavailable=red), relative time display, toggle buttons with optimistic UI and loading states, 15s polling, skeleton loading

## Deviations From Plan

None

## Decisions Made

- Entity IDs stored as JSON array in config (parsed from newline-separated textarea input)
- Uses homeassistant.toggle service (domain="homeassistant", service="toggle") for all toggleable domains
- Mapped 11 domain-specific icons: light, switch, fan, cover, lock, media_player, sensor, binary_sensor, camera, climate, automation

## Issues / Blockers

None
