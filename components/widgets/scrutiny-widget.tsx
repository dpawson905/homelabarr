"use client"

import { useState, useEffect, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { HardDriveIcon, Settings02Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { WidgetHeader } from "@/components/widget-header"
import { DeleteWidgetButton } from "@/components/delete-widget-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { ScrutinyDrive, ScrutinyResponse } from "@/app/api/widgets/scrutiny/types"

interface ScrutinyWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
}

const POLL_INTERVAL_MS = 60_000

function getStatusDotColor(status: ScrutinyDrive["status"]): string {
  switch (status) {
    case "passed":
      return "bg-green-500"
    case "failed":
      return "bg-red-500"
    default:
      return "bg-gray-400"
  }
}

function formatCapacity(bytes: number): string {
  if (bytes <= 0) return "N/A"
  const tb = bytes / 1e12
  if (tb >= 1) return `${tb.toFixed(1)} TB`
  const gb = bytes / 1e9
  return `${gb.toFixed(0)} GB`
}

function formatPowerOnHours(hours: number | null): string {
  if (hours == null) return "N/A"
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 365) return `${days}d`
  const years = (days / 365).toFixed(1)
  return `${years}y`
}

export function ScrutinyWidget({
  widgetId,
  config,
  onDelete,
}: ScrutinyWidgetProps): React.ReactElement {
  const [savedConfig, setSavedConfig] = useState({
    serviceUrl: (config?.serviceUrl as string) ?? "",
  })
  const configured = !!savedConfig.serviceUrl

  const [data, setData] = useState<ScrutinyResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const [settingsServiceUrl, setSettingsServiceUrl] = useState(savedConfig.serviceUrl)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const incoming = {
      serviceUrl: (config?.serviceUrl as string) ?? "",
    }
    setSavedConfig(incoming)
    setSettingsServiceUrl(incoming.serviceUrl)
  }, [config])

  const fetchData = useCallback(async () => {
    if (!configured) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/widgets/scrutiny?widgetId=${widgetId}`)

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }))
        setError(body.error ?? `Error ${res.status}`)
        setData(null)
        return
      }

      const json: ScrutinyResponse = await res.json()
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
      const res = await fetch(`/api/widgets/${widgetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            serviceUrl: settingsServiceUrl,
          },
        }),
      })

      if (!res.ok) {
        toast.error("Failed to save settings")
        return
      }

      setSavedConfig({ serviceUrl: settingsServiceUrl })
      setShowSettings(false)
      setLoading(true)
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const allPassed =
    data != null && data.summary.total > 0 && data.summary.failed === 0
  const anyFailed = data != null && data.summary.failed > 0

  // Settings / setup view
  if (showSettings || !configured) {
    return (
      <div className="flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden">
        <WidgetHeader
          icon={HardDriveIcon}
          title="Scrutiny"
          isSettings
          settingsTitle={configured ? "Scrutiny Settings" : "Setup Scrutiny"}
          onSettingsClick={configured ? () => setShowSettings(false) : undefined}
        />

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="scrutiny-url">Service URL</Label>
            <Input
              id="scrutiny-url"
              value={settingsServiceUrl}
              onChange={(e) => setSettingsServiceUrl(e.target.value)}
              placeholder="http://scrutiny.local:8080"
            />
          </div>

          <p className="text-[0.5625rem] text-muted-foreground text-center">
            Scrutiny does not require authentication. Just enter the URL.
          </p>

          <Button
            onClick={handleSaveSettings}
            disabled={saving || !settingsServiceUrl.trim()}
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
          icon={HardDriveIcon}
          title="Scrutiny"
          onSettingsClick={() => setShowSettings(true)}
          status="error"
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
          <HugeiconsIcon
            icon={HardDriveIcon}
            strokeWidth={1.5}
            className="size-10 text-muted-foreground/30"
          />
          <p className="text-sm font-medium text-muted-foreground">
            Cannot connect to Scrutiny
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
        !loading && configured && !error && allPassed && "widget-glow-success",
        !loading && configured && (error || anyFailed) && "widget-glow-error"
      )}
    >
      <WidgetHeader
        icon={HardDriveIcon}
        title="Scrutiny"
        onSettingsClick={() => setShowSettings(true)}
        status={
          !loading && configured
            ? error || anyFailed
              ? "error"
              : "success"
            : undefined
        }
        badge={
          data ? (
            <span className="ml-1 inline-flex items-center gap-1 text-[0.5625rem] text-muted-foreground">
              {data.summary.total} drive{data.summary.total !== 1 ? "s" : ""}
            </span>
          ) : undefined
        }
      />

      {data && data.summary.total > 0 && (
        <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-border px-3 py-1.5">
          {data.summary.passed > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[0.5625rem] font-medium text-green-500">
              <span className="size-1.5 rounded-full bg-green-500" />
              {data.summary.passed} passed
            </span>
          )}
          {data.summary.failed > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[0.5625rem] font-medium text-red-500">
              <span className="size-1.5 rounded-full bg-red-500" />
              {data.summary.failed} failed
            </span>
          )}
        </div>
      )}

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
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2 w-36" />
                </div>
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>
        ) : !data || data.drives.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-6">
            <HugeiconsIcon
              icon={HardDriveIcon}
              strokeWidth={1.5}
              className="size-8 text-muted-foreground/30"
            />
            <p className="text-xs text-muted-foreground">No drives found</p>
          </div>
        ) : (
          data.drives.map((drive, index) => (
            <div
              key={`${drive.deviceName}-${index}`}
              className="flex items-center gap-2 px-3 py-2 border-b border-border hover:bg-muted/50"
            >
              <div
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  getStatusDotColor(drive.status)
                )}
                title={drive.status}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs font-medium text-foreground">
                  {drive.deviceName}
                </span>
                <span className="truncate text-[0.625rem] text-muted-foreground">
                  {drive.modelName}
                  {drive.capacity > 0 && ` \u00B7 ${formatCapacity(drive.capacity)}`}
                  {drive.powerOnHours != null &&
                    ` \u00B7 ${formatPowerOnHours(drive.powerOnHours)}`}
                </span>
              </div>
              <span className="shrink-0 text-[0.625rem] text-muted-foreground">
                {drive.temperature != null ? `${drive.temperature}\u00B0C` : "\u2014"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
