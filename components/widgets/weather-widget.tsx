"use client"

import { useState, useEffect, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CloudIcon,
  Settings02Icon,
  ThermometerIcon,
  WindPower01Icon,
  DropletIcon,
  Sun01Icon,
  FlashIcon,
} from "@hugeicons/core-free-icons"
import { WidgetHeader } from "@/components/widget-header"
import { DeleteWidgetButton } from "@/components/delete-widget-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { format } from "date-fns"
import type { WeatherResponse } from "@/app/api/widgets/weather/types"

interface WeatherWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
}

const POLL_INTERVAL_MS = 120_000 // 2 minutes

function getWeatherEmoji(code: number): string {
  if (code >= 95) return "⛈️"
  if (code >= 80) return "🌧️"
  if (code >= 61) return "🌧️"
  if (code >= 51) return "🌦️"
  if (code >= 45) return "🌫️"
  if (code === 3) return "☁️"
  if (code >= 1) return "⛅"
  return "☀️"
}

function getConditionLabel(code: number): string {
  if (code >= 95) return "Thunderstorm"
  if (code >= 80) return "Showers"
  if (code >= 61) return "Rain"
  if (code >= 51) return "Drizzle"
  if (code >= 45) return "Foggy"
  if (code === 3) return "Overcast"
  if (code >= 1) return "Partly Cloudy"
  return "Clear"
}

function windDirectionLabel(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
  return dirs[Math.round(deg / 22.5) % 16]
}

function getForecastEmoji(icon: string): string {
  const map: Record<string, string> = {
    "clear-day": "☀️",
    "clear-night": "🌙",
    "cloudy": "☁️",
    "foggy": "🌫️",
    "partly-cloudy-day": "⛅",
    "partly-cloudy-night": "☁️",
    "possibly-rainy-day": "🌦️",
    "possibly-rainy-night": "🌦️",
    "rainy": "🌧️",
    "sleet": "🌨️",
    "snow": "❄️",
    "thunderstorm": "⛈️",
    "windy": "💨",
  }
  return map[icon] ?? "🌤️"
}

function isConfigured(config: Record<string, unknown> | null): boolean {
  return (
    typeof config?.stationId === "number" &&
    config.stationId > 0 &&
    typeof config?.secretName === "string" &&
    config.secretName.length > 0
  )
}

