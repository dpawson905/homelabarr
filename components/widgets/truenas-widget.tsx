"use client"

import { useState, useEffect, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Database01Icon, Settings02Icon, AlertCircleIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { WidgetHeader } from "@/components/widget-header"
import { DeleteWidgetButton } from "@/components/delete-widget-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { TruenasResponse } from "@/app/api/widgets/truenas/types"

interface TruenasWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  return `${hours}h ${minutes}m`
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_099_511_627_776) return `${(bytes / 1_099_511_627_776).toFixed(1)} TiB`
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GiB`
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MiB`
  return `${(bytes / 1024).toFixed(1)} KiB`
}

function statusColor(status: string): string {
  switch (status.toUpperCase()) {
    case "ONLINE":
      return "bg-green-500 text-green-50"
    case "DEGRADED":
      return "bg-yellow-500 text-yellow-50"
    case "FAULTED":
      return "bg-red-500 text-red-50"
    default:
      return "bg-muted text-muted-foreground"
  }
}

interface SettingsPanelProps {
  widgetId: string
  currentConfig: Record<string, unknown> | null
  onClose: () => void
  onSaved?: (config: { serviceUrl: string; secretName: string }) => void
  isSetup?: boolean
  onDelete?: () => void
}

function SettingsPanel({
  widgetId,
  currentConfig,
  onClose,
  onSaved,
  isSetup = false,
  onDelete,
}: SettingsPanelProps): React.ReactElement {
  const [serviceUrl, setServiceUrl] = useState<string>(
    (currentConfig?.serviceUrl as string) ?? ""
  )
  const [secretName, setSecretName] = useState<string>(
    (currentConfig?.secretName as string) ?? ""
  )
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!serviceUrl.trim() || !secretName.trim()) {
      toast.error("URL and secret name are required")
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/widgets/${widgetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            serviceUrl: serviceUrl.trim(),
            secretName: secretName.trim(),
          },
        }),
      })

      if (!res.ok) {
        toast.error("Failed to save settings")
        return
      }

      toast.success("Settings saved")
      onSaved?.({
        serviceUrl: serviceUrl.trim(),
        secretName: secretName.trim(),
      })
      onClose()
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden">
      <WidgetHeader icon={Database01Icon} title="TrueNAS" isSettings onSettingsClick={onClose} />
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="truenas-url">URL</Label>
          <Input
            id="truenas-url"
            value={serviceUrl}
            onChange={(e) => setServiceUrl(e.target.value)}
            placeholder="https://truenas.local"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="truenas-secret">Secret Name</Label>
          <Input
            id="truenas-secret"
            value={secretName}
            onChange={(e) => setSecretName(e.target.value)}
            placeholder="TRUENAS"
          />
          <p className="text-[0.625rem] text-muted-foreground">
            Name of a secret created in Settings (not the raw API key)
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full" size="sm">
          {saving ? "Saving..." : isSetup ? "Connect" : "Save Settings"}
        </Button>
        {onDelete && <DeleteWidgetButton onConfirm={onDelete} />}
      </div>
    </div>
  )
}

