import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "@/app/api/widgets/helpers"
import { getServiceConnection, fetchService } from "@/lib/services/service-client"
import type { ImmichResponse } from "./types"

interface ImmichUserUsage {
  userId: string
  photos: number
  videos: number
  usage: number
}

interface ImmichStatisticsRaw {
  photos: number
  videos: number
  usage: ImmichUserUsage[]
}

interface ImmichVersionRaw {
  major: number
  minor: number
  patch: number
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
      { error: "Immich service not configured. Add a service URL and API key." },
      { status: 400 }
    )
  }

  const { serviceUrl, apiKey } = connection

  const [statsResult, versionResult] = await Promise.all([
    fetchService<ImmichStatisticsRaw>({
      baseUrl: serviceUrl,
      apiKey,
      endpoint: "/api/server/statistics",
      authType: "header-x-api-key",
    }),
    fetchService<ImmichVersionRaw>({
      baseUrl: serviceUrl,
      apiKey,
      endpoint: "/api/server/version",
      authType: "header-x-api-key",
    }),
  ])

  if (!statsResult.ok) {
    return NextResponse.json(
      { error: statsResult.error },
      { status: statsResult.status ?? 502 }
    )
  }

  if (!versionResult.ok) {
    return NextResponse.json(
      { error: versionResult.error },
      { status: versionResult.status ?? 502 }
    )
  }

  const stats = statsResult.data
  const ver = versionResult.data
  const usageEntries = stats.usage ?? []

  const totalPhotos = usageEntries.reduce((sum, u) => sum + (u.photos ?? 0), 0)
  const totalVideos = usageEntries.reduce((sum, u) => sum + (u.videos ?? 0), 0)
  const totalSize = usageEntries.reduce((sum, u) => sum + (u.usage ?? 0), 0)

  const response: ImmichResponse = {
    photos: totalPhotos,
    videos: totalVideos,
    totalSize,
    users: usageEntries.length,
    version: `${ver.major}.${ver.minor}.${ver.patch}`,
  }

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  })
}