export function WeatherWidget({
  widgetId,
  config,
  onDelete,
}: WeatherWidgetProps): React.ReactElement {
  const [savedConfig, setSavedConfig] = useState({
    stationId: (config?.stationId as number) ?? 0,
    secretName: (config?.secretName as string) ?? "",
    locationName: (config?.locationName as string) ?? "",
  })
  const configured = savedConfig.stationId > 0 && !!savedConfig.secretName

  const [data, setData] = useState<WeatherResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const [settingsStationId, setSettingsStationId] = useState(
    savedConfig.stationId ? String(savedConfig.stationId) : ""
  )
  const [settingsSecretName, setSettingsSecretName] = useState(savedConfig.secretName)
  const [settingsLocationName, setSettingsLocationName] = useState(savedConfig.locationName)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const incoming = {
      stationId: (config?.stationId as number) ?? 0,
      secretName: (config?.secretName as string) ?? "",
      locationName: (config?.locationName as string) ?? "",
    }
    setSavedConfig(incoming)
    setSettingsStationId(incoming.stationId ? String(incoming.stationId) : "")
    setSettingsSecretName(incoming.secretName)
    setSettingsLocationName(incoming.locationName)
  }, [config])

  const fetchData = useCallback(async () => {
    if (!configured) {
      setLoading(false)
      return
    }

    try {
      const params = new URLSearchParams({ widgetId })
      const res = await fetch(`/api/widgets/weather?${params}`)

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }))
        setError(body.error ?? `Error ${res.status}`)
        setData(null)
        return
      }

      const json: WeatherResponse = await res.json()
      setData(json)
      setError(null)
    } catch {
      setError("Failed to connect")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [widgetId, configured])

  useEffect(() => {
    if (!configured) {
      setLoading(false)
      return
    }

    setLoading(true)
    fetchData()

    const interval = setInterval(fetchData, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchData, configured])

  async function handleSaveSettings() {
    setSaving(true)
    try {
      const stationId = Number(settingsStationId)
      if (Number.isNaN(stationId) || stationId <= 0) {
        toast.error("Station ID must be a positive number")
        return
      }

      const res = await fetch(`/api/widgets/${widgetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            stationId,
            secretName: settingsSecretName,
            locationName: settingsLocationName.trim(),
          },
        }),
      })

      if (!res.ok) {
        toast.error("Failed to save settings")
        return
      }

      setSavedConfig({
        stationId,
        secretName: settingsSecretName,
        locationName: settingsLocationName.trim(),
      })
      setShowSettings(false)
      setLoading(true)
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const displayName = savedConfig.locationName || data?.station?.name || "Weather"

  // Settings / setup view
  if (showSettings || !configured) {
    return (
      <div className="flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden">
        <WidgetHeader
          icon={CloudIcon}
          title="Weather"
          isSettings
          settingsTitle={configured ? "Weather Settings" : "Setup Weather"}
          onSettingsClick={configured ? () => setShowSettings(false) : undefined}
        />

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="weather-station-id">Tempest Station ID</Label>
            <Input
              id="weather-station-id"
              value={settingsStationId}
              onChange={(e) => setSettingsStationId(e.target.value)}
              placeholder="e.g. 210931"
            />
            <p className="text-[0.625rem] text-muted-foreground">
              Find this at tempestwx.com under your station settings
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="weather-secret">Secret Name</Label>
            <Input
              id="weather-secret"
              value={settingsSecretName}
              onChange={(e) => setSettingsSecretName(e.target.value)}
              placeholder="TEMPEST_TOKEN"
            />
            <p className="text-[0.625rem] text-muted-foreground">
              Name of a secret created in Settings (your Tempest API token)
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="weather-location">Location Name (optional)</Label>
            <Input
              id="weather-location"
              value={settingsLocationName}
              onChange={(e) => setSettingsLocationName(e.target.value)}
              placeholder="e.g. Sparrow Dr"
            />
          </div>

          <Button
            onClick={handleSaveSettings}
            disabled={saving || !settingsStationId.trim() || !settingsSecretName.trim()}
            className="w-full"
            size="sm"
          >
            {saving ? "Saving..." : "Save Settings"}
          </Button>
          {onDelete && <DeleteWidgetButton onConfirm={onDelete} />}
        </div>
      </div>
    )
  }

  // Error view
  if (!loading && error) {
    return (
      <div className={cn(
        "flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden",
        "widget-glow-error"
      )}>
        <WidgetHeader
          icon={CloudIcon}
          title={displayName}
          onSettingsClick={() => setShowSettings(true)}
          status="error"
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
          <HugeiconsIcon
            icon={CloudIcon}
            strokeWidth={1.5}
            className="size-10 text-muted-foreground/30"
          />
          <p className="text-sm font-medium text-muted-foreground">
            Cannot connect to Tempest
          </p>
          <p className="text-center text-xs text-muted-foreground/70">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
          >
            <HugeiconsIcon
              icon={Settings02Icon}
              strokeWidth={2}
              data-icon="inline-start"
            />
            Settings
          </Button>
        </div>
      </div>
    )
  }

  // Main data view
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden",
        !loading && configured && !error && "widget-glow-success",
        !loading && configured && error && "widget-glow-error"
      )}
    >
      <WidgetHeader
        icon={CloudIcon}
        title={displayName}
        onSettingsClick={() => setShowSettings(true)}
        status={!loading && configured ? (error ? "error" : "success") : undefined}
      />

      <div className="flex flex-1 flex-col justify-between overflow-y-auto">
        {loading ? (
          <div className="space-y-3 p-3">
            <div className="flex items-center justify-center gap-2 py-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-10 w-20" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 rounded-md bg-muted/50 p-2">
                  <Skeleton className="h-2.5 w-10" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </div>
        ) : !data ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-6">
            <HugeiconsIcon
              icon={CloudIcon}
              strokeWidth={1.5}
              className="size-8 text-muted-foreground/30"
            />
            <p className="text-xs text-muted-foreground">No weather data</p>
          </div>
        ) : (
          <>
            {/* Current conditions - hero */}
            <div className="flex flex-col items-center gap-1 px-3 pt-2 pb-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">
                  {getWeatherEmoji(data.current.weatherCode)}
                </span>
                <span className="text-3xl font-semibold tracking-tight text-foreground">
                  {data.current.temperature}&deg;F
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {getConditionLabel(data.current.weatherCode)}
              </span>
              <div className="mt-0.5 flex items-center gap-3 text-[0.625rem] text-muted-foreground">
                <span>Feels {data.current.feelsLike}&deg;</span>
                <span>{data.current.humidity}% humidity</span>
              </div>
            </div>

            {/* Sensor grid */}
            <div className="grid grid-cols-3 gap-1.5 px-3 py-1.5">
              <SensorTile
                icon={WindPower01Icon}
                label="Wind"
                value={data.current.windSpeed > 0
                  ? `${data.current.windSpeed} ${windDirectionLabel(data.current.windDirection)}`
                  : "Calm"
                }
                sub={data.current.windGust > 0 ? `G ${data.current.windGust}` : undefined}
              />
              <SensorTile
                icon={ThermometerIcon}
                label="Pressure"
                value={`${data.current.pressure}`}
                sub="inHg"
              />
              <SensorTile
                icon={DropletIcon}
                label="Rain"
                value={`${data.current.rainToday}`}
                sub="in today"
              />
              <SensorTile
                icon={Sun01Icon}
                label="UV"
                value={`${data.current.uvIndex}`}
                sub={data.current.solarRadiation > 0 ? `${data.current.solarRadiation} W/m²` : undefined}
              />
              <SensorTile
                icon={FlashIcon}
                label="Lightning"
                value={`${data.current.lightningCount3hr}`}
                sub="3hr"
              />
              <SensorTile
                icon={DropletIcon}
                label="Humidity"
                value={`${data.current.humidity}%`}
              />
            </div>

            {/* Forecast */}
            {data.forecast && data.forecast.daily.length > 0 && (
              <div className="shrink-0 border-t border-border mt-auto">
                <div className="flex items-stretch justify-around px-2 py-2">
                  {data.forecast.daily.map((day) => (
                    <div
                      key={day.day}
                      className="flex flex-col items-center gap-0.5 px-1"
                    >
                      <span className="text-[0.5rem] font-medium text-muted-foreground uppercase">
                        {format(new Date(day.day + "T00:00:00"), "EEE")}
                      </span>
                      <span className="text-sm">{getForecastEmoji(day.icon)}</span>
                      <div className="flex gap-1 text-[0.5rem]">
                        <span className="font-medium text-foreground">
                          {day.tempHigh}&deg;
                        </span>
                        <span className="text-muted-foreground">
                          {day.tempLow}&deg;
                        </span>
                      </div>
                      {day.precipProbability > 0 && (
                        <span className="text-[0.4375rem] text-blue-400">
                          {day.precipProbability}%
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function SensorTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: typeof CloudIcon
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-md bg-muted/50 p-1.5">
      <HugeiconsIcon icon={icon} strokeWidth={1.5} className="size-3 text-muted-foreground/60" />
      <span className="text-[0.5rem] text-muted-foreground">{label}</span>
      <span className="text-[0.6875rem] font-semibold text-foreground leading-tight">{value}</span>
      {sub && <span className="text-[0.4375rem] text-muted-foreground leading-tight">{sub}</span>}
    </div>
  )
}
