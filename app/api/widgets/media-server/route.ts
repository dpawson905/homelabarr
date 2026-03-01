import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "@/app/api/widgets/helpers"
import { getServiceConnection, fetchService } from "@/lib/services/service-client"
import type { NowPlayingItem, RecentlyAddedItem, MediaServerResponse } from "./types"

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function mapPlexMediaType(type: string): NowPlayingItem["mediaType"] {
  switch (type) {
    case "movie": return "movie"
    case "episode": return "episode"
    case "track": return "music"
    default: return "other"
  }
}

function mapJellyfinMediaType(type: string): NowPlayingItem["mediaType"] {
  switch (type) {
    case "Movie": return "movie"
    case "Episode": return "episode"
    case "Audio": return "music"
    default: return "other"
  }
}

interface PlexMediaContainer<T> {
  MediaContainer?: { Metadata?: T[] }
}

interface PlexSessionMetadata {
  title?: string
  grandparentTitle?: string
  type?: string
  year?: number
  viewOffset?: number
  duration?: number
  User?: { title?: string }
  Player?: { state?: string }
}

interface PlexRecentMetadata {
  title?: string
  grandparentTitle?: string
  type?: string
  year?: number
  addedAt?: number
}

interface JellyfinNowPlayingItem {
  Name?: string
  SeriesName?: string
  Type?: string
  RunTimeTicks?: number
  ProductionYear?: number
}

interface JellyfinSession {
  UserName?: string
  NowPlayingItem?: JellyfinNowPlayingItem
  PlayState?: { IsPaused?: boolean; PositionTicks?: number }
}

interface JellyfinLatestItem {
  Name?: string
  SeriesName?: string
  Type?: string
  DateCreated?: string
  PremiereDate?: string
  ProductionYear?: number
}

async function fetchPlexNowPlaying(baseUrl: string, apiKey: string): Promise<NowPlayingItem[]> {
  const result = await fetchService<PlexMediaContainer<PlexSessionMetadata>>({
    baseUrl,
    apiKey,
    endpoint: "/status/sessions",
    authType: "header-x-plex-token",
  })

  if (!result.ok) return []

  const metadata = result.data?.MediaContainer?.Metadata
  if (!Array.isArray(metadata)) return []

  return metadata.map((item) => ({
    title: item.title ?? "Unknown",
    subtitle: item.grandparentTitle ?? "",
    user: item.User?.title ?? "Unknown",
    state: (item.Player?.state ?? "playing") as NowPlayingItem["state"],
    progressPercent:
      item.viewOffset && item.duration
        ? Math.round((item.viewOffset / item.duration) * 100)
        : 0,
    mediaType: mapPlexMediaType(item.type ?? ""),
    year: item.year,
    duration: item.duration ? formatDuration(item.duration) : undefined,
  }))
}

async function fetchPlexRecentlyAdded(baseUrl: string, apiKey: string): Promise<RecentlyAddedItem[]> {
  const result = await fetchService<PlexMediaContainer<PlexRecentMetadata>>({
    baseUrl,
    apiKey,
    endpoint: "/library/recentlyAdded",
    authType: "header-x-plex-token",
    queryParams: { "X-Plex-Container-Size": "20" },
  })

  if (!result.ok) return []

  const metadata = result.data?.MediaContainer?.Metadata
  if (!Array.isArray(metadata)) return []

  return metadata.map((item) => ({
    title: item.title ?? "Unknown",
    subtitle: item.grandparentTitle ?? "",
    mediaType: mapPlexMediaType(item.type ?? ""),
    addedAt: item.addedAt ? new Date(item.addedAt * 1000).toISOString() : "",
    year: item.year,
  }))
}

async function fetchJellyfinNowPlaying(baseUrl: string, apiKey: string): Promise<NowPlayingItem[]> {
  const result = await fetchService<JellyfinSession[]>({
    baseUrl,
    apiKey,
    endpoint: "/Sessions",
    authType: "header-authorization",
  })

  if (!result.ok) return []

  const sessions = result.data
  if (!Array.isArray(sessions)) return []

  return sessions
    .filter((s) => s.NowPlayingItem)
    .map((session) => {
      const item = session.NowPlayingItem!
      const runTimeTicks = item.RunTimeTicks ?? 0
      const positionTicks = session.PlayState?.PositionTicks ?? 0

      return {
        title: item.Name ?? "Unknown",
        subtitle: item.SeriesName ?? "",
        user: session.UserName ?? "Unknown",
        state: session.PlayState?.IsPaused ? ("paused" as const) : ("playing" as const),
        progressPercent:
          runTimeTicks > 0 ? Math.round((positionTicks / runTimeTicks) * 100) : 0,
        mediaType: mapJellyfinMediaType(item.Type ?? ""),
        year: item.ProductionYear,
        duration: runTimeTicks > 0 ? formatDuration(runTimeTicks / 10_000) : undefined,
      }
    })
}

async function fetchJellyfinRecentlyAdded(baseUrl: string, apiKey: string): Promise<RecentlyAddedItem[]> {
  const result = await fetchService<JellyfinLatestItem[]>({
    baseUrl,
    apiKey,
    endpoint: "/Items/Latest",
    authType: "header-authorization",
    queryParams: {
      Limit: "20",
      IncludeItemTypes: "Movie,Episode,Audio",
      Fields: "DateCreated",
    },
  })

  if (!result.ok) return []

  const items = result.data
  if (!Array.isArray(items)) return []

  return items.map((item) => ({
    title: item.Name ?? "Unknown",
    subtitle: item.SeriesName ?? "",
    mediaType: mapJellyfinMediaType(item.Type ?? ""),
    addedAt: item.DateCreated ?? item.PremiereDate ?? "",
    year: item.ProductionYear,
  }))
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url)
  const widgetId = url.searchParams.get("widgetId")

  if (!widgetId) {
    return NextResponse.json({ error: "Missing widgetId parameter" }, { status: 400 })
  }

  const widget = getWidgetWithConfig(widgetId)
  if (!widget) {
    return NextResponse.json({ error: "Widget not found" }, { status: 404 })
  }

  const config = widget.config as Record<string, unknown> | null
  const serviceType = (config?.serviceType as string) ?? ""

  if (serviceType !== "plex" && serviceType !== "jellyfin") {
    return NextResponse.json(
      { error: "Widget not configured. Set serviceType to 'plex' or 'jellyfin'." },
      { status: 400 }
    )
  }

  const connection = getServiceConnection(config)
  if (!connection) {
    return NextResponse.json(
      { error: "Service connection not configured. Check serviceUrl and secretName." },
      { status: 400 }
    )
  }

  const { serviceUrl, apiKey } = connection

  const [nowPlaying, recentlyAdded] =
    serviceType === "plex"
      ? await Promise.all([
          fetchPlexNowPlaying(serviceUrl, apiKey),
          fetchPlexRecentlyAdded(serviceUrl, apiKey),
        ])
      : await Promise.all([
          fetchJellyfinNowPlaying(serviceUrl, apiKey),
          fetchJellyfinRecentlyAdded(serviceUrl, apiKey),
        ])

  const response: MediaServerResponse = {
    nowPlaying,
    recentlyAdded,
    serverName: serviceType === "plex" ? "Plex" : "Jellyfin",
  }

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  })
}
