# Plan 07-02: Docker Widget - Summary

## Status: Complete

## Deliverables

### 1. Dependencies Installed
- `dockerode` (runtime) - Docker Engine API client for Node.js
- `@types/dockerode` (dev) - TypeScript type definitions

### 2. API Routes

**GET /api/widgets/docker** (`app/api/widgets/docker/route.ts`)
- Connects to Docker daemon via configurable socket path (default: `/var/run/docker.sock`)
- Lists containers with optional `all` param to include stopped containers
- Collects CPU and memory stats for running containers via `container.stats({ stream: false })`
- Returns 503 with `docker_unavailable` error if Docker daemon is unreachable
- Stats collection has a 5-second per-container timeout to prevent hanging
- Uses `Promise.allSettled` to handle individual stat collection failures gracefully
- CPU% calculated using standard Docker formula (cpuDelta / systemDelta * cpuCount * 100)
- Response includes `Cache-Control: no-store` header

**POST /api/widgets/docker/[id]** (`app/api/widgets/docker/[id]/route.ts`)
- Accepts `start`, `stop`, or `restart` actions for a container
- Validates action before execution (400 on invalid)
- Verifies container exists (404 if not found)
- Returns 409 on action conflicts (e.g., starting an already-running container)
- Follows Next.js 15+ async params pattern (`params: Promise<{ id: string }>`)

### 3. DockerWidget Component (`components/widgets/docker-widget.tsx`)

**Props:** `{ widgetId: string, config: Record<string, unknown> | null }`

**Config options:**
- `socketPath` (string, default: `/var/run/docker.sock`)
- `showStopped` (boolean, default: false)
- `refreshInterval` (number in seconds, default: 10)

**States implemented:**
- **Docker unavailable (503):** Centered icon, error message, socket path display, settings button
- **Loading:** 4 skeleton rows with status dot, name, and status placeholders
- **Empty:** Centered icon with "No containers found" message
- **Container list:** Scrollable rows with full container details

**Container row displays:**
- Status dot (green=running, red=exited, amber=paused, gray=other)
- Container name (truncated) + image (small muted text)
- Status text (e.g., "Up 3 hours") - hidden on small screens
- CPU% with tiny inline progress bar (running only, hidden on small screens)
- Memory usage (e.g., "256 MB / 4 GB", running only, hidden on small screens)
- Action buttons: Start (non-running), Stop (running), Restart (running)

**Settings panel:**
- Socket path input
- Show stopped toggle (Switch component)
- Refresh interval input (number)
- Save button that PATCHes widget config via `/api/widgets/${widgetId}`

**Polling:** useEffect + setInterval at configurable interval (default 10s)

### 4. TypeScript Compilation
- `npx tsc --noEmit` passes with zero errors

## Files Created
- `app/api/widgets/docker/route.ts`
- `app/api/widgets/docker/[id]/route.ts`
- `components/widgets/docker-widget.tsx`

## Files Modified
- `package.json` (dockerode dependency added)
- `package-lock.json` (lockfile updated)

## Notes
- Widget-renderer.tsx and add-widget-dialog.tsx were NOT modified (handled by Plan 03)
- Uses `ContainerTruckIcon` from hugeicons (closest container-related icon available)
- Uses `PlayIcon`, `StopIcon`, `RefreshIcon` for container action buttons
- Uses `Settings02Icon` for gear/settings toggle
- Toast notifications via sonner for action errors
- Responsive layout: CPU bar hidden below md, memory hidden below lg, status hidden below sm
