# Roadmap: Homelabarr

## Overview

Build a polished, fully customizable homelab dashboard from the ground up. Start with a beautiful UI shell and design system, then layer on persistence, drag-and-drop grid editing, and app bookmarks with status monitoring. Add authentication and secrets management, then build out utility widgets, system/Docker monitoring, and deep service integrations across media, infrastructure, and smart home. Finish with configuration export/import and a comprehensive icon library.

## Phases

- [x] **Phase 1: Dashboard Shell & Design System** — Beautiful, responsive app shell with sidebar, dark mode, and polished theme
- [x] **Phase 2: Database & Configuration Layer** — SQLite persistence for dashboard state, widget layouts, and settings
- [x] **Phase 3: Drag-and-Drop Widget Grid** — Visual grid editor for placing, resizing, and rearranging widgets
- [x] **Phase 4: App Bookmarks & Status Monitoring** — Link cards with icons and health checks for self-hosted services
- [x] **Phase 5: Authentication & Secrets** — Password login and encrypted credential storage
- [x] **Phase 6: Utility Widgets** — Clock, weather, calendar, notes, RSS, and other standalone widgets
- [ ] **Phase 7: System & Docker Widgets** — System resource monitoring and Docker container management
- [ ] **Phase 8: Media & Download Integrations** — Integrations with media servers, managers, and download clients
- [ ] **Phase 9: Infrastructure Integrations** — DNS, proxy, virtualization, smart home, and monitoring integrations
- [ ] **Phase 10: Polish & Export** — Configuration export/import, icon library, and final polish

## Phase Details

### Phase 1: Dashboard Shell & Design System
**Goal**: A visually polished, responsive dashboard shell that establishes the look and feel of the entire application
**Depends on**: Nothing (first phase)
**Requirements**:
- Responsive layout — works on desktop, tablet, and mobile
- Dark mode support with custom teal/cyan oklch color theme (already defined)
- Sidebar navigation
**Success Criteria** (what must be TRUE when this phase completes):
  1. User sees a polished dashboard layout with sidebar navigation that collapses on mobile
  2. User can toggle between dark and light mode, and the theme uses the existing oklch teal/cyan color palette
  3. The layout looks native on desktop (1080p+), tablet, and mobile viewports
  4. The sidebar shows navigation items for boards and settings
  5. The design system (typography, spacing, components) is consistent and reusable

### Phase 2: Database & Configuration Layer
**Goal**: Persistent storage for all dashboard configuration, widget layouts, and settings using SQLite
**Depends on**: Phase 1
**Requirements**:
- SQLite database for persisting dashboard config, widget layouts, and credentials
- API for widget data (Next.js API routes / Server Actions)
**Success Criteria** (what must be TRUE when this phase completes):
  1. Dashboard configuration survives server restarts — layouts, settings, and widget configs persist
  2. API routes exist for CRUD operations on boards, widgets, and settings
  3. Database schema supports boards, widget positions/sizes, widget configurations, and app entries
  4. Schema migrations are handled cleanly for future changes

### Phase 3: Drag-and-Drop Widget Grid
**Goal**: A visual grid editor where users can place, resize, and rearrange widgets with no code or config files
**Depends on**: Phase 2
**Requirements**:
- Drag-and-drop widget grid with visual editor (no YAML/JSON config)
- Multi-board support — separate dashboards for different purposes
**Success Criteria** (what must be TRUE when this phase completes):
  1. User can drag widgets onto a grid and they snap to a grid layout
  2. User can resize widgets by dragging their edges/corners
  3. User can reorder widgets by dragging them to new positions
  4. User can create, rename, and delete multiple boards
  5. Widget positions and sizes persist across page reloads

### Phase 4: App Bookmarks & Status Monitoring
**Goal**: The first real widgets — app link cards with icons, live health checks, and a search bar to find them
**Depends on**: Phase 3
**Requirements**:
- App bookmark/link cards with customizable icons (10K+ icon library like Homarr)
- Health/status monitoring for linked applications (ping, HTTP checks)
- Search bar widget
**Success Criteria** (what must be TRUE when this phase completes):
  1. User can add an app with a name, URL, and icon to their dashboard
  2. Each app card shows a live green/red/yellow status indicator based on HTTP health checks
  3. Health checks run on a configurable interval and update in real-time
  4. User can search across all apps from a search bar widget and click to navigate

### Phase 5: Authentication & Secrets
**Goal**: Protect the dashboard with a password and securely store API keys for service integrations
**Depends on**: Phase 4
**Requirements**:
- Simple password-based authentication (single user)
- Secrets manager — encrypted API keys at rest, injected at runtime
- Session management
**Success Criteria** (what must be TRUE when this phase completes):
  1. Dashboard requires a password to access — unauthenticated users see a login page
  2. User can set and change their password from a settings page
  3. API keys and secrets are encrypted at rest in SQLite, never stored in plaintext
  4. Sessions persist across browser restarts (remember me)
  5. User can add, view (masked), edit, and delete stored secrets

