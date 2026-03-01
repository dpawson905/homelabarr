# 09-04: Uptime Kuma Widget

## Status: Complete

## Files Created
- `app/api/widgets/uptime-kuma/types.ts` — Type definitions (MonitorStatus, Monitor, UptimeKumaResponse)
- `app/api/widgets/uptime-kuma/route.ts` — API route with status-page and Prometheus metrics data sources
- `components/widgets/uptime-kuma-widget.tsx` — Widget component with setup, settings, and configured views

## Files Modified
- `components/widget-renderer.tsx` — Added `uptime-kuma` case to the widget dispatcher

## Design Decisions

### Public API Only
This widget uses Uptime Kuma's public REST endpoints (no authentication required):
- Status Page API: `GET {baseUrl}/api/status-page/{slug}`
- Heartbeat API: `GET {baseUrl}/api/status-page/heartbeat/{slug}`
- Prometheus Metrics: `GET {baseUrl}/metrics` (fallback data source)

Plain `fetch` is used directly -- no `fetchService` helper or secret management needed.

### Two Data Sources
1. **Status Page** (default): Fetches from the status page and heartbeat endpoints, combines monitor info with heartbeat data for status, uptime percentages, and response times.
2. **Prometheus Metrics**: Parses the `/metrics` endpoint for `monitor_status` and `monitor_response_time` lines. Uptime percentages are unavailable (shown as "N/A").

### Widget States
- **Setup**: URL input, data source selector, slug input (conditional), helper text, and connect button
- **Settings**: Full settings form accessible via gear icon
- **Configured**: Header with status page name and summary badge, colored summary pills (up/down/pending/maintenance), scrollable monitor list with status dots, response times, and uptime percentages

### Polling
60-second refresh interval using `setInterval`, consistent with the app-links health polling pattern.

## Verification
- `npx tsc --noEmit` passes with zero errors
