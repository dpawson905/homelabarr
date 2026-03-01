import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "@/app/api/widgets/helpers"
import { getServiceConnection, fetchService } from "@/lib/services/service-client"
import type { DnsStats, DnsClient, DnsResponse } from "./types"

interface PiholeSummary {
  ads_blocked_today: number
  dns_queries_today: number
  ads_percentage_today: number
  domains_being_blocked: number
  unique_clients: number
  status: string
}

interface PiholeTopSources {
  top_sources: Record<string, number>
}

interface AdGuardStats {
  num_dns_queries: number
  num_blocked_filtering: number
  avg_processing_time: number
  top_clients: Array<Record<string, number>>
}

interface AdGuardStatus {
  running: boolean
  protection_enabled: boolean
}

async function handlePihole(
  serviceUrl: string,
  apiKey: string
): Promise<NextResponse> {
  const summaryResult = await fetchService<PiholeSummary>({
    baseUrl: serviceUrl,
    apiKey,
    endpoint: "/admin/api.php",
    authType: "query-auth",
    queryParams: { summaryRaw: "" },
  })

  if (!summaryResult.ok) {
    return NextResponse.json(
      { error: summaryResult.error },
      { status: summaryResult.status ?? 502 }
    )
  }

  const summary = summaryResult.data

  const topClientsResult = await fetchService<PiholeTopSources>({
    baseUrl: serviceUrl,
    apiKey,
    endpoint: "/admin/api.php",
    authType: "query-auth",
    queryParams: { getQuerySources: "" },
  })

  const topClients: DnsClient[] = []

  if (topClientsResult.ok && topClientsResult.data.top_sources) {
    for (const [key, count] of Object.entries(topClientsResult.data.top_sources).slice(0, 5)) {
      // Pi-hole returns keys like "192.168.1.1|hostname" or just "192.168.1.1"
      const parts = key.split("|")
      const name = parts.length > 1 && parts[1] ? parts[1] : parts[0]
      topClients.push({ name, queryCount: count })
    }
  }

  const stats: DnsStats = {
    totalQueries: summary.dns_queries_today,
    blockedQueries: summary.ads_blocked_today,
    blockPercentage: summary.ads_percentage_today,
    domainsBlocked: summary.domains_being_blocked,
    topClients,
  }

  const response: DnsResponse = {
    stats,
    serviceType: "pihole",
    protectionEnabled: summary.status === "enabled",
  }

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  })
}

async function handleAdGuard(
  serviceUrl: string,
  apiKey: string
): Promise<NextResponse> {
  const [statsResult, statusResult] = await Promise.all([
    fetchService<AdGuardStats>({
      baseUrl: serviceUrl,
      apiKey,
      endpoint: "/control/stats",
      authType: "header-basic-auth",
    }),
    fetchService<AdGuardStatus>({
      baseUrl: serviceUrl,
      apiKey,
      endpoint: "/control/status",
      authType: "header-basic-auth",
    }),
  ])

  if (!statsResult.ok) {
    return NextResponse.json(
      { error: statsResult.error },
      { status: statsResult.status ?? 502 }
    )
  }

  const adStats = statsResult.data

  const topClients: DnsClient[] = []
  if (adStats.top_clients) {
    for (const entry of adStats.top_clients.slice(0, 5)) {
      const [name, count] = Object.entries(entry)[0] ?? []
      if (name) {
        topClients.push({ name, queryCount: count ?? 0 })
      }
    }
  }

  const totalQueries = adStats.num_dns_queries
  const blockedQueries = adStats.num_blocked_filtering
  const blockPercentage =
    totalQueries > 0 ? (blockedQueries / totalQueries) * 100 : 0

  const stats: DnsStats = {
    totalQueries,
    blockedQueries,
    blockPercentage,
    domainsBlocked: 0, // AdGuard does not expose a domain blocklist count in stats
    topClients,
  }

  const protectionEnabled = statusResult.ok
    ? statusResult.data.protection_enabled
    : false

  const response: DnsResponse = {
    stats,
    serviceType: "adguard",
    protectionEnabled,
  }

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  })
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
  const serviceType = (config?.serviceType as string) ?? ""

  if (serviceType !== "pihole" && serviceType !== "adguard") {
    return NextResponse.json(
      { error: "Invalid or missing serviceType in widget config" },
      { status: 400 }
    )
  }

  const connection = getServiceConnection(config)
  if (!connection) {
    return NextResponse.json(
      { error: "Widget is not configured – URL or secret missing" },
      { status: 400 }
    )
  }

  const { serviceUrl, apiKey } = connection

  if (serviceType === "pihole") {
    return handlePihole(serviceUrl, apiKey)
  }

  return handleAdGuard(serviceUrl, apiKey)
}
