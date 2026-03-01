import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "@/app/api/widgets/helpers"
import { resolveSecret, fetchService } from "@/lib/services/service-client"
import type {
  DownloadItem,
  DownloadSummary,
  DownloadClientResponse,
} from "./types"

function formatEta(seconds: number): string {
  if (seconds <= 0 || seconds >= 8640000) return ""
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function mapQBittorrentState(state: string): DownloadItem["status"] {
  switch (state) {
    case "downloading":
    case "forcedDL":
      return "downloading"
    case "pausedDL":
    case "pausedUP":
      return "paused"
    case "queuedDL":
    case "queuedUP":
      return "queued"
    case "uploading":
    case "forcedUP":
      return "seeding"
    case "stalledDL":
    case "stalledUP":
      return "stalled"
    case "checkingDL":
    case "checkingUP":
    case "checkingResumeData":
      return "checking"
    case "error":
    case "missingFiles":
      return "failed"
    default:
      return "queued"
  }
}

interface QBittorrentTorrent {
  hash: string
  name: string
  state: string
  progress: number
  size: number
  dlspeed: number
  upspeed: number
  eta: number
  added_on: number
}

async function handleQBittorrent(
  serviceUrl: string,
  password: string,
  username: string
): Promise<NextResponse> {
  const baseUrl = serviceUrl.replace(/\/$/, "")

  let loginRes: Response
  try {
    loginRes = await fetch(`${baseUrl}/api/v2/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to qBittorrent" },
      { status: 502 }
    )
  }

  const loginBody = await loginRes.text()
  if (loginBody !== "Ok.") {
    return NextResponse.json(
      { error: "qBittorrent login failed – check credentials" },
      { status: 401 }
    )
  }

  const setCookie = loginRes.headers.get("set-cookie") ?? ""
  const sidMatch = setCookie.match(/SID=([^;]+)/)
  const sid = sidMatch?.[1]
  if (!sid) {
    return NextResponse.json(
      { error: "qBittorrent did not return a session cookie" },
      { status: 502 }
    )
  }

  let torrentsRes: Response
  try {
    torrentsRes = await fetch(`${baseUrl}/api/v2/torrents/info?filter=all`, {
      headers: { Cookie: `SID=${sid}` },
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch torrents from qBittorrent" },
      { status: 502 }
    )
  }

  if (!torrentsRes.ok) {
    return NextResponse.json(
      { error: `qBittorrent returned ${torrentsRes.status}` },
      { status: torrentsRes.status }
    )
  }

  const torrents = (await torrentsRes.json()) as QBittorrentTorrent[]

  const items: DownloadItem[] = torrents.map((t) => ({
    id: t.hash,
    name: t.name,
    status: mapQBittorrentState(t.state),
    progressPercent: t.progress * 100,
    sizeTotal: t.size,
    sizeRemaining: t.size * (1 - t.progress),
    downloadSpeed: t.dlspeed,
    uploadSpeed: t.upspeed,
    eta: formatEta(t.eta),
    addedAt: new Date(t.added_on * 1000).toISOString(),
  }))

  const totalDlSpeed = torrents.reduce((acc, t) => acc + t.dlspeed, 0)
  const activeCount = items.filter(
    (i) => i.status === "downloading" || i.status === "stalled"
  ).length

  const summary: DownloadSummary = {
    totalSpeed: `${formatBytes(totalDlSpeed)}/s`,
    totalItems: items.length,
    activeItems: activeCount,
  }

  return NextResponse.json(
    { items, summary, serviceType: "qbittorrent" } satisfies DownloadClientResponse,
    { headers: { "Cache-Control": "no-store" } }
  )
}

interface SabnzbdSlot {
  nzo_id: string
  filename: string
  status: string
  percentage: string
  mb: number
  mbleft: number
  timeleft: string
}

interface SabnzbdQueueResponse {
  queue: {
    speed: string
    slots: SabnzbdSlot[]
  }
}

interface SabnzbdHistorySlot {
  nzo_id: string
  name: string
  status: string
  bytes: number
  completed: number
}

interface SabnzbdHistoryResponse {
  history: {
    slots: SabnzbdHistorySlot[]
  }
}

function mapSabnzbdStatus(status: string): DownloadItem["status"] {
  switch (status) {
    case "Downloading":
      return "downloading"
    case "Paused":
      return "paused"
    case "Queued":
      return "queued"
    case "Completed":
      return "completed"
    case "Failed":
      return "failed"
    default:
      return "queued"
  }
}

async function handleSabnzbd(
  serviceUrl: string,
  apiKey: string,
  showCompleted: boolean
): Promise<NextResponse> {
  const queueResult = await fetchService<SabnzbdQueueResponse>({
    baseUrl: serviceUrl,
    apiKey,
    endpoint: "/api",
    authType: "query-apikey",
    queryParams: { mode: "queue", output: "json" },
  })

  if (!queueResult.ok) {
    return NextResponse.json(
      { error: queueResult.error },
      { status: queueResult.status ?? 502 }
    )
  }

  const queue = queueResult.data.queue
  const items: DownloadItem[] = queue.slots.map((slot) => ({
    id: slot.nzo_id,
    name: slot.filename,
    status: mapSabnzbdStatus(slot.status),
    progressPercent: parseFloat(slot.percentage),
    sizeTotal: slot.mb * 1024 * 1024,
    sizeRemaining: slot.mbleft * 1024 * 1024,
    downloadSpeed: 0,
    eta: slot.timeleft,
  }))

  if (showCompleted) {
    const historyResult = await fetchService<SabnzbdHistoryResponse>({
      baseUrl: serviceUrl,
      apiKey,
      endpoint: "/api",
      authType: "query-apikey",
      queryParams: { mode: "history", output: "json", limit: "10" },
    })

    if (historyResult.ok) {
      for (const slot of historyResult.data.history.slots) {
        items.push({
          id: slot.nzo_id,
          name: slot.name,
          status: slot.status === "Failed" ? "failed" : "completed",
          progressPercent: slot.status === "Failed" ? 0 : 100,
          sizeTotal: slot.bytes,
          sizeRemaining: 0,
          downloadSpeed: 0,
          eta: "",
          addedAt: slot.completed
            ? new Date(slot.completed * 1000).toISOString()
            : undefined,
        })
      }
    }
  }

  const activeCount = items.filter((i) => i.status === "downloading").length
  const summary: DownloadSummary = {
    totalSpeed: queue.speed ? queue.speed : "0 B/s",
    totalItems: items.length,
    activeItems: activeCount,
  }

  return NextResponse.json(
    { items, summary, serviceType: "sabnzbd" } satisfies DownloadClientResponse,
    { headers: { "Cache-Control": "no-store" } }
  )
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
  const serviceUrl = (config?.serviceUrl as string) ?? ""
  const secretName = (config?.secretName as string) ?? ""

  if (!serviceUrl || !secretName || !serviceType) {
    return NextResponse.json(
      { error: "Widget is not configured" },
      { status: 400 }
    )
  }

  const secret = resolveSecret(secretName)
  if (!secret) {
    return NextResponse.json(
      { error: "Secret not found for download client" },
      { status: 400 }
    )
  }

  if (serviceType === "qbittorrent") {
    const username = (config?.username as string) ?? "admin"
    return handleQBittorrent(serviceUrl, secret, username)
  }

  if (serviceType === "sabnzbd") {
    const showCompleted = (config?.showCompleted as boolean) ?? false
    return handleSabnzbd(serviceUrl, secret, showCompleted)
  }

  return NextResponse.json(
    { error: `Unsupported service type: ${serviceType}` },
    { status: 400 }
  )
}
