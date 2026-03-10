import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "@/app/api/widgets/helpers"
import { resolveSecret } from "@/lib/services/service-client"
import type { OWMGeocodingResult } from "../types"

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl
  const query = searchParams.get("q")
  const widgetId = searchParams.get("widgetId")

  if (!query || !widgetId) {
    return NextResponse.json(
      { error: "Missing required parameters: q, widgetId" },
      { status: 400 }
    )
  }

  const widget = getWidgetWithConfig(widgetId)
  if (!widget) {
    return NextResponse.json({ error: "Widget not found" }, { status: 404 })
  }

  const config = widget.config as Record<string, unknown> | null
  const secretName = config?.secretName as string | undefined

  if (!secretName) {
    return NextResponse.json(
      { error: "API key not configured. Add your OpenWeatherMap API key secret first." },
      { status: 400 }
    )
  }

  const apiKey = resolveSecret(secretName)
  if (!apiKey) {
    return NextResponse.json(
      { error: "API key secret not found. Create the required secret in Settings." },
      { status: 400 }
    )
  }

  try {
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${apiKey}`
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Geocoding API error: ${res.status}` },
        { status: 502 }
      )
    }

    const data: OWMGeocodingResult[] = await res.json()

    const results = data.map((r) => ({
      name: r.name,
      state: r.state,
      country: r.country,
      lat: Math.round(r.lat * 10000) / 10000,
      lon: Math.round(r.lon * 10000) / 10000,
    }))

    return NextResponse.json(results)
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to geocoding service" },
      { status: 502 }
    )
  }
}
