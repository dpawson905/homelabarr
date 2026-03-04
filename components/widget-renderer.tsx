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
import { TruenasWidget } from "@/components/widgets/truenas-widget"
import { UnraidWidget } from "@/components/widgets/unraid-widget"
import { SpeedtestWidget } from "@/components/widgets/speedtest-widget"
import { ImmichWidget } from "@/components/widgets/immich-widget"
import { ProwlarrWidget } from "@/components/widgets/prowlarr-widget"
import { NginxProxyWidget } from "@/components/widgets/nginx-proxy-widget"
import { PortainerWidget } from "@/components/widgets/portainer-widget"
import { PaperlessWidget } from "@/components/widgets/paperless-widget"
import { NextcloudWidget } from "@/components/widgets/nextcloud-widget"
import { AuthentikWidget } from "@/components/widgets/authentik-widget"
import { GiteaWidget } from "@/components/widgets/gitea-widget"
import { FirewallWidget } from "@/components/widgets/firewall-widget"
import { ScrutinyWidget } from "@/components/widgets/scrutiny-widget"
import { FrigateWidget } from "@/components/widgets/frigate-widget"
import { ServerPowerWidget } from "@/components/widgets/server-power-widget"
import { PrometheusWidget } from "@/components/widgets/prometheus-widget"
import { WakeOnLanWidget } from "@/components/widgets/wake-on-lan-widget"

interface WidgetRendererProps {
  type: string
  widgetId: string
  config?: Record<string, unknown> | null
  onDelete?: () => void
}

export function WidgetRenderer({ type, widgetId, config, onDelete }: WidgetRendererProps): React.ReactElement {
  const c = config ?? null
  switch (type) {
    case "app-links":
      return <AppLinksWidget />
    case "search":
      return <SearchWidget />
    case "clock":
      return <ClockWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "notes":
      return <NotesWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "weather":
      return <WeatherWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "calendar":
      return <CalendarWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "rss-feed":
      return <RssWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "system-stats":
      return <SystemStatsWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "docker":
      return <DockerWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "media-server":
      return <MediaServerWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "media-management":
      return <MediaManagementWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "download-client":
      return <DownloadClientWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "media-requests":
      return <MediaRequestsWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "dns":
      return <DnsWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "proxmox":
      return <ProxmoxWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "home-assistant":
      return <HomeAssistantWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "uptime-kuma":
      return <UptimeKumaWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "truenas":
      return <TruenasWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "unraid":
      return <UnraidWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "speedtest":
      return <SpeedtestWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "immich":
      return <ImmichWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "prowlarr":
      return <ProwlarrWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "nginx-proxy":
      return <NginxProxyWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "portainer":
      return <PortainerWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "paperless":
      return <PaperlessWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "nextcloud":
      return <NextcloudWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "authentik":
      return <AuthentikWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "gitea":
      return <GiteaWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "firewall":
      return <FirewallWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "scrutiny":
      return <ScrutinyWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "frigate":
      return <FrigateWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "server-power":
      return <ServerPowerWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "prometheus":
      return <PrometheusWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    case "wake-on-lan":
      return <WakeOnLanWidget widgetId={widgetId} config={c} onDelete={onDelete} />
    default:
      return <WidgetPlaceholder type={type} />
  }
}
