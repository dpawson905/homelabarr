import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "@/app/api/widgets/helpers"
import { getServiceConnection, fetchService } from "@/lib/services/service-client"
import type { MediaRequest, RequestCounts, MediaRequestsResponse } from "./types"

const STATUS_MAP: Record<number, MediaRequest["status"]> = {
  1: "pending",
  2: "approved",
  3: "declined",
  4: "available",
  5: "processing",
}

function parseYear(dateStr: unknown): number | undefined {
  if (typeof dateStr !== "string" || !dateStr) return undefined
  const year = new Date(dateStr).getFullYear()
  return Number.isNaN(year) ? undefined : year
}

interface OverseerrMedia {
  id: number
  tmdbId?: number
  mediaType?: string
}

interface OverseerrRequest {
  id: number
  type: string
  status: number
  createdAt: string
  media?: OverseerrMedia
  requestedBy?: {
    displayName?: string
    email?: string
  }
}

interface MediaDetails {
  title?: string
  name?: string
  originalTitle?: string
  originalName?: string
  releaseDate?: string
  firstAirDate?: string
}

interface OverseerrRequestListResponse {
  pageInfo: { pages: number; pageSize: number; results: number; page: number }
  results: OverseerrRequest[]
}

interface OverseerrCountResponse {
  pending: number
  approved: number
  processing: number
  available: number
  total: number
}

function mapRequest(
  req: OverseerrRequest,
  details?: MediaDetails
): MediaRequest {
  return {
    id: req.id,
    title:
      details?.title ??
      details?.name ??
      details?.originalTitle ??
      details?.originalName ??
      `Request #${req.id}`,
    mediaType: req.type === "movie" ? "movie" : "tv",
    status: STATUS_MAP[req.status] ?? "pending",
    requestedBy:
      req.requestedBy?.displayName ??
      req.requestedBy?.email ??
      "Unknown",
    requestedAt: req.createdAt,
    year: parseYear(details?.releaseDate) ?? parseYear(details?.firstAirDate),
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url)
  const widgetId = url.searchParams.get("widgetId")
  const VALID_FILTERS = new Set(["all", "pending", "approved", "available", "declined", "processing"])
  const rawFilter = url.searchParams.get("filter") ?? "all"
  const filter = VALID_FILTERS.has(rawFilter) ? rawFilter : "all"

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
      { error: "Media request service not configured. Add a service URL and API key." },
      { status: 400 }
    )
  }

  const { serviceUrl, apiKey } = connection

  const queryParams: Record<string, string> = { take: "20", skip: "0", sort: "added" }
  if (filter !== "all") {
    queryParams.filter = filter
  }

  const [requestsResult, countsResult] = await Promise.all([
    fetchService<OverseerrRequestListResponse>({
      baseUrl: serviceUrl,
      apiKey,
      endpoint: "/api/v1/request",
      authType: "header-x-api-key",
      queryParams,
    }),
    fetchService<OverseerrCountResponse>({
      baseUrl: serviceUrl,
      apiKey,
      endpoint: "/api/v1/request/count",
      authType: "header-x-api-key",
    }),
  ])

  if (!requestsResult.ok) {
    return NextResponse.json(
      { error: requestsResult.error },
      { status: requestsResult.status ?? 502 }
    )
  }

  const counts: RequestCounts = countsResult.ok
    ? countsResult.data
    : { pending: 0, approved: 0, processing: 0, available: 0, total: 0 }

  // Fetch media details (title, year) for each request via tmdbId
  const results = requestsResult.data.results
  const detailsMap = new Map<string, MediaDetails>()

  // Deduplicate by mediaType+tmdbId to avoid redundant calls
  const uniqueMedia = new Map<string, { type: string; tmdbId: number }>()
  for (const req of results) {
    const tmdbId = req.media?.tmdbId
    if (tmdbId) {
      const mediaType = req.type === "movie" ? "movie" : "tv"
      const key = `${mediaType}:${tmdbId}`
      uniqueMedia.set(key, { type: mediaType, tmdbId })
    }
  }

  // Fetch details in batches of 5 to avoid overwhelming Seerr
  const BATCH_SIZE = 5
  const entries = Array.from(uniqueMedia.entries())
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map(async ([key, { type, tmdbId }]) => {
        const result = await fetchService<MediaDetails>({
          baseUrl: serviceUrl,
          apiKey,
          endpoint: `/api/v1/${type}/${tmdbId}`,
          authType: "header-x-api-key",
        })
        if (result.ok) {
          detailsMap.set(key, result.data)
        }
      })
    )
  }

  const requests = results.map((req) => {
    const tmdbId = req.media?.tmdbId
    const mediaType = req.type === "movie" ? "movie" : "tv"
    const key = tmdbId ? `${mediaType}:${tmdbId}` : undefined
    const details = key ? detailsMap.get(key) : undefined
    return mapRequest(req, details)
  })

  return NextResponse.json(
    { requests, counts },
    { headers: { "Cache-Control": "no-store" } }
  )
}
