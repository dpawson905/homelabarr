import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "../helpers"
import type { FrigateCamera, FrigateResponse } from "./types"

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

  const baseUrl = serviceUrl.replace(/\/+$/, "")

  try {
    const [statsRes, eventsRes] = await Promise.all([
      fetch(`${baseUrl}/api/stats`, {
        signal: AbortSignal.timeout(10_000),
      }),
      fetch(`${baseUrl}/api/events/summary`, {
        signal: AbortSignal.timeout(10_000),
      }),
    ])

    if (!statsRes.ok) {
      throw new Error(
        `Stats request failed: ${statsRes.status} ${statsRes.statusText}`
      )
    }

    if (!eventsRes.ok) {
      throw new Error(
        `Events request failed: ${eventsRes.status} ${eventsRes.statusText}`
      )
    }

    const statsData = await statsRes.json()
    const eventsData: { camera: string; label: string; zones: string[]; day: string; count: number }[] =
      await eventsRes.json()

    // Map cameras from stats
    const cameras: FrigateCamera[] = (Object.entries(
      statsData.cameras ?? {}
    ) as [string, Record<string, unknown>][]).map(([name, cam]) => ({
      name,
      fps: (cam.camera_fps as number) ?? 0,
      detectionFps: (cam.detection_fps as number) ?? 0,
      processId: (cam.pid as number) ?? null,
    }))

    // Map detectors from stats
    const detectors = (Object.entries(statsData.detectors ?? {}) as [string, Record<string, unknown>][]).map(
      ([name, det]) => ({
        name,
        inferenceSpeed: (det.inference_speed as number) ?? 0,
        pid: (det.pid as number) ?? 0,
      })
    )

    // Calculate total detections for today
    const today = new Date().toISOString().split("T")[0]
    const totalDetections = eventsData
      .filter((e) => e.day === today)
      .reduce((sum, e) => sum + (e.count ?? 0), 0)

    const result: FrigateResponse = {
      cameras,
      totalDetections,
      uptimeSeconds: (statsData.service?.uptime as number) ?? 0,
      version: (statsData.service?.version as string) ?? "unknown",
      detectors,
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch Frigate data"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
