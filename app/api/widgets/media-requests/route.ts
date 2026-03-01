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

interface OverseerrRequest {
  id: number
  type: string
  status: number
  createdAt: string
  media?: {
    title?: string
    name?: string
    originalTitle?: string
    releaseDate?: string
    firstAirDate?: string
  }
  requestedBy?: {
    displayName?: string
    email?: string
  }
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

function mapRequest(req: OverseerrRequest): MediaRequest {
  return {
    id: req.id,
    title:
      req.media?.title ??
      req.media?.name ??
      req.media?.originalTitle ??
      `Request #${req.id}`,
    mediaType: req.type === "movie" ? "movie" : "tv",
    status: STATUS_MAP[req.status] ?? "pending",
    requestedBy:
      req.requestedBy?.displayName ??
      req.requestedBy?.email ??
      "Unknown",
    requestedAt: req.createdAt,
    year: parseYear(req.media?.releaseDate) ?? parseYear(req.media?.firstAirDate),
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url)
  const widgetId = url.searchParams.get("widgetId")
  const filter = url.searchParams.get("filter") ?? "all"

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

  return NextResponse.json(
    { requests: requestsResult.data.results.map(mapRequest), counts },
    { headers: { "Cache-Control": "no-store" } }
  )
}
