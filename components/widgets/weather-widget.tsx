"use client"

import { useState, useEffect, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CloudIcon,
  Location01Icon,
  Search01Icon,
  Settings02Icon,
  WindPower01Icon,
  DropletIcon,
  ThermometerIcon,
} from "@hugeicons/core-free-icons"
import { WidgetHeader } from "@/components/widget-header"
import { DeleteWidgetButton } from "@/components/delete-widget-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { format } from "date-fns"
import type { WeatherResponse } from "@/app/api/widgets/weather/types"

interface WeatherWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
}

interface GeoResult {
  name: string
  state?: string
  country: string
  lat: number
  lon: number
}

const POLL_INTERVAL_MS = 600_000 // 10 minutes

// OWM icon code → emoji
function getWeatherEmoji(icon: string): string {
  const map: Record<string, string> = {
    "01d": "☀️", "01n": "🌙",
    "02d": "⛅", "02n": "☁️",
    "03d": "☁️", "03n": "☁️",
    "04d": "☁️", "04n": "☁️",
    "09d": "🌧️", "09n": "🌧️",
    "10d": "🌦️", "10n": "🌧️",
    "11d": "⛈️", "11n": "⛈️",
    "13d": "❄️", "13n": "❄️",
    "50d": "🌫️", "50n": "🌫️",
  }
  return map[icon] ?? "🌤️"
}

function getAqiLabel(aqi: number): { label: string; color: string } {
  switch (aqi) {
    case 1: return { label: "Good", color: "text-green-400" }
    case 2: return { label: "Fair", color: "text-yellow-400" }
    case 3: return { label: "Moderate", color: "text-orange-400" }
    case 4: return { label: "Poor", color: "text-red-400" }
    case 5: return { label: "Very Poor", color: "text-red-600" }
    default: return { label: "Unknown", color: "text-muted-foreground" }
  }
}

function windDirectionLabel(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
  return dirs[Math.round(deg / 22.5) % 16]
}

function formatTime(unix: number): string {
  return format(new Date(unix * 1000), "h:mm a")
}

