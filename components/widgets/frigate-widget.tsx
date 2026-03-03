"use client"

import { useState, useEffect, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { CctvCameraIcon, Settings02Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { WidgetHeader } from "@/components/widget-header"
import { DeleteWidgetButton } from "@/components/delete-widget-button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { FrigateResponse } from "@/app/api/widgets/frigate/types"

interface FrigateWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
}

const POLL_INTERVAL_MS = 15_000

function formatUptime(seconds: number): string {
  if (seconds <= 0) return "N/A"
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function SettingsPanel({
  formServiceUrl,
  saving,
  onChangeServiceUrl,
  onSave,
  submitLabel,
}: {
  formServiceUrl: string
  saving: boolean
  onChangeServiceUrl: (v: string) => void
  onSave: () => void
  submitLabel: string
}): React.ReactElement {
  const canSave = !saving && !!formServiceUrl.trim()

  return (
    <>
      <Input
        placeholder="http://frigate.local:5000"
        value={formServiceUrl}
        onChange={(e) => onChangeServiceUrl(e.target.value)}
      />
      <p className="text-[0.5625rem] text-muted-foreground text-center">
        Enter your Frigate NVR URL. No authentication needed.
      </p>
      <Button size="sm" onClick={onSave} disabled={!canSave} className="w-full">
        {saving ? "Saving..." : submitLabel}
      </Button>
    </>
  )
}

export function FrigateWidget({
  widgetId,
  config,
  onDelete,
}: FrigateWidgetProps): React.ReactElement {
  const [savedConfig, setSavedConfig] = useState({
    serviceUrl: (config?.serviceUrl as string) ?? "",
  })
  const isConfigured = !!savedConfig.serviceUrl

  const [data, setData] = useState<FrigateResponse | null>(null)
  const [loading, setLoading] = useState(isConfigured)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const [formServiceUrl, setFormServiceUrl] = useState(savedConfig.serviceUrl)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const incoming = {
      serviceUrl: (config?.serviceUrl as string) ?? "",
    }
    setSavedConfig(incoming)
    setFormServiceUrl(incoming.serviceUrl)
  }, [config])

  const fetchData = useCallback(async () => {
    if (!isConfigured) return

    try {
      const res = await fetch(`/api/widgets/frigate?widgetId=${widgetId}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }))
        setError(body.error ?? `Error ${res.status}`)
        setData(null)
        return
      }
      setData(await res.json())
      setError(null)
    } catch {
      setError("Failed to connect")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [widgetId, isConfigured])

  useEffect(() => {
    if (!isConfigured) return
    fetchData()
    const interval = setInterval(fetchData, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchData, isConfigured])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/widgets/${widgetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: { serviceUrl: formServiceUrl },
        }),
      })
      if (res.ok) {
        setSavedConfig({ serviceUrl: formServiceUrl })
        setShowSettings(false)
        setLoading(true)
      } else {
        toast.error("Failed to save Frigate settings")
      }
    } catch {
      toast.error("Failed to save Frigate settings")
    } finally {
      setSaving(false)
    }
  }

  const sharedFormProps = {
    formServiceUrl,
    saving,
    onChangeServiceUrl: setFormServiceUrl,
    onSave: handleSave,
  }

  // Unconfigured state — show inline setup form
  if (!isConfigured && !showSettings) {
    return (
      <div className="h-full w-full flex flex-col rounded-lg border border-border bg-card overflow-hidden">
        <WidgetHeader icon={CctvCameraIcon} title="Frigate NVR" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
          <HugeiconsIcon
            icon={CctvCameraIcon}
            strokeWidth={1.5}
            className="size-8 text-muted-foreground/30"
          />
          <p className="text-xs text-muted-foreground text-center">
            Connect to Frigate NVR
          </p>
          <div className="flex w-full max-w-xs flex-col gap-2">
            <SettingsPanel {...sharedFormProps} submitLabel="Connect" />
          </div>
        </div>
      </div>
    )
  }

  // Settings panel
  if (showSettings) {
    return (
      <div className="h-full w-full flex flex-col rounded-lg border border-border bg-card overflow-hidden">
        <WidgetHeader
          icon={CctvCameraIcon}
          title="Frigate NVR"
          isSettings
          onSettingsClick={() => setShowSettings(false)}
        />
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <SettingsPanel {...sharedFormProps} submitLabel="Save Settings" />
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
          icon={CctvCameraIcon}
          title="Frigate NVR"
          onSettingsClick={() => setShowSettings(true)}
          status="error"
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
          <HugeiconsIcon
            icon={CctvCameraIcon}
            strokeWidth={1.5}
            className="size-10 text-muted-foreground/30"
          />
          <p className="text-sm font-medium text-muted-foreground">
            Cannot connect to Frigate NVR
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
        "h-full w-full flex flex-col rounded-lg border border-border bg-card overflow-hidden",
        !loading && isConfigured && !error && "widget-glow",
        !loading && isConfigured && error && "widget-glow-error"
      )}
    >
      <WidgetHeader
        icon={CctvCameraIcon}
        title="Frigate NVR"
        onSettingsClick={() => setShowSettings(true)}
        status={!loading && isConfigured ? (error ? "error" : "success") : undefined}
        badge={
          data ? (
            <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[0.5625rem]">
              {data.cameras.length} cam{data.cameras.length !== 1 ? "s" : ""}
            </Badge>
          ) : undefined
        }
      />

      {/* Summary bar */}
      {data && (
        <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-border px-3 py-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[0.5625rem] font-medium text-primary">
            {data.cameras.length} camera{data.cameras.length !== 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[0.5625rem] font-medium text-amber-500">
            {data.totalDetections} detection{data.totalDetections !== 1 ? "s" : ""} today
          </span>
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
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-2 w-40" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        ) : !data || data.cameras.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-6">
            <HugeiconsIcon
              icon={CctvCameraIcon}
              strokeWidth={1.5}
              className="size-8 text-muted-foreground/30"
            />
            <p className="text-xs text-muted-foreground">No cameras found</p>
          </div>
        ) : (
          <>
            {/* Camera list */}
            {data.cameras.map((camera) => (
              <div
                key={camera.name}
                className="flex items-center gap-2 px-3 py-2 border-b border-border hover:bg-muted/50"
              >
                <div className="size-2 shrink-0 rounded-full bg-green-500" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-xs font-medium text-foreground">
                    {camera.name}
                  </span>
                  <span className="text-[0.625rem] text-muted-foreground">
                    {camera.fps.toFixed(1)} FPS | Detection: {camera.detectionFps.toFixed(1)} FPS
                  </span>
                </div>
              </div>
            ))}

            {/* Detectors */}
            {data.detectors.length > 0 && (
              <div className="border-b border-border px-3 py-2">
                <span className="text-[0.5625rem] font-medium uppercase tracking-wider text-muted-foreground">
                  Detectors
                </span>
                {data.detectors.map((detector) => (
                  <div
                    key={detector.name}
                    className="mt-1 flex items-center justify-between"
                  >
                    <span className="text-xs text-foreground">{detector.name}</span>
                    <span className="text-[0.625rem] text-muted-foreground">
                      {detector.inferenceSpeed.toFixed(1)} ms
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Version + Uptime footer */}
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-[0.5625rem] text-muted-foreground">
                v{data.version}
              </span>
              <span className="text-[0.5625rem] text-muted-foreground">
                Uptime: {formatUptime(data.uptimeSeconds)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
