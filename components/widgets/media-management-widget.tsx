"use client"

import { useState, useEffect, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Bookmark02Icon, Settings02Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { WidgetHeader } from "@/components/widget-header"
import { DeleteWidgetButton } from "@/components/delete-widget-button"
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
import type {
  CalendarItem,
  QueueItem,
  MediaManagementResponse,
} from "@/app/api/widgets/media-management/types"

interface MediaManagementWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatAirTime(isoDate: string): string {
  if (!isoDate) return ""
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function getDateGroupLabel(isoDate: string): string {
  if (!isoDate) return "Unknown"
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return "Unknown"

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (itemDate.getTime() === today.getTime()) return "Today"
  if (itemDate.getTime() === tomorrow.getTime()) return "Tomorrow"

  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

function groupByDate(items: CalendarItem[]): Map<string, CalendarItem[]> {
  const groups = new Map<string, CalendarItem[]>()
  for (const item of items) {
    const label = getDateGroupLabel(item.airDate)
    const existing = groups.get(label)
    if (existing) {
      existing.push(item)
    } else {
      groups.set(label, [item])
    }
  }
  return groups
}

function getQueueStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "downloading":
      return "bg-green-500"
    case "queued":
    case "paused":
    case "delay":
      return "bg-amber-500"
    case "failed":
    case "warning":
      return "bg-red-500"
    case "completed":
    case "imported":
      return "bg-blue-500"
    default:
      return "bg-gray-400"
  }
}

function getUrlPlaceholder(serviceType: string): string {
  return serviceType === "radarr"
    ? "http://192.168.1.100:7878"
    : "http://192.168.1.100:8989"
}

function getServiceLabel(serviceType: string): string {
  if (serviceType === "sonarr") return "Sonarr"
  if (serviceType === "radarr") return "Radarr"
  return "Media Management"
}

export function MediaManagementWidget({
  widgetId,
  config,
  onDelete,
}: MediaManagementWidgetProps): React.ReactElement {
  const [savedConfig, setSavedConfig] = useState({
    serviceType: (config?.serviceType as string) ?? "",
    serviceUrl: (config?.serviceUrl as string) ?? "",
    secretName: (config?.secretName as string) ?? "",
  })
  const isConfigured =
    savedConfig.serviceUrl && savedConfig.secretName && (savedConfig.serviceType === "sonarr" || savedConfig.serviceType === "radarr")

  const [data, setData] = useState<MediaManagementResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab] = useState<"calendar" | "queue">("calendar")

  const [settingsServiceType, setSettingsServiceType] = useState(savedConfig.serviceType || "sonarr")
  const [settingsServiceUrl, setSettingsServiceUrl] = useState(savedConfig.serviceUrl)
  const [settingsSecretName, setSettingsSecretName] = useState(savedConfig.secretName)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const incoming = {
      serviceType: (config?.serviceType as string) ?? "",
      serviceUrl: (config?.serviceUrl as string) ?? "",
      secretName: (config?.secretName as string) ?? "",
    }
    setSavedConfig(incoming)
    setSettingsServiceType(incoming.serviceType || "sonarr")
    setSettingsServiceUrl(incoming.serviceUrl)
    setSettingsSecretName(incoming.secretName)
  }, [config])

  const fetchData = useCallback(async () => {
    if (!isConfigured) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/widgets/media-management?widgetId=${widgetId}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }))
        setError(body.error ?? `Error ${res.status}`)
        setData(null)
        return
      }
      const json: MediaManagementResponse = await res.json()
      setData(json)
      setError(null)
    } catch {
      setError("Failed to connect")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [widgetId, isConfigured])

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false)
      return
    }

    setLoading(true)
    fetchData()

    const interval = setInterval(fetchData, 60_000)
    return () => clearInterval(interval)
  }, [fetchData, isConfigured])

  async function handleSaveSettings() {
    setSaving(true)
    try {
      const res = await fetch(`/api/widgets/${widgetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            serviceType: settingsServiceType,
            serviceUrl: settingsServiceUrl,
            secretName: settingsSecretName,
          },
        }),
      })
      if (res.ok) {
        setSavedConfig({
          serviceType: settingsServiceType,
          serviceUrl: settingsServiceUrl,
          secretName: settingsSecretName,
        })
        setShowSettings(false)
        setLoading(true)
      }
    } catch (error) {
      console.warn("Failed to save media management config:", error)
    } finally {
      setSaving(false)
    }
  }

  const serviceLabel = getServiceLabel(savedConfig.serviceType)

  if (!isConfigured && !showSettings) {
    return (
      <div className="flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden">
        <WidgetHeader icon={Bookmark02Icon} title="Media Management" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
          <HugeiconsIcon
            icon={Bookmark02Icon}
            strokeWidth={1.5}
            className="size-8 text-muted-foreground/30"
          />
          <p className="text-xs text-muted-foreground text-center">
            Connect to Sonarr or Radarr to see upcoming content and downloads
          </p>
          <div className="flex w-full max-w-xs flex-col gap-2">
            <div className="space-y-1.5">
              <Label className="text-[0.625rem] text-muted-foreground">Service Type</Label>
              <Select value={settingsServiceType} onValueChange={setSettingsServiceType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sonarr">Sonarr</SelectItem>
                  <SelectItem value="radarr">Radarr</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder={getUrlPlaceholder(settingsServiceType)}
              value={settingsServiceUrl}
              onChange={(e) => setSettingsServiceUrl(e.target.value)}
            />
            <div className="space-y-1">
              <Input
                placeholder="SONARR"
                value={settingsSecretName}
                onChange={(e) => setSettingsSecretName(e.target.value)}
              />
              <p className="text-[0.5rem] text-muted-foreground">
                Enter the name of a secret stored in Settings
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleSaveSettings}
              disabled={saving || !settingsServiceUrl.trim() || !settingsSecretName.trim()}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (showSettings) {
    return (
      <div className="flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden">
        <WidgetHeader icon={Bookmark02Icon} title={serviceLabel} isSettings onSettingsClick={() => setShowSettings(false)} />
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[0.625rem] text-muted-foreground">Service Type</Label>
            <Select value={settingsServiceType} onValueChange={setSettingsServiceType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sonarr">Sonarr</SelectItem>
                <SelectItem value="radarr">Radarr</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mm-service-url">Service URL</Label>
            <Input
              id="mm-service-url"
              value={settingsServiceUrl}
              onChange={(e) => setSettingsServiceUrl(e.target.value)}
              placeholder={getUrlPlaceholder(settingsServiceType)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mm-secret-name">Secret Name</Label>
            <Input
              id="mm-secret-name"
              value={settingsSecretName}
              onChange={(e) => setSettingsSecretName(e.target.value)}
              placeholder="SONARR"
            />
            <p className="text-[0.5rem] text-muted-foreground">
              Enter the name of a secret stored in Settings
            </p>
          </div>

          <Button
            onClick={handleSaveSettings}
            disabled={saving || !settingsServiceUrl.trim() || !settingsSecretName.trim()}
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

  if (!loading && error) {
    return (
      <div className={cn(
        "flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden",
        "widget-glow-error"
      )}>
        <WidgetHeader
          icon={Bookmark02Icon}
          title={serviceLabel}
          onSettingsClick={() => setShowSettings(true)}
          status="error"
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
          <HugeiconsIcon
            icon={Bookmark02Icon}
            strokeWidth={1.5}
            className="size-10 text-muted-foreground/30"
          />
          <p className="text-sm font-medium text-muted-foreground">
            Cannot connect to {serviceLabel}
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

  return (
    <div className={cn(
      "flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden",
      !loading && isConfigured && !error && "widget-glow-success",
      !loading && isConfigured && error && "widget-glow-error"
    )}>
      <WidgetHeader
        icon={Bookmark02Icon}
        title={serviceLabel}
        onSettingsClick={() => setShowSettings(true)}
        status={!loading && isConfigured ? (error ? "error" : "success") : undefined}
      />

      <div className="flex shrink-0 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("calendar")}
          className={cn(
            "flex-1 px-3 py-1.5 text-xs font-medium transition-colors",
            activeTab === "calendar"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Calendar
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("queue")}
          className={cn(
            "flex-1 px-3 py-1.5 text-xs font-medium transition-colors",
            activeTab === "queue"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Queue
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 border-b border-border"
              >
                <Skeleton className="size-2 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-2 w-20" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        ) : activeTab === "calendar" ? (
          <CalendarView calendar={data?.calendar ?? []} />
        ) : (
          <QueueView queue={data?.queue ?? []} />
        )}
      </div>
    </div>
  )
}

function CalendarView({ calendar }: { calendar: CalendarItem[] }): React.ReactElement {
  if (calendar.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-6">
        <HugeiconsIcon
          icon={Bookmark02Icon}
          strokeWidth={1.5}
          className="size-8 text-muted-foreground/30"
        />
        <p className="text-xs text-muted-foreground">No upcoming content in the next 7 days</p>
      </div>
    )
  }

  const groups = groupByDate(calendar)

  return (
    <div>
      {Array.from(groups.entries()).map(([label, items]) => (
        <div key={label}>
          <div className="sticky top-0 bg-muted/80 backdrop-blur-sm px-3 py-1">
            <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </span>
          </div>
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 px-3 py-2 border-b border-border"
            >
              <div
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  item.hasFile ? "bg-green-500" : "bg-gray-400"
                )}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs font-medium">{item.seriesOrMovieTitle}</span>
                <span className="truncate text-[0.625rem] text-muted-foreground">
                  {item.episodeInfo ? `${item.episodeInfo} - ` : ""}
                  {item.title}
                </span>
              </div>
              <span className="shrink-0 text-[0.625rem] text-muted-foreground">
                {formatAirTime(item.airDate)}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function QueueView({ queue }: { queue: QueueItem[] }): React.ReactElement {
  if (queue.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-6">
        <HugeiconsIcon
          icon={Bookmark02Icon}
          strokeWidth={1.5}
          className="size-8 text-muted-foreground/30"
        />
        <p className="text-xs text-muted-foreground">Download queue is empty</p>
      </div>
    )
  }

  return (
    <div>
      {queue.map((item) => (
        <div
          key={item.id}
          className="flex flex-col gap-1 px-3 py-2 border-b border-border"
        >
          <div className="flex items-center gap-2">
            <div
              className={cn("size-2 shrink-0 rounded-full", getQueueStatusColor(item.status))}
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-xs font-medium">{item.title}</span>
              <span className="truncate text-[0.625rem] text-muted-foreground">
                {item.seriesOrMovieTitle}
              </span>
            </div>
            <div className="flex shrink-0 flex-col items-end">
              <span className="text-[0.625rem] font-medium">
                {Math.round(item.progressPercent)}%
              </span>
              <span className="text-[0.5rem] text-muted-foreground">
                {formatBytes(item.sizeLeft)} left
              </span>
            </div>
          </div>
          <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                getQueueStatusColor(item.status)
              )}
              style={{ width: `${Math.min(Math.max(item.progressPercent, 0), 100)}%` }}
            />
          </div>
          {item.timeLeft && (
            <span className="text-[0.5rem] text-muted-foreground">
              {item.timeLeft} remaining
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
