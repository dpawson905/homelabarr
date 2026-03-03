import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "../helpers"
import { fetchWithTls } from "@/lib/services/service-client"
import type { ScrutinyDrive, ScrutinyResponse } from "./types"

const DEVICE_TYPE_MAP: Record<number, string> = {
  0: "ATA",
  1: "NVME",
  2: "SCSI",
}

function mapStatus(deviceStatus: number | null | undefined): ScrutinyDrive["status"] {
  if (deviceStatus == null) return "unknown"
  return deviceStatus === 0 ? "passed" : "failed"
}

function extractTemperature(device: Record<string, unknown>): number | null {
  // Try temp field first (from summary endpoint)
  const temp = device.temp as number | undefined
  if (typeof temp === "number" && temp > 0) return temp

  return null
}

function extractPowerOnHours(
  smartAttrs: Record<string, unknown> | null | undefined
): number | null {
  if (!smartAttrs) return null

  // smart.attrs is typically a map of attribute ID -> attribute data
  // Power-on hours is attribute ID 9
  const attrs = smartAttrs as Record<
    string,
    { attribute_id?: number; raw_value?: number; transformed_value?: number }
  >

  for (const attr of Object.values(attrs)) {
    if (attr?.attribute_id === 9) {
      if (typeof attr.raw_value === "number") return attr.raw_value
      if (typeof attr.transformed_value === "number") return attr.transformed_value
    }
  }

  return null
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
  const serviceUrl = (config?.serviceUrl as string) ?? ""

  if (!serviceUrl) {
    return NextResponse.json(
      { error: "serviceUrl is not configured" },
      { status: 400 }
    )
  }

  try {
    const baseUrl = serviceUrl.replace(/\/+$/, "")

    const res = await fetchWithTls(`${baseUrl}/api/summary`)

    if (!res.ok) {
      throw new Error(
        `Scrutiny API request failed: ${res.status} ${res.statusText}`
      )
    }

    const json = (await res.json()) as Record<string, Record<string, unknown>> | undefined

    // Scrutiny summary endpoint returns:
    // { data: { summary: { [device_wwn]: { device: {...}, smart: {...}, temp: ... } } } }
    const summary = (json as { data?: { summary?: Record<string, Record<string, unknown>> } })?.data?.summary as
      | Record<string, Record<string, unknown>>
      | undefined

    const drives: ScrutinyDrive[] = []

    if (summary) {
      for (const entry of Object.values(summary)) {
        const device = (entry.device ?? {}) as Record<string, unknown>
        const smart = (entry.smart ?? null) as Record<string, unknown> | null

        const deviceTypeRaw =
          typeof device.device_type === "number" ? device.device_type : null

        drives.push({
          deviceName: (device.device_name as string) ?? "Unknown",
          modelName: (device.model_name as string) ?? "Unknown",
          deviceType:
            deviceTypeRaw != null
              ? DEVICE_TYPE_MAP[deviceTypeRaw] ?? "Unknown"
              : "Unknown",
          status: mapStatus(device.device_status as number | null | undefined),
          temperature: extractTemperature(entry as Record<string, unknown>),
          powerOnHours: extractPowerOnHours(
            smart?.attrs as Record<string, unknown> | null | undefined
          ),
          capacity: typeof device.capacity === "number" ? device.capacity : 0,
        })
      }
    }

    // Sort drives by name for consistent ordering
    drives.sort((a, b) => a.deviceName.localeCompare(b.deviceName))

    const result: ScrutinyResponse = {
      drives,
      summary: {
        total: drives.length,
        passed: drives.filter((d) => d.status === "passed").length,
        failed: drives.filter((d) => d.status === "failed").length,
      },
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch Scrutiny data"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
