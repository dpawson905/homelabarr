# Homelabarr

## What This Is

A self-hosted homelab dashboard inspired by Homarr, built from scratch for full customization control. Provides a polished, drag-and-drop widget grid to monitor and manage self-hosted services (media, infrastructure, smart home, networking) from a single responsive interface. Built for a single homelab operator who wants a beautiful, functional command center.

## Core Value

A visually polished, fully customizable dashboard that looks and feels better than Homarr, with the same depth of service integrations and drag-and-drop widget management.

## Requirements

### Validated

(None yet — ship to validate)

### Active

#### UI & Layout
- [ ] Drag-and-drop widget grid with visual editor (no YAML/JSON config)
- [ ] Responsive layout — works on desktop, tablet, and mobile
- [ ] Dark mode support with custom teal/cyan oklch color theme (already defined)
- [ ] Sidebar navigation
- [ ] Multi-board support — separate dashboards for different purposes

#### Widgets
- [ ] App bookmark/link cards with customizable icons (10K+ icon library like Homarr)
- [ ] Health/status monitoring for linked applications (ping, HTTP checks)
- [ ] Clock and weather widgets
- [ ] System resource usage (CPU, RAM, disk, network)
- [ ] Docker container overview and management
- [ ] Media widgets (recently added, now playing, request queue)
- [ ] Download queue widget (active transfers, progress)
- [ ] Calendar/agenda widget
- [ ] Notes/bookmarks widget
- [ ] RSS feed widget
- [ ] Search bar widget

#### Service Integrations (30+ like Homarr)
- [ ] Media: Plex, Jellyfin, Emby
- [ ] Media management: Sonarr, Radarr, Lidarr, Readarr, Bazarr
- [ ] Requests: Overseerr, Jellyseerr
- [ ] Downloads: qBittorrent, Transmission, SABnzbd, NZBGet
- [ ] DNS/Ad-blocking: Pi-hole, AdGuard Home
- [ ] Reverse proxy: Nginx Proxy Manager, Traefik, Caddy
- [ ] Virtualization: Proxmox
- [ ] Containers: Docker, Portainer
- [ ] Smart home: Home Assistant
- [ ] Monitoring: Uptime Kuma, Grafana
- [ ] Other: Nextcloud, Gitea, Vaultwarden, Paperless-ngx

#### Authentication & Security
- [ ] Simple password-based authentication (single user)
- [ ] Secrets manager — encrypted API keys at rest, injected at runtime
- [ ] Session management

#### Data & Configuration
- [ ] SQLite database for persisting dashboard config, widget layouts, and credentials
- [ ] Export/import dashboard configuration
- [ ] API for widget data (Next.js API routes / Server Actions)

### Out of Scope

- Multi-user with roles/permissions — single user for now, can add later
- LDAP/OAuth/SSO integration — overkill for single-user setup
- Mobile native app — responsive web is sufficient
- Kubernetes support — Docker-focused homelab
- i18n/localization — English only

## Context

- **Inspiration**: Homarr (homarr.dev) — a mature homelab dashboard with 30+ integrations, drag-and-drop grid, and multi-user support. Building a custom alternative for full control over design and features.
- **Existing setup**: Next.js 16, React 19, Tailwind CSS v4, shadcn/ui with Radix primitives, recharts for charts, react-resizable-panels, JetBrains Mono font, custom oklch color palette with teal/cyan primary hues and full dark mode.
- **Target environment**: Mixed homelab with media stack, infrastructure/networking tools, and smart home services.
- **UI philosophy**: Polish and aesthetics first. The dashboard should look beautiful before it becomes feature-complete.

## Constraints

- **Tech stack**: Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui + SQLite — already initialized, must build on this foundation
- **Styling**: Must use the existing oklch color variables defined in globals.css — no new color systems
- **Database**: SQLite only — no external database dependencies, keeps deployment simple
- **Deployment**: Local development with `next dev` initially, Docker later
- **Icons**: Need a large icon set for service/app identification (Homarr uses 10K+ built-in icons)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js 16 + React 19 | Already initialized, latest framework version | — Pending |
| SQLite for persistence | Simple, no external deps, file-based, easy backup | — Pending |
| shadcn/ui + Radix | Already installed, accessible components, highly customizable | — Pending |
| Single-user auth first | Simpler scope, matches typical homelab use | — Pending |
| UI polish before features | User priority — dashboard must look great from the start | — Pending |
| Full Homarr parity as goal | Long-term target: 30+ integrations, drag-and-drop grid, all widgets | — Pending |

## Preferences

execution-model: opus

---
*Last updated: 2026-02-28 after initialization*
