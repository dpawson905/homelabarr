import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "../helpers"
import { fetchWithTls } from "@/lib/services/service-client"
import type { Monitor, MonitorStatus, UptimeKumaResponse } from "./types"

const STATUS_MAP: Record<number, MonitorStatus> = {
  0: "down",
  1: "up",
  2: "pending",
  3: "maintenance",
}

interface StatusPageConfig {
  name: string
}

interface StatusPageMonitor {
  id: number
  name: string
  type: string
  url?: string
}

interface StatusPageGroup {
  id: number
  name: string
  monitorList: StatusPageMonitor[]
}

interface StatusPageResponse {
  config: StatusPageConfig
  publicGroupList: StatusPageGroup[]
}

interface Heartbeat {
  status: number
  time: string
  ping: number
  msg: string
}

interface HeartbeatResponse {
  heartbeatList: Record<string, Heartbeat[]>
  uptimeList: Record<string, number>
}

function buildSummary(monitors: Monitor[]): UptimeKumaResponse["summary"] {
  return {
    total: monitors.length,
    up: monitors.filter((m) => m.status === "up").length,
    down: monitors.filter((m) => m.status === "down").length,
    pending: monitors.filter((m) => m.status === "pending").length,
    maintenance: monitors.filter((m) => m.status === "maintenance").length,
  }
}

async function fetchStatusPage(
  serviceUrl: string,
  slug: string
): Promise<UptimeKumaResponse> {
  const baseUrl = serviceUrl.replace(/\/+$/, "")

  const [statusRes, heartbeatRes] = await Promise.all([
    fetchWithTls(`${baseUrl}/api/status-page/${slug}`),
    fetchWithTls(`${baseUrl}/api/status-page/heartbeat/${slug}`),
  ])

  if (!statusRes.ok) {
    throw new Error(
      `Status page request failed: ${statusRes.status} ${statusRes.statusText}`
    )
  }
  if (!heartbeatRes.ok) {
    throw new Error(
      `Heartbeat request failed: ${heartbeatRes.status} ${heartbeatRes.statusText}`
    )
  }

  const statusData = (await statusRes.json()) as StatusPageResponse
  const heartbeatData = (await heartbeatRes.json()) as HeartbeatResponse

  const monitors: Monitor[] = []

  for (const group of statusData.publicGroupList ?? []) {
    for (const mon of group.monitorList ?? []) {
      const heartbeats = heartbeatData.heartbeatList?.[String(mon.id)] ?? []
      const latest = heartbeats.length > 0 ? heartbeats[heartbeats.length - 1] : null

      const uptime24hRaw = heartbeatData.uptimeList?.[`${mon.id}_24`]
      const uptime30dRaw = heartbeatData.uptimeList?.[`${mon.id}_720`]

      monitors.push({
        id: mon.id,
        name: mon.name,
        status: latest ? (STATUS_MAP[latest.status] ?? "pending") : "pending",
        uptime24h: uptime24hRaw != null ? uptime24hRaw * 100 : -1,
        uptime30d: uptime30dRaw != null ? uptime30dRaw * 100 : -1,
        responseTime: latest?.ping ?? 0,
        url: mon.url || undefined,
      })
    }
  }

  return {
    monitors,
    summary: buildSummary(monitors),
    statusPageName: statusData.config?.name ?? "Uptime Kuma",
  }
}

async function fetchMetrics(serviceUrl: string): Promise<UptimeKumaResponse> {
  const baseUrl = serviceUrl.replace(/\/+$/, "")

  const res = await fetchWithTls(`${baseUrl}/metrics`)

  if (!res.ok) {
    throw new Error(`Metrics request failed: ${res.status} ${res.statusText}`)
  }

  const text = await res.text()
  const monitorMap = new Map<string, Partial<Monitor>>()

  const statusRegex = /^monitor_status\{[^}]*monitor_name="([^"]+)"[^}]*\}\s+(\d+)/gm
  let match: RegExpExecArray | null

  while ((match = statusRegex.exec(text)) !== null) {
    const name = match[1]
    const existing = monitorMap.get(name) ?? { name }
    existing.status = Number(match[2]) === 1 ? "up" : "down"
    monitorMap.set(name, existing)
  }

  const responseTimeRegex =
    /^monitor_response_time\{[^}]*monitor_name="([^"]+)"[^}]*\}\s+([\d.]+)/gm

  while ((match = responseTimeRegex.exec(text)) !== null) {
    const name = match[1]
    const existing = monitorMap.get(name) ?? { name }
    existing.responseTime = Number(match[2])
    monitorMap.set(name, existing)
  }

  let index = 0
  const monitors: Monitor[] = []

  for (const [name, partial] of monitorMap) {
    monitors.push({
      id: index++,
      name,
      status: partial.status ?? "pending",
      uptime24h: -1,
      uptime30d: -1,
      responseTime: partial.responseTime ?? 0,
    })
  }

  return {
    monitors,
    summary: buildSummary(monitors),
    statusPageName: "Uptime Kuma",
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url)
  const widgetId = url.searchParams.get("widgetId")

  if (!widgetId) {
    return NextResponse.json(
      { error: "widgetId query parameter is required" },
      { status: 400 }
    )
  }

  const widget = getWidgetWithConfig(widgetId)
  if (!widget) {
    return NextResponse.json({ error: "Widget not found" }, { status: 404 })
  }

  const config = widget.config as Record<string, unknown> | null
  const serviceUrl = (config?.serviceUrl as string) ?? ""
  const slug = (config?.slug as string) ?? ""
  const dataSource = (config?.dataSource as string) ?? "status-page"

  if (!serviceUrl) {
    return NextResponse.json(
      { error: "serviceUrl is not configured" },
      { status: 400 }
    )
  }

  if (dataSource === "status-page" && !slug) {
    return NextResponse.json(
      { error: "slug is required for status-page data source" },
      { status: 400 }
    )
  }

  try {
    const data =
      dataSource === "metrics"
        ? await fetchMetrics(serviceUrl)
        : await fetchStatusPage(serviceUrl, slug)

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch Uptime Kuma data"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
