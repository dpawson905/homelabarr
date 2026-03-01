import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl

  const latStr = searchParams.get("lat")
  const lonStr = searchParams.get("lon")
  const unit = searchParams.get("unit")

  if (!latStr || !lonStr) {
    return NextResponse.json(
      { error: "Missing required query parameters: lat and lon" },
      { status: 400 }
    )
  }

  const lat = Number(latStr)
  const lon = Number(lonStr)

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json(
      { error: "lat and lon must be valid numbers" },
      { status: 400 }
    )
  }

  const temperatureUnit = unit === "fahrenheit" ? "fahrenheit" : "celsius"

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&temperature_unit=${temperatureUnit}&timezone=auto&forecast_days=5`

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch weather data" },
        { status: 502 }
      )
    }

    const data = await response.json()

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=600" },
    })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 502 }
    )
  }
}
