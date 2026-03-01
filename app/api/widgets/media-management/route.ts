import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "@/app/api/widgets/helpers"
import { getServiceConnection, fetchService } from "@/lib/services/service-client"
import type { CalendarItem, QueueItem, MediaManagementResponse } from "./types"

/* eslint-disable @typescript-eslint/no-explicit-any */

function mapSonarrCalendar(episodes: any[]): CalendarItem[] {
  return episodes.map((ep) => ({
    id: ep.id,
    title: ep.title ?? "Unknown",
    seriesOrMovieTitle: ep.series?.title ?? "Unknown",
    episodeInfo: `S${String(ep.seasonNumber ?? 0).padStart(2, "0")}E${String(ep.episodeNumber ?? 0).padStart(2, "0")}`,
    airDate: ep.airDateUtc ?? "",
    hasFile: ep.hasFile ?? false,
    mediaType: "episode" as const,
  }))
}

function mapRadarrCalendar(movies: any[]): CalendarItem[] {
  return movies.map((movie) => ({
    id: movie.id,
    title: movie.title ?? "Unknown",
    seriesOrMovieTitle: movie.title ?? "Unknown",
    airDate: movie.digitalRelease ?? movie.physicalRelease ?? movie.inCinemas ?? "",
    hasFile: movie.hasFile ?? false,
    mediaType: "movie" as const,
  }))
}

function mapQueue(records: any[], serviceType: "sonarr" | "radarr"): QueueItem[] {
  return records.map((item) => ({
    id: item.id,
    title:
      serviceType === "sonarr"
        ? (item.episode?.title ?? item.title ?? "Unknown")
        : (item.movie?.title ?? item.title ?? "Unknown"),
    seriesOrMovieTitle:
      serviceType === "sonarr"
        ? (item.series?.title ?? "Unknown")
        : (item.movie?.title ?? "Unknown"),
    status: item.trackedDownloadState ?? item.status ?? "queued",
    progressPercent: item.size > 0 ? ((item.size - item.sizeleft) / item.size) * 100 : 0,
    sizeTotal: item.size ?? 0,
    sizeLeft: item.sizeleft ?? 0,
    timeLeft: item.timeleft ?? "",
    mediaType: serviceType === "sonarr" ? ("episode" as const) : ("movie" as const),
  }))
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

  if (serviceType !== "sonarr" && serviceType !== "radarr") {
    return NextResponse.json({ error: "Service not configured" }, { status: 400 })
  }

  const connection = getServiceConnection(config)
  if (!connection) {
    return NextResponse.json({ error: "Service not configured" }, { status: 400 })
  }

  const { serviceUrl, apiKey } = connection
  const now = new Date()
  const start = now.toISOString()
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const [calendarResult, queueResult] = await Promise.all([
    fetchService<any[]>({
      baseUrl: serviceUrl,
      apiKey,
      endpoint: "/api/v3/calendar",
      authType: "header-x-api-key",
      queryParams: { start, end },
    }),
    fetchService<{ records: any[] }>({
      baseUrl: serviceUrl,
      apiKey,
      endpoint: "/api/v3/queue",
      authType: "header-x-api-key",
      queryParams:
        serviceType === "sonarr"
          ? { page: "1", pageSize: "20", includeEpisode: "true", includeSeries: "true" }
          : { page: "1", pageSize: "20", includeMovie: "true" },
    }),
  ])

  const rawCalendar = calendarResult.ok ? (calendarResult.data ?? []) : []
  const calendar = (
    serviceType === "sonarr" ? mapSonarrCalendar(rawCalendar) : mapRadarrCalendar(rawCalendar)
  ).sort((a, b) => {
    if (!a.airDate) return 1
    if (!b.airDate) return -1
    return new Date(a.airDate).getTime() - new Date(b.airDate).getTime()
  })

  const queue = queueResult.ok
    ? mapQueue(queueResult.data?.records ?? [], serviceType)
    : []

  const response: MediaManagementResponse = { calendar, queue, serviceType }
  return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } })
}
