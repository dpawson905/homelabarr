---
plan: 08-05
status: complete
---
## Summary
Built the Media Requests widget for Overseerr/Jellyseerr integration. The widget provides a setup flow for configuring the service connection (URL, API key secret, service type), then displays media requests with filter tabs (All/Pending/Approved/Available), color-coded status badges, status count summary pills, and 60-second polling. The API route fetches requests and counts in parallel from the Overseerr/Jellyseerr API using the shared service client infrastructure.

## Files Created
- `app/api/widgets/media-requests/types.ts` — MediaRequest, RequestCounts, and MediaRequestsResponse type definitions
- `app/api/widgets/media-requests/route.ts` — GET handler that loads widget config, resolves API key via getServiceConnection, fetches requests and counts in parallel from Overseerr/Jellyseerr API, maps status integers to named statuses
- `components/widgets/media-requests-widget.tsx` — Client component with setup state (service type dropdown, URL, secret name), configured state (header with pending badge, filter tabs, status count pills, request list with media type icons, title/year, requester/time, status badges), settings panel, and 60s polling

## Files Modified
- `components/widget-renderer.tsx` — Added import and case for "media-requests" widget type

## Verification
- TypeScript compilation: pass
