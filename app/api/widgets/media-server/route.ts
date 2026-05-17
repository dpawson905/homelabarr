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
  thumb?: string
  grandparentThumb?: string
  User?: { title?: string }
  Player?: { state?: string }
}

interface PlexRecentMetadata {
  title?: string
  grandparentTitle?: string
  type?: string
  year?: number
  addedAt?: number
  thumb?: string
  grandparentThumb?: string
}

interface JellyfinNowPlayingItem {
  Id?: string
  Name?: string
  SeriesName?: string
  SeriesId?: string
  Type?: string
  RunTimeTicks?: number
  ProductionYear?: number
  ImageTags?: Record<string, string>
  SeriesPrimaryImageTag?: string
}

interface JellyfinSession {
  UserName?: string
  NowPlayingItem?: JellyfinNowPlayingItem
  PlayState?: { IsPaused?: boolean; PositionTicks?: number }
}

interface JellyfinLatestItem {
  Id?: string
  Name?: string
  SeriesName?: string
  SeriesId?: string
  Type?: string
  DateCreated?: string
  PremiereDate?: string
  ProductionYear?: number
  ImageTags?: Record<string, string>
  SeriesPrimaryImageTag?: string
}

function buildThumbProxyUrl(widgetId: string, thumbPath: string): string {
  return `/api/widgets/media-server/thumb?widgetId=${encodeURIComponent(widgetId)}&path=${encodeURIComponent(thumbPath)}`
}

function plexThumbPath(item: { thumb?: string; grandparentThumb?: string }): string | undefined {
  return item.thumb ?? item.grandparentThumb
}

function jellyfinThumbPath(baseUrl: string, item: { Id?: string; SeriesId?: string; ImageTags?: Record<string, string>; SeriesPrimaryImageTag?: string }): string | undefined {
  // For episodes, prefer the series poster; for movies use the item's own image
  if (item.SeriesId && item.SeriesPrimaryImageTag) {
    return `${baseUrl}/Items/${item.SeriesId}/Images/Primary?tag=${item.SeriesPrimaryImageTag}&quality=60&maxHeight=120`
  }
  if (item.Id && item.ImageTags?.Primary) {
    return `${baseUrl}/Items/${item.Id}/Images/Primary?tag=${item.ImageTags.Primary}&quality=60&maxHeight=120`
  }
  return undefined
}

async function fetchPlexNowPlaying(baseUrl: string, apiKey: string, widgetId: string): Promise<NowPlayingItem[]> {
  const result = await fetchService<PlexMediaContainer<PlexSessionMetadata>>({
    baseUrl,
    apiKey,
    endpoint: "/status/sessions",
    authType: "header-x-plex-token",
  })

  if (!result.ok) return []

  const metadata = result.data?.MediaContainer?.Metadata
  if (!Array.isArray(metadata)) return []

  return metadata.map((item) => {
    const thumb = plexThumbPath(item)
    return {
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
      thumbUrl: thumb ? buildThumbProxyUrl(widgetId, thumb) : undefined,
    }
  })
}

async function fetchPlexRecentlyAdded(baseUrl: string, apiKey: string, widgetId: string): Promise<RecentlyAddedItem[]> {
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

  return metadata.map((item) => {
    const thumb = plexThumbPath(item)
    return {
      title: item.title ?? "Unknown",
      subtitle: item.grandparentTitle ?? "",
      mediaType: mapPlexMediaType(item.type ?? ""),
      addedAt: item.addedAt ? new Date(item.addedAt * 1000).toISOString() : "",
      year: item.year,
      thumbUrl: thumb ? buildThumbProxyUrl(widgetId, thumb) : undefined,
    }
  })
}

async function fetchJellyfinNowPlaying(baseUrl: string, apiKey: string, widgetId: string): Promise<NowPlayingItem[]> {
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
      const thumb = jellyfinThumbPath(baseUrl, item)

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
        thumbUrl: thumb ? buildThumbProxyUrl(widgetId, thumb) : undefined,
      }
    })
}

async function fetchJellyfinRecentlyAdded(baseUrl: string, apiKey: string, widgetId: string): Promise<RecentlyAddedItem[]> {
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

  return items.map((item) => {
    const thumb = jellyfinThumbPath(baseUrl, item)
    return {
      title: item.Name ?? "Unknown",
      subtitle: item.SeriesName ?? "",
      mediaType: mapJellyfinMediaType(item.Type ?? ""),
      addedAt: item.DateCreated ?? item.PremiereDate ?? "",
      year: item.ProductionYear,
      thumbUrl: thumb ? buildThumbProxyUrl(widgetId, thumb) : undefined,
    }
  })
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
          fetchPlexNowPlaying(serviceUrl, apiKey, widgetId),
          fetchPlexRecentlyAdded(serviceUrl, apiKey, widgetId),
        ])
      : await Promise.all([
          fetchJellyfinNowPlaying(serviceUrl, apiKey, widgetId),
          fetchJellyfinRecentlyAdded(serviceUrl, apiKey, widgetId),
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