### Phase 6: Utility Widgets
**Goal**: A suite of standalone utility widgets that make the dashboard useful beyond just app links
**Depends on**: Phase 3
**Requirements**:
- Clock and weather widgets
- Calendar/agenda widget
- Notes/bookmarks widget
- RSS feed widget
**Success Criteria** (what must be TRUE when this phase completes):
  1. Clock widget displays current time with configurable timezone and format
  2. Weather widget shows current conditions and forecast for a configured location
  3. Calendar widget displays upcoming events (manual entry or iCal feed)
  4. Notes widget allows creating and editing markdown notes inline
  5. RSS widget fetches and displays entries from configured RSS/Atom feeds

### Phase 7: System & Docker Widgets
**Goal**: Real-time system resource monitoring and Docker container management from the dashboard
**Depends on**: Phase 5 (needs secrets for Docker API access)
**Requirements**:
- System resource usage (CPU, RAM, disk, network)
- Docker container overview and management
**Success Criteria** (what must be TRUE when this phase completes):
  1. System stats widget shows real-time CPU, RAM, disk usage, and network throughput
  2. Docker widget lists running containers with status, resource usage, and uptime
  3. User can start, stop, and restart Docker containers from the dashboard
  4. Stats update in real-time without requiring page refresh

### Phase 8: Media & Download Integrations
**Goal**: Deep integrations with media servers, media managers, request tools, and download clients
**Depends on**: Phase 5 (needs secrets manager for API keys)
**Requirements**:
- Media: Plex, Jellyfin, Emby
- Media management: Sonarr, Radarr, Lidarr, Readarr, Bazarr
- Requests: Overseerr, Jellyseerr
- Downloads: qBittorrent, Transmission, SABnzbd, NZBGet
- Media widgets (recently added, now playing, request queue)
- Download queue widget (active transfers, progress)
**Success Criteria** (what must be TRUE when this phase completes):
  1. User can configure API connections to their media stack services
  2. Media widget shows now-playing across Plex/Jellyfin/Emby
  3. Media management widget shows upcoming/missing content from Sonarr/Radarr/Lidarr
  4. Download widget shows active transfers with progress bars from configured download clients
  5. Request widget shows pending requests from Overseerr/Jellyseerr

### Phase 9: Infrastructure Integrations
**Goal**: Widgets for DNS, reverse proxy, virtualization, smart home, monitoring, and other self-hosted services
**Depends on**: Phase 5 (needs secrets manager for API keys)
**Requirements**:
- DNS/Ad-blocking: Pi-hole, AdGuard Home
- Reverse proxy: Nginx Proxy Manager, Traefik, Caddy
- Virtualization: Proxmox
- Containers: Docker, Portainer
- Smart home: Home Assistant
- Monitoring: Uptime Kuma, Grafana
- Other: Nextcloud, Gitea, Vaultwarden, Paperless-ngx
**Success Criteria** (what must be TRUE when this phase completes):
  1. DNS widget shows blocked queries, top clients, and filter stats from Pi-hole/AdGuard
  2. Proxmox widget shows VM/container status, resource usage across nodes
  3. Home Assistant widget displays entity states and allows basic control
  4. Uptime Kuma widget shows monitor status and uptime percentages
  5. Each integration follows the same configuration pattern established in Phase 8

### Phase 10: Polish & Export
**Goal**: Configuration portability with export/import and a comprehensive icon library for all services
**Depends on**: Phase 9
**Requirements**:
- Export/import dashboard configuration
- 10K+ icon library for service identification
**Success Criteria** (what must be TRUE when this phase completes):
  1. User can export their entire dashboard configuration as a single downloadable file
  2. User can import a configuration file to restore or migrate their dashboard
  3. Icon picker provides thousands of categorized, searchable icons for services and apps
  4. Imported configs gracefully handle missing integrations or changed service URLs

## Progress

| Phase | Status | Completed |
|-------|--------|-----------|
| 1. Dashboard Shell & Design System | Complete | 2026-02-28 |
| 2. Database & Configuration Layer | Complete | 2026-02-28 |
| 3. Drag-and-Drop Widget Grid | Complete | 2026-02-28 |
| 4. App Bookmarks & Status Monitoring | Complete | 2026-02-28 |
| 5. Authentication & Secrets | Complete | 2026-03-01 |
| 6. Utility Widgets | Complete | 2026-03-01 |
| 7. System & Docker Widgets | Not started | - |
| 8. Media & Download Integrations | Not started | - |
| 9. Infrastructure Integrations | Not started | - |
| 10. Polish & Export | Not started | - |

---
*Created: 2026-02-28*
