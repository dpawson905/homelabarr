import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "@/app/api/widgets/helpers"
import { getServiceConnection, fetchService } from "@/lib/services/service-client"
import type { EntityState, HomeAssistantResponse, ServiceCallRequest } from "./types"

interface HaStateRaw {
  entity_id: string
  state: string
  attributes: {
    friendly_name?: string
    [key: string]: unknown
  }
  last_changed: string
}

const CONTROLLABLE_DOMAINS = new Set([
  "light",
  "switch",
  "fan",
  "cover",
  "lock",
  "media_player",
])

function mapEntity(raw: HaStateRaw): EntityState {
  const domain = raw.entity_id.split(".")[0]
  return {
    entityId: raw.entity_id,
    friendlyName: raw.attributes.friendly_name ?? raw.entity_id,
    state: raw.state,
    domain,
    lastChanged: raw.last_changed,
    attributes: raw.attributes,
    controllable: CONTROLLABLE_DOMAINS.has(domain),
  }
}

function resolveEntityIds(config: Record<string, unknown> | null): string[] {
  const raw = config?.entityIds
  if (!Array.isArray(raw)) return []
  return raw.filter((id): id is string => typeof id === "string")
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
      { error: "Home Assistant service not configured. Add a service URL and long-lived access token." },
      { status: 400 }
    )
  }

  const { serviceUrl, apiKey } = connection

  const statesResult = await fetchService<HaStateRaw[]>({
    baseUrl: serviceUrl,
    apiKey,
    endpoint: "/api/states",
    authType: "header-bearer",
  })

  if (!statesResult.ok) {
    return NextResponse.json(
      { error: statesResult.error },
      { status: statesResult.status ?? 502 }
    )
  }

  const entityIds = resolveEntityIds(config)

  let entities: EntityState[]

  if (entityIds.length === 0) {
    // No configured entities -- return first 20 so user can see what's available
    entities = statesResult.data.slice(0, 20).map(mapEntity)
  } else {
    const idSet = new Set(entityIds)
    entities = statesResult.data.filter((raw) => idSet.has(raw.entity_id)).map(mapEntity)
  }

  const response: HomeAssistantResponse = { entities }

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  })
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

  const config = widget.config as Record<string, unknown> | null
  const connection = getServiceConnection(config)

  if (!connection) {
    return NextResponse.json(
      { error: "Home Assistant service not configured." },
      { status: 400 }
    )
  }

  const { serviceUrl, apiKey } = connection

  let body: ServiceCallRequest
  try {
    body = (await request.json()) as ServiceCallRequest
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { entityId, domain, service } = body

  if (!entityId || !domain || !service) {
    return NextResponse.json(
      { error: "entityId, domain, and service are required" },
      { status: 400 }
    )
  }

  const serviceResult = await fetchService<unknown>({
    baseUrl: serviceUrl,
    apiKey,
    endpoint: `/api/services/${domain}/${service}`,
    authType: "header-bearer",
    method: "POST",
    body: { entity_id: entityId },
  })

  if (!serviceResult.ok) {
    return NextResponse.json(
      { error: serviceResult.error },
      { status: serviceResult.status ?? 502 }
    )
  }

  return NextResponse.json({ ok: true })
}