export function TruenasWidget({
  widgetId,
  config,
  onDelete,
}: TruenasWidgetProps): React.ReactElement {
  const [savedConfig, setSavedConfig] = useState({
    serviceUrl: (config?.serviceUrl as string) ?? "",
    secretName: (config?.secretName as string) ?? "",
  })
  const isConfigured = !!(savedConfig.serviceUrl && savedConfig.secretName)

  const [data, setData] = useState<TruenasResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(!isConfigured)

  useEffect(() => {
    const incoming = {
      serviceUrl: (config?.serviceUrl as string) ?? "",
      secretName: (config?.secretName as string) ?? "",
    }
    setSavedConfig(incoming)
  }, [config])

  const fetchData = useCallback(async () => {
    if (!isConfigured) return

    try {
      const res = await fetch(
        `/api/widgets/truenas?widgetId=${encodeURIComponent(widgetId)}`
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }))
        setError(body.error ?? `Error ${res.status}`)
        setData(null)
        return
      }

      const json = (await res.json()) as TruenasResponse
      setError(null)
      setData(json)
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

    const interval = setInterval(fetchData, 30_000)
    return () => clearInterval(interval)
  }, [fetchData, isConfigured])

  if (showSettings || !isConfigured) {
    return (
      <SettingsPanel
        widgetId={widgetId}
        currentConfig={config}
        onClose={() => {
          if (isConfigured) setShowSettings(false)
        }}
        onSaved={(cfg) => {
          setSavedConfig(cfg)
          setLoading(true)
        }}
        isSetup={!isConfigured}
        onDelete={onDelete}
      />
    )
  }

  if (!loading && error) {
    return (
      <div className={cn(
        "flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden",
        isConfigured && "widget-glow-error"
      )}>
        <WidgetHeader
          icon={Database01Icon}
          title="TrueNAS"
          onSettingsClick={() => setShowSettings(true)}
          status="error"
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
          <HugeiconsIcon
            icon={Database01Icon}
            strokeWidth={1.5}
            className="size-10 text-muted-foreground/30"
          />
          <p className="text-sm font-medium text-muted-foreground">
            Cannot connect to TrueNAS
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
        icon={Database01Icon}
        title="TrueNAS"
        onSettingsClick={() => setShowSettings(true)}
        status={!loading && isConfigured ? (error ? "error" : "success") : undefined}
      />

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-md bg-muted/50 px-2.5 py-2 space-y-1">
                  <Skeleton className="h-2 w-14" />
                  <Skeleton className="h-4 w-10" />
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-10" />
                </div>
              ))}
            </div>
          </div>
        ) : data ? (
          <>
            {/* System Info */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md bg-muted/50 px-2.5 py-2">
                <p className="text-[0.5625rem] text-muted-foreground">Hostname</p>
                <p className="text-sm font-semibold truncate">{data.hostname}</p>
              </div>
              <div className="rounded-md bg-muted/50 px-2.5 py-2">
                <p className="text-[0.5625rem] text-muted-foreground">Version</p>
                <p className="text-sm font-semibold truncate">{data.version}</p>
              </div>
              <div className="col-span-2 rounded-md bg-muted/50 px-2.5 py-2">
                <p className="text-[0.5625rem] text-muted-foreground">Uptime</p>
                <p className="text-sm font-semibold tabular-nums">{formatUptime(data.uptimeSeconds)}</p>
              </div>
            </div>

            {/* Pools */}
            {data.pools.length > 0 && (
              <div>
                <p className="mb-1.5 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
                  Pools
                </p>
                <div className="space-y-2">
                  {data.pools.map((pool) => (
                    <div key={pool.name} className="rounded-md bg-muted/50 px-2.5 py-2 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium truncate">{pool.name}</span>
                        <span
                          className={cn(
                            "shrink-0 ml-2 rounded px-1.5 py-0.5 text-[0.5625rem] font-medium",
                            statusColor(pool.status)
                          )}
                        >
                          {pool.status}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between text-[0.5625rem] text-muted-foreground">
                          <span>{formatBytes(pool.usedBytes)} / {formatBytes(pool.totalBytes)}</span>
                          <span className="tabular-nums">{pool.usedPercentage.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              pool.usedPercentage >= 90
                                ? "bg-red-500"
                                : pool.usedPercentage >= 75
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                            )}
                            style={{ width: `${Math.min(pool.usedPercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alerts */}
            {(data.alerts.warning > 0 || data.alerts.critical > 0) && (
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={AlertCircleIcon}
                  strokeWidth={2}
                  className={cn(
                    "size-3.5 shrink-0",
                    data.alerts.critical > 0 ? "text-red-500" : "text-yellow-500"
                  )}
                />
                <div className="flex items-center gap-2 text-xs">
                  {data.alerts.critical > 0 && (
                    <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[0.625rem] font-medium text-red-500">
                      {data.alerts.critical} critical
                    </span>
                  )}
                  {data.alerts.warning > 0 && (
                    <span className="rounded bg-yellow-500/10 px-1.5 py-0.5 text-[0.625rem] font-medium text-yellow-500">
                      {data.alerts.warning} warning
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