export function WeatherWidget({ widgetId, config, onDelete }: WeatherWidgetProps): React.ReactElement {
  const [savedConfig, setSavedConfig] = useState({
    latitude: (config?.latitude as number) ?? 0,
    longitude: (config?.longitude as number) ?? 0,
    locationName: (config?.locationName as string) ?? "",
    secretName: (config?.secretName as string) ?? "",
    units: (config?.units as string) ?? "imperial",
  })
  const configured = savedConfig.latitude !== 0 && savedConfig.longitude !== 0 && !!savedConfig.secretName

  const [data, setData] = useState<WeatherResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  // Settings form state
  const [settingsSecretName, setSettingsSecretName] = useState(savedConfig.secretName)
  const [settingsLocationName, setSettingsLocationName] = useState(savedConfig.locationName)
  const [settingsLat, setSettingsLat] = useState(savedConfig.latitude ? String(savedConfig.latitude) : "")
  const [settingsLon, setSettingsLon] = useState(savedConfig.longitude ? String(savedConfig.longitude) : "")
  const [settingsUnits, setSettingsUnits] = useState(savedConfig.units)
  const [saving, setSaving] = useState(false)
  const [geolocating, setGeolocating] = useState(false)

  // City search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<GeoResult[]>([])
  const [searching, setSearching] = useState(false)

  // Sync from config prop
  useEffect(() => {
    const incoming = {
      latitude: (config?.latitude as number) ?? 0,
      longitude: (config?.longitude as number) ?? 0,
      locationName: (config?.locationName as string) ?? "",
      secretName: (config?.secretName as string) ?? "",
      units: (config?.units as string) ?? "imperial",
    }
    setSavedConfig(incoming)
    setSettingsSecretName(incoming.secretName)
    setSettingsLocationName(incoming.locationName)
    setSettingsLat(incoming.latitude ? String(incoming.latitude) : "")
    setSettingsLon(incoming.longitude ? String(incoming.longitude) : "")
    setSettingsUnits(incoming.units)
  }, [config])

  const fetchWeather = useCallback(async () => {
    if (!configured) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/widgets/weather?widgetId=${widgetId}`)

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
    fetchWeather()
    const interval = setInterval(fetchWeather, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchWeather, configured])

  async function handleCitySearch() {
    if (!searchQuery.trim() || !settingsSecretName) return
    setSearching(true)
    try {
      const params = new URLSearchParams({
        q: searchQuery.trim(),
        secretName: settingsSecretName,
      })
      const res = await fetch(`/api/widgets/weather/geocode?${params}`)
      if (res.ok) {
        const results: GeoResult[] = await res.json()
        setSearchResults(results)
      } else {
        toast.error("City search failed")
      }
    } catch {
      toast.error("City search failed")
    } finally {
      setSearching(false)
    }
  }

  function handleSelectCity(city: GeoResult) {
    setSettingsLat(String(city.lat))
    setSettingsLon(String(city.lon))
    setSettingsLocationName(
      city.state ? `${city.name}, ${city.state}` : `${city.name}, ${city.country}`
    )
    setSearchResults([])
    setSearchQuery("")
  }

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
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      toast.error("Invalid coordinates")
      return
    }
    if (!settingsSecretName.trim()) {
      toast.error("API key secret name is required")
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/widgets/${widgetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            latitude: lat,
            longitude: lon,
            locationName: settingsLocationName.trim(),
            secretName: settingsSecretName.trim(),
            units: settingsUnits,
          },
        }),
      })

      if (!res.ok) {
        toast.error("Failed to save settings")
        return
      }

      setSavedConfig({
        latitude: lat,
        longitude: lon,
        locationName: settingsLocationName.trim(),
        secretName: settingsSecretName.trim(),
        units: settingsUnits,
      })
      setShowSettings(false)
      setLoading(true)
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const unitSymbol = savedConfig.units === "metric" ? "C" : "F"
  const speedUnit = savedConfig.units === "metric" ? "m/s" : "mph"
  const displayName = savedConfig.locationName || data?.location?.name || "Weather"

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

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="weather-secret">API Key Secret Name</Label>
            <Input
              id="weather-secret"
              value={settingsSecretName}
              onChange={(e) => setSettingsSecretName(e.target.value)}
              placeholder="OWM_API_KEY"
            />
            <p className="text-[0.625rem] text-muted-foreground">
              Name of a secret in Settings containing your OpenWeatherMap API key
            </p>
          </div>

          {/* City search */}
          {settingsSecretName && (
            <div className="space-y-1.5">
              <Label>Search City</Label>
              <div className="flex gap-1.5">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. New York"
                  onKeyDown={(e) => e.key === "Enter" && handleCitySearch()}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCitySearch}
                  disabled={searching || !searchQuery.trim()}
                  className="shrink-0"
                >
                  <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className="size-3" />
                </Button>
              </div>
              {searchResults.length > 0 && (
                <div className="flex flex-col gap-0.5 rounded-md border border-border bg-muted/50 p-1">
                  {searchResults.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      className="flex items-center justify-between rounded px-2 py-1 text-left text-xs hover:bg-muted transition-colors"
                      onClick={() => handleSelectCity(r)}
                    >
                      <span className="font-medium text-foreground">
                        {r.name}{r.state ? `, ${r.state}` : ""}, {r.country}
                      </span>
                      <span className="text-[0.5rem] text-muted-foreground">
                        {r.lat}, {r.lon}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="weather-location">Location Name</Label>
            <Input
              id="weather-location"
              value={settingsLocationName}
              onChange={(e) => setSettingsLocationName(e.target.value)}
              placeholder="e.g. New York, NY"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="weather-lat">Latitude</Label>
              <Input
                id="weather-lat"
                value={settingsLat}
                onChange={(e) => setSettingsLat(e.target.value)}
                placeholder="40.7128"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weather-lon">Longitude</Label>
              <Input
                id="weather-lon"
                value={settingsLon}
                onChange={(e) => setSettingsLon(e.target.value)}
                placeholder="-74.0060"
              />
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleUseMyLocation}
            disabled={geolocating}
            className="w-full"
          >
            <HugeiconsIcon icon={Location01Icon} strokeWidth={2} className="size-3" />
            {geolocating ? "Locating..." : "Use My Location"}
          </Button>

          <div className="flex items-center justify-between gap-2">
            <Label className="text-[0.625rem] text-muted-foreground">Units</Label>
            <Select value={settingsUnits} onValueChange={setSettingsUnits}>
              <SelectTrigger size="sm" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="imperial">Imperial (°F)</SelectItem>
                <SelectItem value="metric">Metric (°C)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || !settingsLat || !settingsLon || !settingsSecretName.trim()}
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
            Cannot connect to OpenWeatherMap
          </p>
          <p className="text-center text-xs text-muted-foreground/70">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
          >
            <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} data-icon="inline-start" />
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
                  {getWeatherEmoji(data.current.icon)}
                </span>
                <span className="text-3xl font-semibold tracking-tight text-foreground">
                  {data.current.temp}&deg;{unitSymbol}
                </span>
              </div>
              <span className="text-xs capitalize text-muted-foreground">
                {data.current.description}
              </span>
              <div className="mt-0.5 flex items-center gap-3 text-[0.625rem] text-muted-foreground">
                <span>Feels {data.current.feelsLike}&deg;</span>
                <span>H:{data.current.tempMax}&deg; L:{data.current.tempMin}&deg;</span>
              </div>
            </div>

            {/* Sensor grid */}
            <div className="grid grid-cols-3 gap-1.5 px-3 py-1.5">
              <SensorTile
                icon={WindPower01Icon}
                label="Wind"
                value={`${data.current.windSpeed} ${windDirectionLabel(data.current.windDeg)}`}
                sub={data.current.windGust ? `G ${data.current.windGust} ${speedUnit}` : speedUnit}
              />
              <SensorTile
                icon={DropletIcon}
                label="Humidity"
                value={`${data.current.humidity}%`}
              />
              <SensorTile
                icon={ThermometerIcon}
                label="Pressure"
                value={`${data.current.pressure}`}
                sub="hPa"
              />
              <SensorTile
                icon={CloudIcon}
                label="Clouds"
                value={`${data.current.clouds}%`}
              />
              <SensorTile
                icon={CloudIcon}
                label="Sunrise"
                value={formatTime(data.current.sunrise)}
              />
              <SensorTile
                icon={CloudIcon}
                label="Sunset"
                value={formatTime(data.current.sunset)}
              />
            </div>

            {/* Air Quality */}
            {data.airQuality && (
              <div className="mx-3 mb-1.5 flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5">
                <span className="text-[0.625rem] text-muted-foreground">Air Quality</span>
                <span className={cn("text-xs font-semibold", getAqiLabel(data.airQuality.aqi).color)}>
                  {getAqiLabel(data.airQuality.aqi).label}
                </span>
                <div className="flex gap-2 text-[0.5rem] text-muted-foreground">
                  <span>PM2.5: {data.airQuality.pm2_5}</span>
                  <span>O₃: {data.airQuality.o3}</span>
                </div>
              </div>
            )}

            {/* 5-day forecast */}
            {data.forecast.length > 0 && (
              <div className="shrink-0 border-t border-border mt-auto">
                <div className="flex items-stretch justify-around px-2 py-2">
                  {data.forecast.map((day) => (
                    <div
                      key={day.date}
                      className="flex flex-col items-center gap-0.5 px-1"
                    >
                      <span className="text-[0.5rem] font-medium text-muted-foreground uppercase">
                        {format(new Date(day.date + "T00:00:00"), "EEE")}
                      </span>
                      <span className="text-sm">{getWeatherEmoji(day.icon)}</span>
                      <div className="flex gap-1 text-[0.5rem]">
                        <span className="font-medium text-foreground">
                          {day.tempHigh}&deg;
                        </span>
                        <span className="text-muted-foreground">
                          {day.tempLow}&deg;
                        </span>
                      </div>
                      {day.pop > 0 && (
                        <span className="text-[0.4375rem] text-blue-400">
                          {day.pop}%
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
