import { NextRequest, NextResponse } from "next/server"
import { getWidgetWithConfig } from "@/app/api/widgets/helpers"
import { resolveSecret } from "@/lib/services/service-client"
import type {
  WeatherResponse,
  TempestObservationResponse,
  TempestForecastResponse,
  ForecastDay,
} from "./types"

const TEMPEST_API = "https://swd.weatherflow.com/swd/rest"

function cToF(c: number): number {
  return Math.round((c * 9) / 5 + 32)
}

function msToMph(ms: number): number {
  return Math.round(ms * 2.237 * 10) / 10
}

function mbToInHg(mb: number): number {
  return Math.round(mb * 0.02953 * 100) / 100
}

function mmToIn(mm: number): number {
  return Math.round(mm * 0.03937 * 100) / 100
}

function deriveWeatherCode(obs: {
  precip_accum_local_day: number
  lightning_strike_count_last_3hr: number
  solar_radiation: number
  wind_avg: number
}): number {
  if (obs.lightning_strike_count_last_3hr > 0) return 95 // thunderstorm
  if (obs.precip_accum_local_day > 10) return 63 // moderate rain
  if (obs.precip_accum_local_day > 0) return 51 // light drizzle
  if (obs.solar_radiation === 0 && obs.wind_avg < 1) return 0 // clear/night
  if (obs.solar_radiation > 500) return 0 // clear sky
  if (obs.solar_radiation > 200) return 2 // partly cloudy
  return 3 // overcast
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl

  // Support both legacy (lat/lon) and Tempest (widgetId) modes
  const widgetId = searchParams.get("widgetId")
  const legacyLat = searchParams.get("lat")

  // Legacy Open-Meteo mode for backwards compatibility
  if (legacyLat && !widgetId) {
    return handleLegacy(searchParams)
  }

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
  const stationId = config?.stationId as number | undefined
  const secretName = config?.secretName as string | undefined

  if (
    typeof stationId !== "number" ||
    !Number.isInteger(stationId) ||
    stationId <= 0 ||
    !secretName
  ) {
    return NextResponse.json(
      { error: "Weather widget not configured. Add a valid station ID and API token." },
      { status: 400 }
    )
  }

  const token = resolveSecret(secretName)
  if (!token) {
    return NextResponse.json(
      { error: "Weather widget API token not found. Create the required secret in Settings." },
      { status: 400 }
    )
  }

  try {
    // Fetch observations and forecast in parallel
    const [obsRes, forecastRes] = await Promise.all([
      fetch(`${TEMPEST_API}/observations/station/${stationId}?token=${token}`, {
        signal: AbortSignal.timeout(10_000),
      }),
      fetch(
        `${TEMPEST_API}/better_forecast?station_id=${stationId}&token=${token}&units_temp=f&units_wind=mph&units_pressure=inhg&units_precip=in&units_distance=mi`,
        { signal: AbortSignal.timeout(10_000) }
      ),
    ])

    if (!obsRes.ok) {
      return NextResponse.json(
        { error: `Tempest API error: ${obsRes.status}` },
        { status: 502 }
      )
    }

    const obsData: TempestObservationResponse = await obsRes.json()
    const obs = obsData.obs?.[0]

    if (!obs) {
      return NextResponse.json(
        { error: "No observation data available" },
        { status: 502 }
      )
    }

    // Build forecast if available
    let forecast: { daily: ForecastDay[] } | null = null
    if (forecastRes.ok) {
      try {
        const forecastData: TempestForecastResponse = await forecastRes.json()
        const days = forecastData.forecast?.daily?.slice(0, 5) ?? []
        forecast = {
          daily: days.map((d) => ({
            day: new Date(d.day_start_local * 1000).toISOString().split("T")[0],
            tempHigh: Math.round(d.air_temp_high),
            tempLow: Math.round(d.air_temp_low),
            precip: Math.round((d.precip ?? 0) * 100) / 100,
            precipProbability: d.precip_probability,
            icon: d.icon,
            conditions: d.conditions,
          })),
        }
      } catch {
        // Forecast is optional — continue without it
      }
    }

    const response: WeatherResponse = {
      station: {
        name: obsData.station_name ?? "Tempest",
        stationId: obsData.station_id,
      },
      current: {
        temperature: cToF(obs.air_temperature),
        feelsLike: cToF(obs.feels_like),
        humidity: obs.relative_humidity,
        pressure: mbToInHg(obs.sea_level_pressure),
        windSpeed: msToMph(obs.wind_avg),
        windGust: msToMph(obs.wind_gust),
        windDirection: obs.wind_direction,
        uvIndex: obs.uv,
        solarRadiation: obs.solar_radiation,
        rainToday: mmToIn(obs.precip_accum_local_day),
        lightningCount3hr: obs.lightning_strike_count_last_3hr,
        weatherCode: deriveWeatherCode(obs),
      },
      forecast,
    }

    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to Tempest API" },
      { status: 502 }
    )
  }
}

/** Backwards-compatible Open-Meteo handler for widgets not yet migrated */
async function handleLegacy(
  searchParams: URLSearchParams
): Promise<NextResponse> {
  const lat = Number(searchParams.get("lat"))
  const lon = Number(searchParams.get("lon"))
  const unit = searchParams.get("unit")

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
