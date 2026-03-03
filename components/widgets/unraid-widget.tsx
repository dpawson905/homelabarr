"use client"

import { useState, useEffect, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ServerStack01Icon, Settings02Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { WidgetHeader } from "@/components/widget-header"
import { DeleteWidgetButton } from "@/components/delete-widget-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { UnraidResponse } from "@/app/api/widgets/unraid/types"

interface UnraidWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B"
  const tb = bytes / (1024 * 1024 * 1024 * 1024)
  if (tb >= 1) return `${tb.toFixed(1)} TB`
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(0)} MB`
}

function formatUptime(seconds: number): string {
  if (seconds <= 0) return "0m"
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function usageColor(pct: number): string {
  if (pct >= 80) return "bg-red-500"
  if (pct >= 60) return "bg-amber-500"
  return "bg-green-500"
}

function isConfigured(config: Record<string, unknown> | null): boolean {
  return (
    typeof config?.serviceUrl === "string" &&
    config.serviceUrl.length > 0 &&
    typeof config?.secretName === "string" &&
    config.secretName.length > 0
  )
}

function UsageBar({ label, pct }: { label: string; pct: number }): React.ReactElement {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-7 shrink-0 text-[0.5625rem] text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", usageColor(pct))}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-[0.5625rem] text-muted-foreground">
        {pct.toFixed(0)}%
      </span>
    </div>
  )
}

function LoadingSkeleton(): React.ReactElement {
  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-8" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function UnraidWidget({
  widgetId,
  config,
  onDelete,
}: UnraidWidgetProps): React.ReactElement {
  const [savedConfig, setSavedConfig] = useState({
    serviceUrl: (config?.serviceUrl as string) ?? "",
    secretName: (config?.secretName as string) ?? "",
  })
  const configured = isConfigured(savedConfig as Record<string, unknown>)

  const [data, setData] = useState<UnraidResponse | null>(null)
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
      const res = await fetch(`/api/widgets/unraid?${params}`)

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }))
        setError(body.error ?? `Error ${res.status}`)
        setData(null)
        return
      }

      const json: UnraidResponse = await res.json()
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

    const interval = setInterval(fetchData, 30_000)
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

  if (showSettings || !configured) {
    return (
      <div className="flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden">
        <WidgetHeader
          icon={ServerStack01Icon}
          title="Unraid"
          isSettings
          settingsTitle={configured ? "Unraid Settings" : "Setup Unraid"}
          onSettingsClick={configured ? () => setShowSettings(false) : undefined}
        />

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="unraid-url">Service URL</Label>
            <Input
              id="unraid-url"
              value={settingsServiceUrl}
              onChange={(e) => setSettingsServiceUrl(e.target.value)}
              placeholder="http://unraid.local"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="unraid-secret">Secret Name</Label>
            <Input
              id="unraid-secret"
              value={settingsSecretName}
              onChange={(e) => setSettingsSecretName(e.target.value)}
              placeholder="UNRAID"
            />
            <p className="text-[0.625rem] text-muted-foreground">
              Name of a secret created in Settings (not the raw API key)
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
          icon={ServerStack01Icon}
          title="Unraid"
          onSettingsClick={() => setShowSettings(true)}
          status="error"
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
          <HugeiconsIcon
            icon={ServerStack01Icon}
            strokeWidth={1.5}
            className="size-10 text-muted-foreground/30"
          />
          <p className="text-sm font-medium text-muted-foreground">
            Cannot connect to Unraid
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

  const arrayPct =
    data && data.arrayTotal > 0
      ? (data.arrayUsed / data.arrayTotal) * 100
      : 0

  const memPct =
    data && data.memoryTotal > 0
      ? (data.memoryUsed / data.memoryTotal) * 100
      : 0

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden",
        !loading && configured && !error && "widget-glow-success",
        !loading && configured && error && "widget-glow-error"
      )}
    >
      <WidgetHeader
        icon={ServerStack01Icon}
        title="Unraid"
        onSettingsClick={() => setShowSettings(true)}
        status={!loading && configured ? (error ? "error" : "success") : undefined}
        badge={
          data !== null ? (
            <span
              className={cn(
                "ml-1 rounded-full px-1.5 py-0.5 text-[0.5625rem] font-medium",
                data.arrayState === "Started"
                  ? "bg-green-500/10 text-green-500"
                  : "bg-red-500/10 text-red-500"
              )}
            >
              {data.arrayState}
            </span>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <LoadingSkeleton />
        ) : !data ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-6">
            <HugeiconsIcon
              icon={ServerStack01Icon}
              strokeWidth={1.5}
              className="size-8 text-muted-foreground/30"
            />
            <p className="text-xs text-muted-foreground">Could not load Unraid data</p>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {/* Array usage */}
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[0.625rem] font-medium text-muted-foreground">Array</span>
                <span className="text-[0.625rem] font-medium text-foreground">
                  {formatBytes(data.arrayUsed)} / {formatBytes(data.arrayTotal)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    usageColor(arrayPct)
                  )}
                  style={{ width: `${Math.min(arrayPct, 100)}%` }}
                />
              </div>
            </div>

            {/* CPU / Memory / Uptime */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <UsageBar label="CPU" pct={data.cpuPercent} />
              </div>
              <div className="space-y-1">
                <UsageBar label="RAM" pct={memPct} />
              </div>
            </div>

            {/* Containers + VMs + Uptime */}
            <div className="flex items-center gap-3 text-[0.625rem] text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">{data.containers.running}</span>{" "}
                running
              </span>
              <span className="text-border">|</span>
              <span>
                <span className="font-medium text-foreground">{data.vms.running}</span>{" "}
                VM{data.vms.running !== 1 ? "s" : ""}
              </span>
              <span className="text-border">|</span>
              <span>{formatUptime(data.uptime)}</span>
            </div>

            {/* Disk list */}
            {data.disks.length > 0 && (
              <div className="space-y-0.5">
                <span className="text-[0.5625rem] font-medium text-muted-foreground">Disks</span>
                <div className="max-h-32 overflow-y-auto rounded border border-border">
                  {data.disks.map((disk) => (
                    <div
                      key={disk.name}
                      className="flex items-center justify-between px-2 py-1.5 border-b border-border last:border-b-0"
                    >
                      <span className="truncate text-[0.625rem] font-medium text-foreground">
                        {disk.name}
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        {disk.temp !== null && (
                          <span className="text-[0.5625rem] text-muted-foreground">
                            {disk.temp}&deg;C
                          </span>
                        )}
                        {disk.numErrors > 0 && (
                          <span className="text-[0.5625rem] font-medium text-red-500">
                            {disk.numErrors} err
                          </span>
                        )}
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            disk.status === "DISK_OK" ? "bg-green-500" : "bg-red-500"
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
