import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "../helpers"
import { fetchWithTls } from "@/lib/services/service-client"
import type {
  ServerConfig,
  ServerPowerResponse,
  ServerStatus,
  ServerPowerActionRequest,
} from "./types"

function parseServers(config: Record<string, unknown> | null): ServerConfig[] {
  if (!config || !Array.isArray(config.servers)) return []
  return config.servers as ServerConfig[]
}

async function checkServerStatus(server: ServerConfig): Promise<ServerStatus> {
  if (!server.statusUrl) {
    return { name: server.name, online: null, icon: server.icon }
  }
  try {
    const res = await fetchWithTls(server.statusUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    })
    return { name: server.name, online: res.ok, icon: server.icon }
  } catch {
    return { name: server.name, online: false, icon: server.icon }
  }
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
  const servers = parseServers(config)
  if (servers.length === 0) {
    return NextResponse.json(
      { servers: [] } satisfies ServerPowerResponse,
      { headers: { "Cache-Control": "no-store" } }
    )
  }
  const statuses = await Promise.all(servers.map(checkServerStatus))
  return NextResponse.json(
    { servers: statuses } satisfies ServerPowerResponse,
    { headers: { "Cache-Control": "no-store" } }
  )
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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
  const body: ServerPowerActionRequest = await request.json()
  const { serverName, action } = body
  if (!serverName || !action || !["on", "off"].includes(action)) {
    return NextResponse.json(
      { error: "Invalid request. Requires serverName and action (on/off)" },
      { status: 400 }
    )
  }
  const config = widget.config as Record<string, unknown> | null
  const servers = parseServers(config)
  const server = servers.find((s) => s.name === serverName)
  if (!server) {
    return NextResponse.json(
      { error: `Server "${serverName}" not found in config` },
      { status: 404 }
    )
  }
  try {
    const res = await fetchWithTls(server.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ server: serverName, action }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "Unknown error")
      return NextResponse.json(
        { success: false, serverName, action, message: text },
        { status: 502 }
      )
    }
    return NextResponse.json({ success: true, serverName, action })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook request failed"
    return NextResponse.json(
      { success: false, serverName, action, message },
      { status: 502 }
    )
  }
}
