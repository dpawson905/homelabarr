# System Dashboard Banner

## Summary
Persistent full-width system dashboard banner rendered above the widget grid on every board. Shows key system metrics at a glance — CPU, RAM, processor info, network, filesystems, uptime, hostname.

## Approach
Approach A: Persistent banner above grid (not a widget). Always visible by default. Polls system stats API every 5 seconds.

## Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ [CPU Gauge] [RAM Gauge] │ Hostname        │ Network ▲/▼  │ Mounts  │
│   28.4%      31.2%      │ Intel i7-12700K │ Uptime: 14d  │ / ████  │
│   radial     radial     │ 12C / 20T       │              │ /m ██   │
└──────────────────────────────────────────────────────────────────────┘
```

- Left: CPU + RAM radial donut gauges (recharts PieChart), color-coded
- Center-left: Hostname, processor name, cores/threads
- Center-right: Network up/down speeds, system uptime
- Right: Filesystem horizontal bars per mount
- Responsive: stacks on small screens

## API Changes
Extend `/api/widgets/system-stats` response with:
- `hostname: string`
- `cpuModel: string`
- `cpuThreads: number`
- `uptime: number` (seconds)

## Files
1. `app/api/widgets/system-stats/route.ts` — extend response
2. `components/system-banner.tsx` — new component
3. `app/board/[id]/page.tsx` — render banner above widget grid

## Notes
- Existing system-stats widget remains available in the grid
- No toggle needed — always visible by default
