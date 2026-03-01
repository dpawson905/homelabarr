"use client"

import { useState, useEffect, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { CloudIcon, Settings02Icon, Location01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"

interface WeatherWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
}

interface WeatherData {
  current: {
    temperature_2m: number
    relative_humidity_2m: number
    apparent_temperature: number
    weather_code: number
    wind_speed_10m: number
  }
  current_units: {
    temperature_2m: string
    wind_speed_10m: string
  }
  daily: {
    time: string[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    weather_code: number[]
  }
}

function getWeatherInfo(code: number): { label: string; emoji: string } {
  if (code === 0) return { label: "Clear sky", emoji: "☀️" }
  if (code <= 3) return { label: "Partly cloudy", emoji: "⛅" }
  if (code <= 48) return { label: "Foggy", emoji: "🌫️" }
  if (code <= 55) return { label: "Drizzle", emoji: "🌦️" }
  if (code <= 65) return { label: "Rainy", emoji: "🌧️" }
  if (code <= 75) return { label: "Snowy", emoji: "❄️" }
  if (code <= 82) return { label: "Showers", emoji: "🌧️" }
  if (code <= 99) return { label: "Thunderstorm", emoji: "⛈️" }
  return { label: "Unknown", emoji: "❓" }
}

export function WeatherWidget({ widgetId, config }: WeatherWidgetProps): React.ReactElement {
  const configLat = typeof config?.latitude === "number" ? config.latitude : null
  const configLon = typeof config?.longitude === "number" ? config.longitude : null
  const configLocationName = typeof config?.locationName === "string" ? config.locationName : ""
  const configTempUnit = config?.temperatureUnit === "fahrenheit" ? "fahrenheit" : "celsius"

  const isConfigured = configLat !== null && configLon !== null

  const [showSettings, setShowSettings] = useState(false)
  const [settingsLat, setSettingsLat] = useState(configLat !== null ? String(configLat) : "")
  const [settingsLon, setSettingsLon] = useState(configLon !== null ? String(configLon) : "")
  const [settingsLocation, setSettingsLocation] = useState(configLocationName)
  const [settingsTempUnit, setSettingsTempUnit] = useState<"celsius" | "fahrenheit">(configTempUnit)
  const [saving, setSaving] = useState(false)
  const [geolocating, setGeolocating] = useState(false)

  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWeather = useCallback(async () => {
    if (configLat === null || configLon === null) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/widgets/weather?lat=${configLat}&lon=${configLon}&unit=${configTempUnit}`
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Failed to fetch weather" }))
        setError(body.error ?? "Failed to fetch weather data")
        return
      }
      const data: WeatherData = await res.json()
      setWeather(data)
    } catch {
      setError("Failed to fetch weather data")
    } finally {
      setLoading(false)
    }
  }, [configLat, configLon, configTempUnit])

  // Fetch on mount and refresh every 10 minutes
  useEffect(() => {
    if (!isConfigured) return
    fetchWeather()
    const interval = setInterval(fetchWeather, 600_000)
    return () => clearInterval(interval)
  }, [isConfigured, fetchWeather])

  // Sync settings fields when config changes externally
  useEffect(() => {
    setSettingsLat(configLat !== null ? String(configLat) : "")
    setSettingsLon(configLon !== null ? String(configLon) : "")
    setSettingsLocation(configLocationName)
    setSettingsTempUnit(configTempUnit)
  }, [configLat, configLon, configLocationName, configTempUnit])

  function handleUseMyLocation() {
    if (!navigator.geolocation) return
    setGeolocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSettingsLat(String(Math.round(position.coords.latitude * 10000) / 10000))
        setSettingsLon(String(Math.round(position.coords.longitude * 10000) / 10000))
        setGeolocating(false)
      },
      () => {
        setGeolocating(false)
      }
    )
  }

  async function handleSave() {
    const lat = Number(settingsLat)
    const lon = Number(settingsLon)
    if (Number.isNaN(lat) || Number.isNaN(lon)) return

    setSaving(true)
    try {
      const res = await fetch(`/api/widgets/${widgetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            latitude: lat,
            longitude: lon,
            locationName: settingsLocation.trim(),
            temperatureUnit: settingsTempUnit,
          },
        }),
      })
      if (res.ok) {
        setShowSettings(false)
      }
    } catch (err) {
      console.warn("Failed to save weather config:", err)
    } finally {
      setSaving(false)
    }
  }

  const tempSymbol = configTempUnit === "fahrenheit" ? "F" : "C"

  return (
    <div className="h-full w-full flex flex-col rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <HugeiconsIcon
            icon={CloudIcon}
            strokeWidth={2}
            className="size-3.5 text-muted-foreground"
          />
          <span className="text-xs font-medium text-foreground">
            {configLocationName || "Weather"}
          </span>
        </div>
        {isConfigured && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setShowSettings((s) => !s)}
            aria-label="Weather settings"
          >
            <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} />
          </Button>
        )}
      </div>

      {/* Settings panel */}
      {showSettings ? (
        <div className="flex flex-col gap-3 border-b border-border p-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="weather-location" className="text-[0.625rem] text-muted-foreground">
              Location Name
            </Label>
            <Input
              id="weather-location"
              placeholder="e.g. New York"
              value={settingsLocation}
              onChange={(e) => setSettingsLocation(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="weather-lat" className="text-[0.625rem] text-muted-foreground">
                Latitude
              </Label>
              <Input
                id="weather-lat"
                placeholder="e.g. 40.7128"
                value={settingsLat}
                onChange={(e) => setSettingsLat(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="weather-lon" className="text-[0.625rem] text-muted-foreground">
                Longitude
              </Label>
              <Input
                id="weather-lon"
                placeholder="e.g. -74.0060"
                value={settingsLon}
                onChange={(e) => setSettingsLon(e.target.value)}
              />
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleUseMyLocation}
            disabled={geolocating}
          >
            <HugeiconsIcon icon={Location01Icon} strokeWidth={2} className="size-3" />
            {geolocating ? "Locating..." : "Use My Location"}
          </Button>

          <div className="flex items-center justify-between gap-2">
            <Label className="text-[0.625rem] text-muted-foreground">Temperature</Label>
            <Select value={settingsTempUnit} onValueChange={(v) => setSettingsTempUnit(v as "celsius" | "fahrenheit")}>
              <SelectTrigger size="sm" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="celsius">Celsius</SelectItem>
                <SelectItem value="fahrenheit">Fahrenheit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      ) : null}

      {/* Not yet configured */}
      {!isConfigured && !showSettings ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
          <span className="text-3xl">⛅</span>
          <p className="text-xs text-muted-foreground text-center">
            Configure a location to see weather data
          </p>
          <Button size="sm" onClick={() => setShowSettings(true)}>
            Set Up Location
          </Button>
        </div>
      ) : null}

      {/* Loading state */}
      {isConfigured && loading && !weather ? (
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="flex flex-col items-center gap-2">
            <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            <span className="text-xs text-muted-foreground">Loading weather...</span>
          </div>
        </div>
      ) : null}

      {/* Error state */}
      {isConfigured && error && !weather ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4">
          <span className="text-xs text-muted-foreground">{error}</span>
          <Button size="sm" variant="outline" onClick={fetchWeather}>
            Retry
          </Button>
        </div>
      ) : null}

      {/* Weather display */}
      {weather && !showSettings ? (
        <>
          {/* Current conditions */}
          <div className="flex flex-1 flex-col items-center justify-center gap-1 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">
                {getWeatherInfo(weather.current.weather_code).emoji}
              </span>
              <span className="text-3xl font-semibold tracking-tight text-foreground">
                {Math.round(weather.current.temperature_2m)}&deg;{tempSymbol}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {getWeatherInfo(weather.current.weather_code).label}
            </span>
            <div className="mt-1 flex items-center gap-3 text-[0.625rem] text-muted-foreground">
              <span>Feels like {Math.round(weather.current.apparent_temperature)}&deg;{tempSymbol}</span>
              <span>Humidity {weather.current.relative_humidity_2m}%</span>
              <span>Wind {weather.current.wind_speed_10m} {weather.current_units.wind_speed_10m}</span>
            </div>
          </div>

          {/* 5-day forecast */}
          <div className="shrink-0 border-t border-border">
            <div className="flex items-stretch justify-around px-2 py-2">
              {weather.daily.time.map((dateStr, i) => {
                const dayInfo = getWeatherInfo(weather.daily.weather_code[i])
                return (
                  <div
                    key={dateStr}
                    className="flex flex-col items-center gap-0.5 px-1"
                  >
                    <span className="text-[0.5rem] font-medium text-muted-foreground uppercase">
                      {format(new Date(dateStr + "T00:00:00"), "EEE")}
                    </span>
                    <span className="text-sm">{dayInfo.emoji}</span>
                    <div className="flex gap-1 text-[0.5rem]">
                      <span className="font-medium text-foreground">
                        {Math.round(weather.daily.temperature_2m_max[i])}&deg;
                      </span>
                      <span className="text-muted-foreground">
                        {Math.round(weather.daily.temperature_2m_min[i])}&deg;
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
