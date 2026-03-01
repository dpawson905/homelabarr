import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "@/app/api/widgets/helpers"
import { getServiceConnection, fetchService } from "@/lib/services/service-client"
import type { ProxmoxNode, ProxmoxGuest, ProxmoxResponse } from "./types"

interface ProxmoxNodeRaw {
  node: string
  status: string
  cpu: number
  maxcpu: number
  mem: number
  maxmem: number
  uptime: number
  id: string
}

interface ProxmoxGuestRaw {
  vmid: number
  name: string
  status: string
  cpu: number
  cpus: number
  mem: number
  maxmem: number
  uptime: number
}

function mapNode(raw: ProxmoxNodeRaw): ProxmoxNode {
  return {
    id: raw.id ?? raw.node,
    name: raw.node,
    status: raw.status === "online" ? "online" : "offline",
    cpuUsage: raw.cpu * 100,
    memUsage: raw.maxmem > 0 ? (raw.mem / raw.maxmem) * 100 : 0,
    memTotal: raw.maxmem,
    uptime: raw.uptime,
  }
}

function mapGuestStatus(raw: string): ProxmoxGuest["status"] {
  if (raw === "running") return "running"
  if (raw === "paused") return "paused"
  return "stopped"
}

function mapGuest(
  raw: ProxmoxGuestRaw,
  nodeName: string,
  guestType: "qemu" | "lxc"
): ProxmoxGuest {
  const status = mapGuestStatus(raw.status)
  const isActive = status === "running" || status === "paused"
  const fallbackName = guestType === "qemu" ? `VM ${raw.vmid}` : `CT ${raw.vmid}`

  return {
    vmid: raw.vmid,
    name: raw.name ?? fallbackName,
    node: nodeName,
    type: guestType,
    status,
    cpuUsage: isActive ? raw.cpu * 100 : 0,
    memUsage: isActive && raw.maxmem > 0 ? (raw.mem / raw.maxmem) * 100 : 0,
    memTotal: raw.maxmem,
    uptime: raw.uptime,
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
      { error: "Proxmox service not configured. Add a service URL and API token." },
      { status: 400 }
    )
  }

  const { serviceUrl, apiKey } = connection

  const nodesResult = await fetchService<{ data: ProxmoxNodeRaw[] }>({
    baseUrl: serviceUrl,
    apiKey,
    endpoint: "/api2/json/nodes",
    authType: "header-pve-token",
  })

  if (!nodesResult.ok) {
    return NextResponse.json(
      { error: nodesResult.error },
      { status: nodesResult.status ?? 502 }
    )
  }

  const rawNodes = nodesResult.data.data ?? []
  const nodes: ProxmoxNode[] = rawNodes.map(mapNode)
  const onlineNodes = rawNodes.filter((n) => n.status === "online")

  const guestsByNode = await Promise.all(
    onlineNodes.map(async (node) => {
      const [qemuResult, lxcResult] = await Promise.all([
        fetchService<{ data: ProxmoxGuestRaw[] }>({
          baseUrl: serviceUrl,
          apiKey,
          endpoint: `/api2/json/nodes/${node.node}/qemu`,
          authType: "header-pve-token",
        }),
        fetchService<{ data: ProxmoxGuestRaw[] }>({
          baseUrl: serviceUrl,
          apiKey,
          endpoint: `/api2/json/nodes/${node.node}/lxc`,
          authType: "header-pve-token",
        }),
      ])

      const nodeGuests: ProxmoxGuest[] = []

      if (qemuResult.ok) {
        for (const vm of qemuResult.data.data ?? []) {
          nodeGuests.push(mapGuest(vm, node.node, "qemu"))
        }
      }

      if (lxcResult.ok) {
        for (const ct of lxcResult.data.data ?? []) {
          nodeGuests.push(mapGuest(ct, node.node, "lxc"))
        }
      }

      return nodeGuests
    })
  )

  const guests = guestsByNode.flat()

  const response: ProxmoxResponse = {
    nodes,
    guests,
    summary: {
      totalNodes: nodes.length,
      onlineNodes: nodes.filter((n) => n.status === "online").length,
      totalGuests: guests.length,
      runningGuests: guests.filter((g) => g.status === "running").length,
    },
  }

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  })
}
