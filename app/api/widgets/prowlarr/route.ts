import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "@/app/api/widgets/helpers"
import { getServiceConnection, fetchService } from "@/lib/services/service-client"
import type { ProwlarrHealth, ProwlarrResponse } from "./types"

/* eslint-disable @typescript-eslint/no-explicit-any */

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
  const connection = getServiceConnection(config)
  if (!connection) {
    return NextResponse.json(
      { error: "Service not configured" },
      { status: 400 }
    )
  }

  const { serviceUrl, apiKey } = connection

  const [indexerResult, healthResult, statsResult] = await Promise.all([
    fetchService<any[]>({
      baseUrl: serviceUrl,
      apiKey,
      endpoint: "/api/v1/indexer",
      authType: "header-x-api-key",
    }),
    fetchService<any[]>({
      baseUrl: serviceUrl,
      apiKey,
      endpoint: "/api/v1/health",
      authType: "header-x-api-key",
    }),
    fetchService<any[]>({
      baseUrl: serviceUrl,
      apiKey,
      endpoint: "/api/v1/indexerstats",
      authType: "header-x-api-key",
    }),
  ])

  const indexers = indexerResult.ok ? (indexerResult.data ?? []) : []
  const enabledCount = indexers.filter((idx: any) => idx.enable === true).length
  const totalCount = indexers.length

  const health: ProwlarrHealth[] = healthResult.ok
    ? (healthResult.data ?? []).map((h: any) => ({
        source: h.source ?? "",
        type: h.type ?? "warning",
        message: h.message ?? "",
      }))
    : []

  const rawStats = statsResult.ok ? (statsResult.data ?? []) : []
  let grabs = 0
  let queries = 0
  let failedGrabs = 0
  let failedQueries = 0

  for (const stat of rawStats) {
    grabs += stat.numberOfGrabs ?? 0
    queries += stat.numberOfQueries ?? 0
    failedGrabs += stat.numberOfFailedGrabs ?? 0
    failedQueries += stat.numberOfFailedQueries ?? 0
  }

  const response: ProwlarrResponse = {
    indexers: { enabled: enabledCount, total: totalCount },
    health,
    grabs,
    queries,
    failedGrabs,
    failedQueries,
  }

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  })
}
