"use client"

import { WidgetPlaceholder } from "@/components/widget-placeholder"
import { AppLinksWidget } from "@/components/widgets/app-links-widget"
import { SearchWidget } from "@/components/widgets/search-widget"
import { ClockWidget } from "@/components/widgets/clock-widget"
import { NotesWidget } from "@/components/widgets/notes-widget"
import { WeatherWidget } from "@/components/widgets/weather-widget"
import { CalendarWidget } from "@/components/widgets/calendar-widget"
import { RssWidget } from "@/components/widgets/rss-widget"
import { SystemStatsWidget } from "@/components/widgets/system-stats-widget"
import { DockerWidget } from "@/components/widgets/docker-widget"
import { MediaServerWidget } from "@/components/widgets/media-server-widget"
import { MediaManagementWidget } from "@/components/widgets/media-management-widget"
import { DownloadClientWidget } from "@/components/widgets/download-client-widget"
import { MediaRequestsWidget } from "@/components/widgets/media-requests-widget"
import { DnsWidget } from "@/components/widgets/dns-widget"
import { ProxmoxWidget } from "@/components/widgets/proxmox-widget"
import { HomeAssistantWidget } from "@/components/widgets/home-assistant-widget"
import { UptimeKumaWidget } from "@/components/widgets/uptime-kuma-widget"

interface WidgetRendererProps {
  type: string
  widgetId: string
  config?: Record<string, unknown> | null
}

export function WidgetRenderer({ type, widgetId, config }: WidgetRendererProps): React.ReactElement {
  switch (type) {
    case "app-links":
      return <AppLinksWidget />
    case "search":
      return <SearchWidget />
    case "clock":
      return <ClockWidget widgetId={widgetId} config={config ?? null} />
    case "notes":
      return <NotesWidget widgetId={widgetId} config={config ?? null} />
    case "weather":
      return <WeatherWidget widgetId={widgetId} config={config ?? null} />
    case "calendar":
      return <CalendarWidget widgetId={widgetId} config={config ?? null} />
    case "rss-feed":
      return <RssWidget widgetId={widgetId} config={config ?? null} />
    case "system-stats":
      return <SystemStatsWidget widgetId={widgetId} config={config ?? null} />
    case "docker":
      return <DockerWidget widgetId={widgetId} config={config ?? null} />
    case "media-server":
      return <MediaServerWidget widgetId={widgetId} config={config ?? null} />
    case "media-management":
      return <MediaManagementWidget widgetId={widgetId} config={config ?? null} />
    case "download-client":
      return <DownloadClientWidget widgetId={widgetId} config={config ?? null} />
    case "media-requests":
      return <MediaRequestsWidget widgetId={widgetId} config={config ?? null} />
    case "dns":
      return <DnsWidget widgetId={widgetId} config={config ?? null} />
    case "proxmox":
      return <ProxmoxWidget widgetId={widgetId} config={config ?? null} />
    case "home-assistant":
      return <HomeAssistantWidget widgetId={widgetId} config={config ?? null} />
    case "uptime-kuma":
      return <UptimeKumaWidget widgetId={widgetId} config={config ?? null} />
    default:
      return <WidgetPlaceholder type={type} />
  }
}
