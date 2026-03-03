import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "@/app/api/widgets/helpers"
import { getServiceConnection, fetchWithTls } from "@/lib/services/service-client"
import type { UnraidResponse } from "./types"

interface GraphQLDockerContainer {
  names: string[]
  state: string
}

interface GraphQLVm {
  domain: {
    name: string
    state: string
  }
}

interface GraphQLResponse {
  data: {
    info: {
      os: { uptime: number }
      cpu: { cores: number }
      memory: { total: number; used: number }
    }
    metrics: {
      cpu: { percentTotal: number }
      memory: { used: number; total: number }
    }
    array: {
      state: string
      capacity: {
        kilobytes: { free: number; used: number; total: number }
      }
      disks: { name: string; temp: number | null; numErrors: number; status: string }[]
    }
    dockerContainers: GraphQLDockerContainer[]
    vms: GraphQLVm[]
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
  const connection = getServiceConnection(config)

  if (!connection) {
    return NextResponse.json(
      { error: "Unraid service not configured. Add a service URL and API key." },
      { status: 400 }
    )
  }

  const { serviceUrl, apiKey } = connection

  const graphqlQuery = `{
    info { os { uptime } cpu { cores } memory { total used } }
    metrics { cpu { percentTotal } memory { used total } }
    array {
      state
      capacity { kilobytes { free used total } }
      disks { name temp numErrors status }
    }
    dockerContainers { names state }
    vms { domain { name state } }
  }`

  try {
    const res = await fetchWithTls(new URL("/graphql", serviceUrl).toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ query: graphqlQuery }),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Unraid API returned ${res.status}` },
        { status: res.status }
      )
    }

    const json = (await res.json()) as GraphQLResponse
    const { data } = json

    const containers = data.dockerContainers ?? []
    const runningContainers = containers.filter((c) => c.state === "running").length
    const stoppedContainers = containers.length - runningContainers

    const vms = data.vms ?? []
    const runningVms = vms.filter((v) => v.domain.state === "running").length
    const stoppedVms = vms.length - runningVms

    const kb = data.array.capacity.kilobytes

    const response: UnraidResponse = {
      arrayState: data.array.state,
      arrayUsed: kb.used * 1024,
      arrayTotal: kb.total * 1024,
      arrayFree: kb.free * 1024,
      cpuPercent: data.metrics.cpu.percentTotal,
      memoryUsed: data.metrics.memory.used,
      memoryTotal: data.metrics.memory.total,
      disks: data.array.disks.map((d) => ({
        name: d.name,
        temp: d.temp,
        numErrors: d.numErrors,
        status: d.status,
      })),
      containers: {
        running: runningContainers,
        stopped: stoppedContainers,
        total: containers.length,
      },
      vms: {
        running: runningVms,
        stopped: stoppedVms,
        total: vms.length,
      },
      uptime: data.info.os.uptime,
    }

    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      return NextResponse.json(
        { error: "Unraid request timed out" },
        { status: 504 }
      )
    }
    return NextResponse.json(
      { error: "Failed to connect to Unraid" },
      { status: 502 }
    )
  }
}
