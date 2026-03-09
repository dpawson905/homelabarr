"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import type { IconSvgElement } from "@hugeicons/react"
import {
  Link01Icon,
  Search01Icon,
  Clock01Icon,
  Sun01Icon,
  CpuIcon,
  Note01Icon,
  Calendar01Icon,
  RssIcon,
  Package01Icon,
  Tv01Icon,
  Film01Icon,
  Download01Icon,
  InboxIcon,
  WifiFullSignalIcon,
  DatabaseIcon,
  HomeWifiIcon,
  Activity01Icon,
  HardDriveIcon,
  CpuSettingsIcon,
  Activity05Icon,
  Image01Icon,
  RssLockedIcon,
  RouterIcon,
  PackageIcon,
  CloudServerIcon,
  FolderCloudIcon,
  UserMultipleIcon,
  GitBranchIcon,
  FirewallIcon,
  HddIcon,
  CctvCameraIcon,
  Settings01Icon,
  ServerStack01Icon,
  ChartLineData01Icon,
  Wifi01Icon,
} from "@hugeicons/core-free-icons"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface WidgetType {
  type: string
  name: string
  description: string
  icon: IconSvgElement
}

interface WidgetCategory {
  id: string
  label: string
  icon: IconSvgElement
  widgets: WidgetType[]
}

const WIDGET_CATEGORIES: WidgetCategory[] = [
  {
    id: "general",
    label: "General",
    icon: Settings01Icon,
    widgets: [
      { type: "app-links",  name: "App Links",  description: "Quick links to your apps",           icon: Link01Icon       },
      { type: "search",     name: "Search",      description: "Search across your apps",            icon: Search01Icon     },
      { type: "clock",      name: "Clock",       description: "Current time and date",              icon: Clock01Icon      },
      { type: "weather",    name: "Weather",     description: "Local weather conditions",           icon: Sun01Icon        },
      { type: "notes",      name: "Notes",       description: "Jot down quick notes",              icon: Note01Icon       },
      { type: "calendar",   name: "Calendar",    description: "Upcoming events and deadlines",     icon: Calendar01Icon   },
      { type: "rss-feed",   name: "RSS Feed",    description: "Follow your favorite feeds",        icon: RssIcon          },
    ],
  },
  {
    id: "system",
    label: "System",
    icon: CpuIcon,
    widgets: [
      { type: "system-stats", name: "System Stats", description: "CPU, RAM, disk & network",     icon: CpuIcon          },
      { type: "docker",       name: "Docker",        description: "Running containers",            icon: Package01Icon    },
      { type: "proxmox",      name: "Proxmox",       description: "VMs and containers",            icon: CpuSettingsIcon  },
      { type: "truenas",      name: "TrueNAS",       description: "ZFS pools and alerts",          icon: HardDriveIcon    },
      { type: "unraid",       name: "Unraid",        description: "Array, containers & VMs",       icon: DatabaseIcon     },
      { type: "scrutiny",     name: "Scrutiny",      description: "Drive SMART health",            icon: HddIcon          },
    ],
  },
  {
    id: "media",
    label: "Media",
    icon: Tv01Icon,
    widgets: [
      { type: "media-server",     name: "Media Server",     description: "Now playing & recently added",   icon: Tv01Icon      },
      { type: "media-management", name: "Media Management", description: "Sonarr/Radarr calendar & queue", icon: Film01Icon    },
      { type: "download-client",  name: "Download Client",  description: "Active downloads & stats",       icon: Download01Icon},
      { type: "media-requests",   name: "Media Requests",   description: "Overseerr/Jellyseerr requests",  icon: InboxIcon     },
      { type: "immich",           name: "Immich",           description: "Photo & video library",          icon: Image01Icon   },
    ],
  },
  {
    id: "network",
    label: "Network",
    icon: RouterIcon,
    widgets: [
      { type: "dns",          name: "DNS / Ad-Block",   description: "Pi-hole or AdGuard Home",         icon: WifiFullSignalIcon },
      { type: "nginx-proxy",  name: "Nginx Proxy Mgr",  description: "Proxy hosts & SSL certs",         icon: RouterIcon         },
      { type: "firewall",     name: "Firewall",         description: "OPNsense / pfSense status",       icon: FirewallIcon       },
      { type: "uptime-kuma",  name: "Uptime Kuma",      description: "Service monitor & uptime",        icon: Activity01Icon     },
      { type: "speedtest",    name: "Speedtest",        description: "Download, upload & ping",         icon: Activity05Icon     },
    ],
  },
  {
    id: "services",
    label: "Services",
    icon: CloudServerIcon,
    widgets: [
      { type: "portainer",      name: "Portainer",       description: "Multi-host Docker",              icon: PackageIcon       },
      { type: "paperless",      name: "Paperless-ngx",   description: "Document management",            icon: FolderCloudIcon   },
      { type: "nextcloud",      name: "Nextcloud",       description: "Cloud storage & users",          icon: CloudServerIcon   },
      { type: "authentik",      name: "Authentik",       description: "SSO & login activity",           icon: UserMultipleIcon  },
      { type: "gitea",          name: "Gitea / Forgejo", description: "Git repos & notifications",      icon: GitBranchIcon     },
      { type: "prowlarr",       name: "Prowlarr",        description: "Indexer status & stats",         icon: RssLockedIcon     },
      { type: "home-assistant", name: "Home Assistant",  description: "Smart home entity states",       icon: HomeWifiIcon      },
      { type: "frigate",        name: "Frigate",         description: "NVR cameras & detections",       icon: CctvCameraIcon    },
    ],
  },
  {
    id: "infrastructure",
    label: "Infrastructure",
    icon: ServerStack01Icon,
    widgets: [
      { type: "server-power", name: "Server Power",  description: "Control server power via webhooks", icon: ServerStack01Icon    },
      { type: "prometheus",   name: "Prometheus",     description: "Custom PromQL queries & charts",    icon: ChartLineData01Icon  },
      { type: "wake-on-lan",  name: "Wake-on-LAN",   description: "Wake devices with magic packets",   icon: Wifi01Icon           },
    ],
  },
]

