"use client"

import { useState, useEffect, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { DashboardSpeed01Icon, Settings02Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { WidgetHeader } from "@/components/widget-header"
import { DeleteWidgetButton } from "@/components/delete-widget-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { SpeedtestResponse } from "@/app/api/widgets/speedtest/types"

interface SpeedtestWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
}

const POLL_INTERVAL_MS = 60_000

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function isConfigured(config: Record<string, unknown> | null): boolean {
  return (
    typeof config?.serviceUrl === "string" &&
    config.serviceUrl.length > 0 &&
    typeof config?.secretName === "string" &&
    config.secretName.length > 0
  )
}

export function SpeedtestWidget({
  widgetId,
  config,
  onDelete,
}: SpeedtestWidgetProps): React.ReactElement {
  const [savedConfig, setSavedConfig] = useState({
    serviceUrl: (config?.serviceUrl as string) ?? "",
    secretName: (config?.secretName as string) ?? "",
  })
  const configured = !!savedConfig.serviceUrl && !!savedConfig.secretName

  const [data, setData] = useState<SpeedtestResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const [settingsServiceUrl, setSettingsServiceUrl] = useState(savedConfig.serviceUrl)
  const [settingsSecretName, setSettingsSecretName] = useState(savedConfig.secretName)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const incoming = {
      serviceUrl: (config?.serviceUrl as string) ?? "",
      secretName: (config?.secretName as string) ?? "",
    }
    setSavedConfig(incoming)
    setSettingsServiceUrl(incoming.serviceUrl)
    setSettingsSecretName(incoming.secretName)
  }, [config])

  const fetchData = useCallback(async () => {
    if (!configured) {
      setLoading(false)
      return
    }

    try {
      const params = new URLSearchParams({ widgetId })
      const res = await fetch(`/api/widgets/speedtest?${params}`)

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }))
        setError(body.error ?? `Error ${res.status}`)
        setData(null)
        return
      }

      const json: SpeedtestResponse = await res.json()
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
            secretName: settingsSecretName,
          },
        }),
      })

      if (!res.ok) {
        toast.error("Failed to save settings")
        return
      }

      setSavedConfig({
        serviceUrl: settingsServiceUrl,
        secretName: settingsSecretName,
      })
      setShowSettings(false)
      setLoading(true)
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  // Settings / setup view
  if (showSettings || !configured) {
    return (
      <div className="flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden">
        <WidgetHeader
          icon={DashboardSpeed01Icon}
          title="Speedtest"
          isSettings
          settingsTitle={configured ? "Speedtest Settings" : "Setup Speedtest"}
          onSettingsClick={configured ? () => setShowSettings(false) : undefined}
        />

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="speedtest-url">Service URL</Label>
            <Input
              id="speedtest-url"
              value={settingsServiceUrl}
              onChange={(e) => setSettingsServiceUrl(e.target.value)}
              placeholder="http://speedtest.local"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="speedtest-secret">Secret Name</Label>
            <Input
              id="speedtest-secret"
              value={settingsSecretName}
              onChange={(e) => setSettingsSecretName(e.target.value)}
              placeholder="SPEEDTEST"
            />
            <p className="text-[0.625rem] text-muted-foreground">
              Name of a secret created in Settings (not the raw token)
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
          icon={DashboardSpeed01Icon}
          title="Speedtest"
          onSettingsClick={() => setShowSettings(true)}
          status="error"
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
          <HugeiconsIcon
            icon={DashboardSpeed01Icon}
            strokeWidth={1.5}
            className="size-10 text-muted-foreground/30"
          />
          <p className="text-sm font-medium text-muted-foreground">
            Cannot connect to Speedtest
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
        icon={DashboardSpeed01Icon}
        title="Speedtest"
        onSettingsClick={() => setShowSettings(true)}
        status={!loading && configured ? (error ? "error" : "success") : undefined}
      />

      <div className="flex flex-1 flex-col justify-center overflow-y-auto">
        {loading ? (
          <div className="space-y-3 p-3">
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 rounded-md bg-muted/50 p-2">
                  <Skeleton className="h-2.5 w-10" />
                  <Skeleton className="h-5 w-14" />
                </div>
              ))}
            </div>
            <Skeleton className="mx-auto h-2.5 w-32" />
          </div>
        ) : !data?.latest ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-6">
            <HugeiconsIcon
              icon={DashboardSpeed01Icon}
              strokeWidth={1.5}
              className="size-8 text-muted-foreground/30"
            />
            <p className="text-xs text-muted-foreground">No speedtest results</p>
          </div>
        ) : (
          <div className="space-y-2 p-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center gap-0.5 rounded-md bg-muted/50 p-2">
                <span className="text-[0.5625rem] font-medium text-muted-foreground">
                  Download
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {data.latest.download.toFixed(1)}
                </span>
                <span className="text-[0.5rem] text-muted-foreground">Mbps</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 rounded-md bg-muted/50 p-2">
                <span className="text-[0.5625rem] font-medium text-muted-foreground">
                  Upload
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {data.latest.upload.toFixed(1)}
                </span>
                <span className="text-[0.5rem] text-muted-foreground">Mbps</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 rounded-md bg-muted/50 p-2">
                <span className="text-[0.5625rem] font-medium text-muted-foreground">
                  Ping
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {Math.round(data.latest.ping)}
                </span>
                <span className="text-[0.5rem] text-muted-foreground">ms</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-[0.5625rem] text-muted-foreground">
                {data.latest.serverName} &middot; {formatRelativeTime(data.latest.testTime)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
