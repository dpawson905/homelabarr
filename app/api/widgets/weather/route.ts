import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "@/app/api/widgets/helpers"
import { resolveSecret } from "@/lib/services/service-client"
import type {
  WeatherResponse,
  ForecastDay,
  OWMCurrentResponse,
  OWMForecastResponse,
  OWMAirPollutionResponse,
} from "./types"

const OWM_BASE = "https://api.openweathermap.org/data/2.5"

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl
  const widgetId = searchParams.get("widgetId")

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
  const lat = config?.latitude as number | undefined
  const lon = config?.longitude as number | undefined
  const secretName = config?.secretName as string | undefined
  const units = (config?.units as string) ?? "imperial"

  if (typeof lat !== "number" || typeof lon !== "number") {
    return NextResponse.json(
      { error: "Weather widget not configured. Set a location." },
      { status: 400 }
    )
  }

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
    const params = `lat=${lat}&lon=${lon}&appid=${apiKey}&units=${units}`

    const [currentRes, forecastRes, pollutionRes] = await Promise.all([
      fetch(`${OWM_BASE}/weather?${params}`, {
        signal: AbortSignal.timeout(10_000),
      }),
      fetch(`${OWM_BASE}/forecast?${params}`, {
        signal: AbortSignal.timeout(10_000),
      }),
      fetch(`${OWM_BASE}/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`, {
        signal: AbortSignal.timeout(10_000),
      }),
    ])

    if (!currentRes.ok) {
      return NextResponse.json(
        { error: `OpenWeatherMap API error: ${currentRes.status}` },
        { status: 502 }
      )
    }

    const current: OWMCurrentResponse = await currentRes.json()

    // Aggregate 3-hour forecast into daily hi/lo
    let forecast: ForecastDay[] = []
    if (forecastRes.ok) {
      try {
        const forecastData: OWMForecastResponse = await forecastRes.json()
        forecast = aggregateForecast(forecastData, current.timezone)
      } catch {
        // Forecast is optional
      }
    }

    // Air quality
    let airQuality: WeatherResponse["airQuality"] = null
    if (pollutionRes.ok) {
      try {
        const pollutionData: OWMAirPollutionResponse = await pollutionRes.json()
        const entry = pollutionData.list?.[0]
        if (entry) {
          airQuality = {
            aqi: entry.main.aqi,
            pm2_5: Math.round(entry.components.pm2_5 * 10) / 10,
            pm10: Math.round(entry.components.pm10 * 10) / 10,
            o3: Math.round(entry.components.o3 * 10) / 10,
            no2: Math.round(entry.components.no2 * 10) / 10,
          }
        }
      } catch {
        // Air quality is optional
      }
    }

    const weather = current.weather[0]

    const response: WeatherResponse = {
      location: {
        name: current.name,
        country: current.sys.country,
        lat: current.coord.lat,
        lon: current.coord.lon,
      },
      current: {
        temp: Math.round(current.main.temp),
        feelsLike: Math.round(current.main.feels_like),
        tempMin: Math.round(current.main.temp_min),
        tempMax: Math.round(current.main.temp_max),
        humidity: current.main.humidity,
        pressure: current.main.pressure,
        visibility: current.visibility,
        windSpeed: Math.round(current.wind.speed * 10) / 10,
        windDeg: current.wind.deg,
        windGust: current.wind.gust
          ? Math.round(current.wind.gust * 10) / 10
          : undefined,
        clouds: current.clouds.all,
        description: weather?.description ?? "",
        icon: weather?.icon ?? "01d",
        conditionId: weather?.id ?? 800,
        sunrise: current.sys.sunrise,
        sunset: current.sys.sunset,
        dt: current.dt,
      },
      airQuality,
      forecast,
    }

    return NextResponse.json(response, {
      headers: { "Cache-Control": "public, max-age=600" },
    })
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to OpenWeatherMap" },
      { status: 502 }
    )
  }
}

/**
 * Aggregate 3-hour forecast entries into daily summaries.
 * Groups by date in the location's timezone, picks max/min temp,
 * the most common weather condition, and the highest precipitation probability.
 */
function aggregateForecast(
  data: OWMForecastResponse,
  timezoneOffset: number
): ForecastDay[] {
  const dayMap = new Map<
    string,
    {
      temps: number[]
      pops: number[]
      icons: Map<string, number>
      conditionIds: Map<number, number>
      descriptions: Map<string, number>
    }
  >()

  for (const entry of data.list) {
    // Convert to local date string
    const localDate = new Date((entry.dt + timezoneOffset) * 1000)
    const dateStr = localDate.toISOString().split("T")[0]

    let day = dayMap.get(dateStr)
    if (!day) {
      day = {
        temps: [],
        pops: [],
        icons: new Map(),
        conditionIds: new Map(),
        descriptions: new Map(),
      }
      dayMap.set(dateStr, day)
    }

    day.temps.push(entry.main.temp_min, entry.main.temp_max)
    day.pops.push(entry.pop)

    const w = entry.weather[0]
    if (w) {
      day.icons.set(w.icon, (day.icons.get(w.icon) ?? 0) + 1)
      day.conditionIds.set(w.id, (day.conditionIds.get(w.id) ?? 0) + 1)
      day.descriptions.set(
        w.description,
        (day.descriptions.get(w.description) ?? 0) + 1
      )
    }
  }

  // Skip today, take next 5 days
  const today = new Date(
    (Math.floor(Date.now() / 1000) + timezoneOffset) * 1000
  )
    .toISOString()
    .split("T")[0]

  const result: ForecastDay[] = []
  for (const [dateStr, day] of dayMap) {
    if (dateStr === today) continue
    if (result.length >= 5) break

    const mostCommon = <T>(map: Map<T, number>): T =>
      [...map.entries()].sort((a, b) => b[1] - a[1])[0][0]

    result.push({
      date: dateStr,
      tempHigh: Math.round(Math.max(...day.temps)),
      tempLow: Math.round(Math.min(...day.temps)),
      icon: mostCommon(day.icons),
      conditionId: mostCommon(day.conditionIds),
      description: mostCommon(day.descriptions),
      pop: Math.round(Math.max(...day.pops) * 100),
    })
  }

  return result
}
