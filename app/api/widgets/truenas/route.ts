import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "@/app/api/widgets/helpers"
import { getServiceConnection, fetchService } from "@/lib/services/service-client"
import type { TruenasPool, TruenasResponse } from "./types"

interface SystemInfo {
  hostname: string
  version: string
  uptime_seconds: number
}

interface PoolData {
  name: string
  status: string
  healthy: boolean
  topology: {
    data: Array<{
      stats: {
        size: number
        allocated: number
      }
    }>
  }
}

interface DatasetData {
  pool: string
  used: { rawvalue: string }
  available: { rawvalue: string }
}

interface AlertData {
  level: string
  title: string
  dismissed: boolean
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

  const connection = getServiceConnection(config)
  if (!connection) {
    return NextResponse.json(
      { error: "Widget is not configured – URL or secret missing" },
      { status: 400 }
    )
  }

  const { serviceUrl, apiKey } = connection

  const [systemResult, poolsResult, datasetsResult, alertsResult] =
    await Promise.all([
      fetchService<SystemInfo>({
        baseUrl: serviceUrl,
        apiKey,
        endpoint: "/api/v2.0/system/info",
        authType: "header-bearer",
      }),
      fetchService<PoolData[]>({
        baseUrl: serviceUrl,
        apiKey,
        endpoint: "/api/v2.0/pool",
        authType: "header-bearer",
      }),
      fetchService<DatasetData[]>({
        baseUrl: serviceUrl,
        apiKey,
        endpoint: "/api/v2.0/pool/dataset",
        authType: "header-bearer",
        queryParams: { extra: "true" },
      }),
      fetchService<AlertData[]>({
        baseUrl: serviceUrl,
        apiKey,
        endpoint: "/api/v2.0/alert/list",
        authType: "header-bearer",
      }),
    ])

  if (!systemResult.ok) {
    return NextResponse.json(
      { error: systemResult.error },
      { status: systemResult.status ?? 502 }
    )
  }

  if (!poolsResult.ok) {
    return NextResponse.json(
      { error: poolsResult.error },
      { status: poolsResult.status ?? 502 }
    )
  }

  const systemInfo = systemResult.data
  const poolsData = poolsResult.data

  // Build a map of dataset usage by pool name
  const datasetMap = new Map<string, { used: number; available: number }>()
  if (datasetsResult.ok) {
    for (const ds of datasetsResult.data) {
      if (ds.pool && !datasetMap.has(ds.pool)) {
        const used = parseInt(ds.used.rawvalue, 10) || 0
        const available = parseInt(ds.available.rawvalue, 10) || 0
        datasetMap.set(ds.pool, { used, available })
      }
    }
  }

  const pools: TruenasPool[] = poolsData.map((pool) => {
    const dataset = datasetMap.get(pool.name)

    let usedBytes = 0
    let totalBytes = 0

    if (dataset) {
      usedBytes = dataset.used
      totalBytes = dataset.used + dataset.available
    } else {
      // Fallback to topology stats if dataset data is unavailable
      for (const vdev of pool.topology?.data ?? []) {
        totalBytes += vdev.stats?.size ?? 0
        usedBytes += vdev.stats?.allocated ?? 0
      }
    }

    const usedPercentage = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0

    return {
      name: pool.name,
      status: pool.status,
      healthy: pool.healthy,
      usedBytes,
      totalBytes,
      usedPercentage,
    }
  })

  // Count undismissed alerts by severity
  const alerts = { info: 0, warning: 0, critical: 0 }
  if (alertsResult.ok) {
    for (const alert of alertsResult.data) {
      if (alert.dismissed) continue
      const level = alert.level?.toUpperCase()
      if (level === "INFO") alerts.info++
      else if (level === "WARNING") alerts.warning++
      else if (level === "CRITICAL") alerts.critical++
    }
  }

  const response: TruenasResponse = {
    hostname: systemInfo.hostname,
    version: systemInfo.version,
    uptimeSeconds: systemInfo.uptime_seconds,
    pools,
    alerts,
  }

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  })
}
