---
phase: 09
plan: 02
completed: 2026-03-01
key_files:
  created:
    - app/api/widgets/proxmox/types.ts
    - app/api/widgets/proxmox/route.ts
    - components/widgets/proxmox-widget.tsx
  modified: []
decisions:
  - Tabbed view (Nodes/Guests) for widget layout
  - Guests sorted by status: running first, then paused, then stopped
deviations: []
---

# Phase 09 Plan 02: Proxmox Widget Summary

Proxmox VE widget showing node status with CPU/memory progress bars, VM/container inventory with type badges and resource usage, using header-pve-token auth to proxy Proxmox API.

## Tasks Completed

| # | Task | Commit | Files | Status |
|---|------|--------|-------|--------|
| 1 | Create Proxmox types and API route | f735e1b | types.ts, route.ts | complete |
| 2 | Build Proxmox widget component | 34ccfd3 | proxmox-widget.tsx | complete |

## What Was Built

- `types.ts`: ProxmoxNode, ProxmoxGuest, ProxmoxSummary, ProxmoxResponse normalized types
- `route.ts`: GET handler fetching /api2/json/nodes then /api2/json/nodes/{node}/qemu and /lxc per online node in parallel; maps raw Proxmox data (cpu 0-1 float to percentage, mem/maxmem ratio); computes summary counts; Cache-Control: no-store
- `proxmox-widget.tsx`: "use client" widget with settings panel (serviceUrl + secretName), tabbed Nodes/Guests view, CPU/memory progress bars color-coded by usage level, uptime formatting, type badges (VM/CT), status dots, 30s polling, skeleton loading

## Deviations From Plan

None

## Decisions Made

- Used tabbed view with "Nodes" and "Guests" tabs rather than a single combined list
- Extracted UsageBar, LoadingSkeleton, EmptyState sub-components during simplification

## Issues / Blockers

None
