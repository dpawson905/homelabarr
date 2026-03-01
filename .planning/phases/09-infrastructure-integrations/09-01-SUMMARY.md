# 09-01 Summary: DNS Widget (Pi-hole / AdGuard Home) + Extended Auth Types

## What was done

### 1. Extended `ServiceAuthType` with 4 new auth patterns

**File:** `lib/services/types.ts`

Added to the union type:
- `"query-auth"` — appends `?auth=TOKEN` (Pi-hole API authentication)
- `"header-basic-auth"` — sets `Authorization: Basic base64(apiKey)` (AdGuard Home, apiKey is "user:pass")
- `"header-bearer"` — sets `Authorization: Bearer TOKEN` (Home Assistant, generic bearer)
- `"header-pve-token"` — sets `Authorization: PVEAPIToken=TOKEN` (Proxmox VE)

### 2. Added auth cases to `fetchService`

**File:** `lib/services/service-client.ts`

Added four new switch-case branches using `Buffer.from().toString("base64")` for the basic-auth encoding (Node.js compatible, no TypeScript issues with `btoa`).

### 3. Created DNS API types

**File:** `app/api/widgets/dns/types.ts`

- `DnsClient` — `{ name, queryCount }`
- `DnsStats` — `{ totalQueries, blockedQueries, blockPercentage, domainsBlocked, topClients }`
- `DnsResponse` — `{ stats, serviceType, protectionEnabled }`

### 4. Created DNS API route

**File:** `app/api/widgets/dns/route.ts`

GET handler with:
- Widget ID validation via `getWidgetWithConfig`
- Service connection via `getServiceConnection`
- **Pi-hole path:** fetches `/admin/api.php?summaryRaw&auth=TOKEN` for stats and `/admin/api.php?getQuerySources&auth=TOKEN` for top clients. Parses `top_sources` keys (splits on `|` for hostname extraction). Maps `status` field to `protectionEnabled`.
- **AdGuard path:** fetches `/control/stats` and `/control/status` in parallel using `header-basic-auth`. Computes block percentage from `num_dns_queries` / `num_blocked_filtering`. Maps `protection_enabled` from status endpoint.
- Returns `DnsResponse` with `Cache-Control: no-store`.

### 5. Created DNS widget component

**File:** `components/widgets/dns-widget.tsx`

- Setup view: dropdown (Pi-hole / AdGuard Home), URL input, secret name input, save button (PATCH)
- Configured view:
  - Header with Shield01Icon + service name + gear icon
  - 2x2 stats grid: Total Queries, Blocked, Block Rate %, and either Domains Blocked (Pi-hole) or Protection status indicator (AdGuard)
  - Top Clients list (up to 5 entries) with name + query count
  - Protection enabled/disabled indicator for Pi-hole at the bottom
  - 30-second polling interval
- Error view with settings shortcut
- Loading skeletons matching layout

### 6. Registered widget

- **`components/widget-renderer.tsx`** — Added import and `case "dns"` dispatch
- **`components/add-widget-dialog.tsx`** — Added to `WIDGET_TYPES` array and `WIDGET_DEFAULT_SIZES` (3x4)

## Verification

`npx tsc --noEmit` passes with zero errors.

## Files changed

| File | Action |
|------|--------|
| `lib/services/types.ts` | Modified — 4 new auth types |
| `lib/services/service-client.ts` | Modified — 4 new switch cases |
| `app/api/widgets/dns/types.ts` | Created |
| `app/api/widgets/dns/route.ts` | Created |
| `components/widgets/dns-widget.tsx` | Created |
| `components/widget-renderer.tsx` | Modified — DNS import + case |
| `components/add-widget-dialog.tsx` | Modified — DNS entry + default size |
