import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "@/app/api/widgets/helpers"
import { getServiceConnection, fetchService } from "@/lib/services/service-client"
import type { FirewallResponse } from "./types"

// ---------- OPNsense raw response types ----------

interface OPNsenseSystemStatus {
  CpuUsage: string // e.g. "5%"
  MemoryUsage: string // e.g. "45%"
  Uptime: string // e.g. "1 day 05:23:11"
}

interface OPNsenseFirmwareStatus {
  product_version: string
  upgrade_needs_reboot: string
  status: string // "update" when available, "none" otherwise
  status_msg: string
}

interface OPNsenseGatewayItem {
  name: string
  address: string
  status_translated: string
  status: string
}

interface OPNsenseGatewayResponse {
  items: OPNsenseGatewayItem[]
}

// ---------- pfSense raw response types ----------

interface PfSenseSystemInfo {
  data: {
    cpu_usage: number
    mem_usage: number
    uptime: string // e.g. "1 day 05:23:11"
    hostname: string
    version: string
  }
}

interface PfSenseGateway {
  name: string
  status: string
  monitorip: string
}

interface PfSenseGatewayResponse {
  data: PfSenseGateway[]
}

// ---------- Helpers ----------

function parsePercentage(value: string): number {
  const num = parseFloat(value.replace("%", "").trim())
  return Number.isFinite(num) ? num : 0
}

function parseUptimeToSeconds(uptime: string): number {
  let total = 0

  const dayMatch = uptime.match(/(\d+)\s*day/)
  if (dayMatch) total += parseInt(dayMatch[1], 10) * 86400

  const timeMatch = uptime.match(/(\d+):(\d+):(\d+)/)
  if (timeMatch) {
    total += parseInt(timeMatch[1], 10) * 3600
    total += parseInt(timeMatch[2], 10) * 60
    total += parseInt(timeMatch[3], 10)
  }

  return total
}

// ---------- OPNsense handler ----------

async function handleOPNsense(
  serviceUrl: string,
  apiKey: string
): Promise<NextResponse> {
  const [statusResult, firmwareResult, gatewayResult] = await Promise.all([
    fetchService<OPNsenseSystemStatus>({
      baseUrl: serviceUrl,
      apiKey,
      endpoint: "/api/core/system/status",
      authType: "header-basic-auth",
    }),
    fetchService<OPNsenseFirmwareStatus>({
      baseUrl: serviceUrl,
      apiKey,
      endpoint: "/api/core/firmware/status",
      authType: "header-basic-auth",
    }),
    fetchService<OPNsenseGatewayResponse>({
      baseUrl: serviceUrl,
      apiKey,
      endpoint: "/api/routes/gateway/status",
      authType: "header-basic-auth",
    }),
  ])

  if (!statusResult.ok) {
    return NextResponse.json(
      { error: statusResult.error },
      { status: statusResult.status ?? 502 }
    )
  }

  const sys = statusResult.data
  const cpuUsage = parsePercentage(sys.CpuUsage ?? "0")
  const memoryUsage = parsePercentage(sys.MemoryUsage ?? "0")
  const uptimeSeconds = parseUptimeToSeconds(sys.Uptime ?? "")

  // Firmware
  const firmwareVersion = firmwareResult.ok
    ? firmwareResult.data.product_version ?? "unknown"
    : "unknown"
  const firmwareNeedsUpdate = firmwareResult.ok
    ? firmwareResult.data.status === "update"
    : false

  // Gateway
  let wanStatus: FirewallResponse["wanStatus"] = "unknown"
  let gatewayStatus = "unknown"
  let activeStates = 0

  if (gatewayResult.ok && gatewayResult.data.items?.length > 0) {
    const primary = gatewayResult.data.items[0]
    gatewayStatus = primary.status_translated ?? primary.status ?? "unknown"
    if (
      gatewayStatus.toLowerCase().includes("online") ||
      primary.status === "force_up"
    ) {
      wanStatus = "up"
    } else if (gatewayStatus.toLowerCase().includes("down")) {
      wanStatus = "down"
    }
  }

  // Extract hostname from the service URL
  let hostname = ""
  try {
    hostname = new URL(serviceUrl).hostname
  } catch {
    hostname = serviceUrl
  }

  const response: FirewallResponse = {
    serviceType: "opnsense",
    hostname,
    cpuUsage,
    memoryUsage,
    uptimeSeconds,
    activeStates,
    wanStatus,
    gatewayStatus,
    firmwareNeedsUpdate,
    firmwareVersion,
  }

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  })
}

