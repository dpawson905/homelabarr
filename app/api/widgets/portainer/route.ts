import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "@/app/api/widgets/helpers"
import { getServiceConnection, fetchService } from "@/lib/services/service-client"
import type { PortainerEnvironment, PortainerResponse } from "./types"

interface PortainerEndpointRaw {
  Id: number
  Name: string
  Status: number
  Type: number
}

interface PortainerContainerRaw {
  Id: string
  State: string
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
      { error: "Portainer service not configured. Add a service URL and API key." },
      { status: 400 }
    )
  }

  const { serviceUrl, apiKey } = connection
  const environmentId = (config?.environmentId as string) ?? ""

  // Fetch all environments (endpoints)
  const endpointsResult = await fetchService<PortainerEndpointRaw[]>({
    baseUrl: serviceUrl,
    apiKey,
    endpoint: "/api/endpoints",
    authType: "header-x-api-key",
  })

  if (!endpointsResult.ok) {
    return NextResponse.json(
      { error: endpointsResult.error },
      { status: endpointsResult.status ?? 502 }
    )
  }

  const rawEndpoints = endpointsResult.data ?? []
  const environments: PortainerEnvironment[] = rawEndpoints.map((ep) => ({
    id: ep.Id,
    name: ep.Name,
    status: ep.Status,
    type: ep.Type,
  }))

  let containers = { running: 0, stopped: 0, total: 0 }

  // If environmentId is set, fetch container details for that environment
  if (environmentId) {
    const containersResult = await fetchService<PortainerContainerRaw[]>({
      baseUrl: serviceUrl,
      apiKey,
      endpoint: `/api/endpoints/${environmentId}/docker/containers/json`,
      authType: "header-x-api-key",
      queryParams: { all: "true" },
    })

    if (containersResult.ok) {
      const rawContainers = containersResult.data ?? []
      const running = rawContainers.filter((c) => c.State === "running").length
      const total = rawContainers.length
      containers = { running, stopped: total - running, total }
    }
  }

  const response: PortainerResponse = {
    environments,
    containers,
  }

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  })
}