const WIDGET_DEFAULT_SIZES: Record<string, { w: number; h: number }> = {
  search:             { w: 4, h: 2 },
  clock:              { w: 2, h: 2 },
  notes:              { w: 3, h: 3 },
  weather:            { w: 3, h: 3 },
  calendar:           { w: 3, h: 4 },
  "rss-feed":         { w: 4, h: 4 },
  "system-stats":     { w: 3, h: 3 },
  docker:             { w: 4, h: 4 },
  "download-client":  { w: 4, h: 3 },
  "media-server":     { w: 4, h: 4 },
  "media-management": { w: 4, h: 4 },
  "media-requests":   { w: 3, h: 4 },
  dns:                { w: 3, h: 3 },
  proxmox:            { w: 4, h: 4 },
  "home-assistant":   { w: 3, h: 4 },
  "uptime-kuma":      { w: 3, h: 4 },
  truenas:            { w: 4, h: 4 },
  unraid:             { w: 4, h: 4 },
  speedtest:          { w: 3, h: 2 },
  immich:             { w: 3, h: 3 },
  prowlarr:           { w: 3, h: 3 },
  "nginx-proxy":      { w: 3, h: 3 },
  portainer:          { w: 3, h: 3 },
  paperless:          { w: 3, h: 3 },
  nextcloud:          { w: 3, h: 3 },
  authentik:          { w: 3, h: 3 },
  gitea:              { w: 3, h: 3 },
  firewall:           { w: 3, h: 3 },
  scrutiny:           { w: 3, h: 3 },
  frigate:            { w: 3, h: 3 },
  "server-power":     { w: 3, h: 3 },
  prometheus:         { w: 4, h: 4 },
  "wake-on-lan":      { w: 3, h: 2 },
}

interface AddWidgetDialogProps {
  boardId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddWidgetDialog({ boardId, open, onOpenChange }: AddWidgetDialogProps): React.ReactElement {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState(WIDGET_CATEGORIES[0].id)

  const currentWidgets = WIDGET_CATEGORIES.find(c => c.id === activeCategory)?.widgets ?? []

  async function handleAddWidget(type: string) {
    setLoading(true)
    const { w, h } = WIDGET_DEFAULT_SIZES[type] ?? { w: 3, h: 2 }
    try {
      const response = await fetch("/api/widgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId, type, w, h }),
      })

      if (!response.ok) {
        console.warn("Failed to create widget:", await response.text())
        return
      }

      router.refresh()
      onOpenChange(false)
    } catch (error) {
      console.warn("Failed to create widget:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[70vh] max-h-[600px] w-[90vw] max-w-4xl sm:max-w-4xl flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle className="text-base">Add Widget</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Category sidebar */}
          <nav className="flex w-44 shrink-0 flex-col gap-0.5 border-r border-border p-3 overflow-y-auto">
            {WIDGET_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors",
                  activeCategory === cat.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <HugeiconsIcon
                  icon={cat.icon}
                  strokeWidth={activeCategory === cat.id ? 2 : 1.5}
                  className="size-4 shrink-0"
                />
                {cat.label}
              </button>
            ))}
          </nav>

          {/* Widget grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {currentWidgets.map((widget) => (
                <button
                  key={widget.type}
                  type="button"
                  disabled={loading}
                  onClick={() => handleAddWidget(widget.type)}
                  className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-4 text-center transition-all hover:border-primary/40 hover:bg-muted/50 hover:shadow-sm disabled:pointer-events-none disabled:opacity-50"
                >
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-primary/10">
                    <HugeiconsIcon
                      icon={widget.icon}
                      strokeWidth={1.5}
                      className="size-5 text-muted-foreground transition-colors group-hover:text-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold leading-tight text-foreground">
                      {widget.name}
                    </p>
                    <p className="text-[0.6875rem] leading-tight text-muted-foreground">
                      {widget.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