// ---------- pfSense handler ----------

async function handlePfSense(
  serviceUrl: string,
  apiKey: string
): Promise<NextResponse> {
  const [systemResult, gatewayResult] = await Promise.all([
    fetchService<PfSenseSystemInfo>({
      baseUrl: serviceUrl,
      apiKey,
      endpoint: "/api/v1/status/system",
      authType: "header-basic-auth",
    }),
    fetchService<PfSenseGatewayResponse>({
      baseUrl: serviceUrl,
      apiKey,
      endpoint: "/api/v1/status/gateway",
      authType: "header-basic-auth",
    }),
  ])

  if (!systemResult.ok) {
    return NextResponse.json(
      { error: systemResult.error },
      { status: systemResult.status ?? 502 }
    )
  }

  const sys = systemResult.data.data ?? systemResult.data
  const cpuUsage =
    typeof (sys as Record<string, unknown>).cpu_usage === "number"
      ? (sys as Record<string, unknown>).cpu_usage as number
      : 0
  const memoryUsage =
    typeof (sys as Record<string, unknown>).mem_usage === "number"
      ? (sys as Record<string, unknown>).mem_usage as number
      : 0
  const uptimeStr =
    typeof (sys as Record<string, unknown>).uptime === "string"
      ? (sys as Record<string, unknown>).uptime as string
      : ""
  const uptimeSeconds = parseUptimeToSeconds(uptimeStr)
  const hostname =
    typeof (sys as Record<string, unknown>).hostname === "string"
      ? (sys as Record<string, unknown>).hostname as string
      : ""
  const firmwareVersion =
    typeof (sys as Record<string, unknown>).version === "string"
      ? (sys as Record<string, unknown>).version as string
      : "unknown"

  // Gateway
  let wanStatus: FirewallResponse["wanStatus"] = "unknown"
  let gatewayStatus = "unknown"

  if (gatewayResult.ok) {
    const gateways = gatewayResult.data.data ?? []
    if (gateways.length > 0) {
      const primary = gateways[0]
      gatewayStatus = primary.status ?? "unknown"
      if (gatewayStatus.toLowerCase().includes("online")) {
        wanStatus = "up"
      } else if (gatewayStatus.toLowerCase().includes("down")) {
        wanStatus = "down"
      }
    }
  }

  const response: FirewallResponse = {
    serviceType: "pfsense",
    hostname: hostname || new URL(serviceUrl).hostname,
    cpuUsage,
    memoryUsage,
    uptimeSeconds,
    activeStates: 0,
    wanStatus,
    gatewayStatus,
    firmwareNeedsUpdate: false,
    firmwareVersion,
  }

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  })
}

// ---------- GET handler ----------

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

  if (serviceType !== "opnsense" && serviceType !== "pfsense") {
    return NextResponse.json(
      { error: "Invalid or missing serviceType in widget config" },
      { status: 400 }
    )
  }

  const connection = getServiceConnection(config)
  if (!connection) {
    return NextResponse.json(
      { error: "Widget is not configured -- URL or secret missing" },
      { status: 400 }
    )
  }

  const { serviceUrl, apiKey } = connection

  if (serviceType === "opnsense") {
    return handleOPNsense(serviceUrl, apiKey)
  }

  return handlePfSense(serviceUrl, apiKey)
}
