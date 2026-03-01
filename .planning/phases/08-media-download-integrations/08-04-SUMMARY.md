---
plan: 08-04
status: complete
---
## Summary
Built the Download Client widget supporting both qBittorrent and SABnzbd. The widget provides real-time monitoring of active downloads with status indicators, progress bars, speed readouts, and ETA estimates. qBittorrent integration uses cookie-based SID authentication while SABnzbd uses the shared `fetchService` helper with query-apikey auth. The widget includes a setup/settings panel for configuring connection details and an optional "show completed" toggle for SABnzbd history.

## Files Created
- `app/api/widgets/download-client/types.ts` - DownloadItem, DownloadSummary, and DownloadClientResponse type definitions
- `app/api/widgets/download-client/route.ts` - GET handler with qBittorrent (cookie auth + torrent list) and SABnzbd (queue + optional history) sub-handlers
- `components/widgets/download-client-widget.tsx` - Client component with setup panel, settings panel, loading/error/empty states, and download item rows with status dots, progress bars, and speed indicators

## Files Modified
- `components/widget-renderer.tsx` - Added DownloadClientWidget import and "download-client" case
- `components/add-widget-dialog.tsx` - Added "Download Client" to WIDGET_TYPES and default size (4x4)

## Verification
- TypeScript compilation: pass
