---
plan: 08-03
status: complete
---

## Summary

Built the Media Management widget that shows upcoming content (calendar) and download queue from Sonarr or Radarr. The API route proxies requests to either service using the shared service client infrastructure (X-Api-Key header auth, /api/v3 endpoints). Calendar items are fetched for the next 7 days and grouped by date in the UI. Queue items show download progress with color-coded status indicators and progress bars. The widget includes a setup form for initial configuration and a settings panel for reconfiguration, with 60-second polling for live updates.

## Files Created

- `app/api/widgets/media-management/types.ts` -- CalendarItem, QueueItem, and MediaManagementResponse interfaces
- `app/api/widgets/media-management/route.ts` -- GET handler that proxies Sonarr/Radarr calendar and queue APIs with response normalization
- `components/widgets/media-management-widget.tsx` -- Client widget component with calendar/queue tabs, setup form, settings panel, and polling

## Verification

- TypeScript compilation: pass
