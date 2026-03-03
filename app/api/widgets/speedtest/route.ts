import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "@/app/api/widgets/helpers"
import { getServiceConnection, fetchService } from "@/lib/services/service-client"
import type { SpeedtestResponse } from "./types"

interface SpeedtestApiResult {
  id: number
  download: number
  upload: number
  ping: number
  server_name: string
  created_at: string
}

interface SpeedtestApiResponse {
  data: SpeedtestApiResult
}

function toMbps(value: number): number {
  // Speedtest Tracker may return bits/s or Mbps depending on version.
  // If the value is > 1000 it is almost certainly in bits per second.
  if (value > 1000) {
    return value / 1_000_000
  }
  return value
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
      { error: "Speedtest Tracker not configured. Add a service URL and API token." },
      { status: 400 }
    )
  }

  const { serviceUrl, apiKey } = connection

  const result = await fetchService<SpeedtestApiResponse>({
    baseUrl: serviceUrl,
    apiKey,
    endpoint: "/api/v1/results/latest",
    authType: "header-bearer",
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 502 }
    )
  }

  const raw = result.data?.data

  if (!raw) {
    const response: SpeedtestResponse = { latest: null }
    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store" },
    })
  }

  const response: SpeedtestResponse = {
    latest: {
      download: toMbps(raw.download),
      upload: toMbps(raw.upload),
      ping: raw.ping,
      serverName: raw.server_name,
      testTime: raw.created_at,
    },
  }

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  })
}
