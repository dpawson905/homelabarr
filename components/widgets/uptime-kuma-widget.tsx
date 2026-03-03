"use client"

import { useState, useEffect, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Activity01Icon, Settings02Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { WidgetHeader } from "@/components/widget-header"
import { DeleteWidgetButton } from "@/components/delete-widget-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { Monitor, UptimeKumaResponse } from "@/app/api/widgets/uptime-kuma/types"

interface UptimeKumaWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
}

interface SettingsFormProps {
  formServiceUrl: string
  formSlug: string
  formDataSource: string
  saving: boolean
  onChangeServiceUrl: (v: string) => void
  onChangeSlug: (v: string) => void
  onChangeDataSource: (v: string) => void
  onSave: () => void
  submitLabel: string
}

const POLL_INTERVAL_MS = 60_000

function getStatusDotColor(status: Monitor["status"]): string {
  switch (status) {
    case "up":
      return "bg-green-500"
    case "down":
      return "bg-red-500"
    case "pending":
      return "bg-amber-500"
    case "maintenance":
      return "bg-blue-500"
    default:
      return "bg-gray-400"
  }
}

function getUptimeColor(uptime: number): string {
  if (uptime < 0) return "text-muted-foreground"
  if (uptime >= 99) return "text-green-500"
  if (uptime >= 95) return "text-amber-500"
  return "text-red-500"
}

function formatUptime(uptime: number): string {
  if (uptime < 0) return "N/A"
  return `${uptime.toFixed(1)}%`
}

function SettingsForm({
  formServiceUrl,
  formSlug,
  formDataSource,
  saving,
  onChangeServiceUrl,
  onChangeSlug,
  onChangeDataSource,
  onSave,
  submitLabel,
}: SettingsFormProps): React.ReactElement {
  const canSave =
    !saving &&
    !!formServiceUrl.trim() &&
    (formDataSource !== "status-page" || !!formSlug.trim())

  return (
    <>
      <Input
        placeholder="http://uptime-kuma.local:3001"
        value={formServiceUrl}
        onChange={(e) => onChangeServiceUrl(e.target.value)}
      />
      <div className="space-y-1.5">
        <Label className="text-[0.625rem]">Data Source</Label>
        <Select value={formDataSource} onValueChange={onChangeDataSource}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="status-page">Status Page</SelectItem>
            <SelectItem value="metrics">Prometheus Metrics</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {formDataSource === "status-page" && (
        <Input
          placeholder="my-status-page"
          value={formSlug}
          onChange={(e) => onChangeSlug(e.target.value)}
        />
      )}
      <p className="text-[0.5625rem] text-muted-foreground text-center">
        Create a Status Page in Uptime Kuma, then enter its slug here. No API
        key needed.
      </p>
      <Button size="sm" onClick={onSave} disabled={!canSave} className="w-full">
        {saving ? "Saving..." : submitLabel}
      </Button>
    </>
  )
}

export function UptimeKumaWidget({
  widgetId,
  config,
  onDelete,
}: UptimeKumaWidgetProps): React.ReactElement {
  const [savedConfig, setSavedConfig] = useState({
    serviceUrl: (config?.serviceUrl as string) ?? "",
    slug: (config?.slug as string) ?? "",
    dataSource: (config?.dataSource as string) ?? "status-page",
  })
  const isConfigured = !!savedConfig.serviceUrl && (savedConfig.dataSource === "metrics" || !!savedConfig.slug)

  const [data, setData] = useState<UptimeKumaResponse | null>(null)
  const [loading, setLoading] = useState(isConfigured)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const [formServiceUrl, setFormServiceUrl] = useState(savedConfig.serviceUrl)
  const [formSlug, setFormSlug] = useState(savedConfig.slug)
  const [formDataSource, setFormDataSource] = useState(savedConfig.dataSource)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const incoming = {
      serviceUrl: (config?.serviceUrl as string) ?? "",
      slug: (config?.slug as string) ?? "",
      dataSource: (config?.dataSource as string) ?? "status-page",
    }
    setSavedConfig(incoming)
    setFormServiceUrl(incoming.serviceUrl)
    setFormSlug(incoming.slug)
    setFormDataSource(incoming.dataSource)
  }, [config])

  const fetchData = useCallback(async () => {
    if (!isConfigured) return

    try {
      const res = await fetch(`/api/widgets/uptime-kuma?widgetId=${widgetId}`)
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
          config: {
            serviceUrl: formServiceUrl,
            slug: formSlug,
            dataSource: formDataSource,
          },
        }),
      })
      if (res.ok) {
        setSavedConfig({
          serviceUrl: formServiceUrl,
          slug: formSlug,
          dataSource: formDataSource,
        })
        setShowSettings(false)
        setLoading(true)
      }
    } catch (error) {
      console.warn("Failed to save Uptime Kuma config:", error)
    } finally {
      setSaving(false)
    }
  }

  const sharedFormProps = {
    formServiceUrl,
    formSlug,
    formDataSource,
    saving,
    onChangeServiceUrl: setFormServiceUrl,
    onChangeSlug: setFormSlug,
    onChangeDataSource: setFormDataSource,
    onSave: handleSave,
  }

  if (!isConfigured && !showSettings) {
    return (
      <div className="h-full w-full flex flex-col rounded-lg border border-border bg-card overflow-hidden">
        <WidgetHeader
          icon={Activity01Icon}
          title="Uptime Kuma"
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
          <HugeiconsIcon
            icon={Activity01Icon}
            strokeWidth={1.5}
            className="size-8 text-muted-foreground/30"
          />
          <p className="text-xs text-muted-foreground text-center">
            Connect to Uptime Kuma
          </p>
          <div className="flex w-full max-w-xs flex-col gap-2">
            <SettingsForm {...sharedFormProps} submitLabel="Connect" />
          </div>
        </div>
      </div>
    )
  }

  if (showSettings) {
    return (
      <div className="h-full w-full flex flex-col rounded-lg border border-border bg-card overflow-hidden">
        <WidgetHeader
          icon={Activity01Icon}
          title="Uptime Kuma"
          isSettings
          onSettingsClick={() => setShowSettings(false)}
        />
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <SettingsForm {...sharedFormProps} submitLabel="Save Settings" />
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
          icon={Activity01Icon}
          title="Uptime Kuma"
          onSettingsClick={() => setShowSettings(true)}
          status="error"
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
          <HugeiconsIcon
            icon={Activity01Icon}
            strokeWidth={1.5}
            className="size-10 text-muted-foreground/30"
          />
          <p className="text-sm font-medium text-muted-foreground">
            Cannot connect to Uptime Kuma
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
      "h-full w-full flex flex-col rounded-lg border border-border bg-card overflow-hidden",
      !loading && isConfigured && !error && "widget-glow-success",
      !loading && isConfigured && error && "widget-glow-error"
    )}>
      <WidgetHeader
        icon={Activity01Icon}
        title={data?.statusPageName ?? "Uptime Kuma"}
        onSettingsClick={() => setShowSettings(true)}
        status={!loading && isConfigured ? (error ? "error" : "success") : undefined}
        badge={
          data ? (
            <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[0.5625rem]">
              {data.summary.up}/{data.summary.total} up
            </Badge>
          ) : undefined
        }
      />

      {data && data.summary.total > 0 && (
        <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-border px-3 py-1.5">
          {data.summary.up > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[0.5625rem] font-medium text-green-500">
              <span className="size-1.5 rounded-full bg-green-500" />
              {data.summary.up} up
            </span>
          )}
          {data.summary.down > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[0.5625rem] font-medium text-red-500">
              <span className="size-1.5 rounded-full bg-red-500" />
              {data.summary.down} down
            </span>
          )}
          {data.summary.pending > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[0.5625rem] font-medium text-amber-500">
              <span className="size-1.5 rounded-full bg-amber-500" />
              {data.summary.pending} pending
            </span>
          )}
          {data.summary.maintenance > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[0.5625rem] font-medium text-blue-500">
              <span className="size-1.5 rounded-full bg-blue-500" />
              {data.summary.maintenance} maintenance
            </span>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
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
        ) : !data || data.monitors.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-6">
            <HugeiconsIcon
              icon={Activity01Icon}
              strokeWidth={1.5}
              className="size-8 text-muted-foreground/30"
            />
            <p className="text-xs text-muted-foreground">No monitors found</p>
          </div>
        ) : (
          data.monitors.map((monitor) => (
            <div
              key={monitor.id}
              className="flex items-center gap-2 px-3 py-2 border-b border-border hover:bg-muted/50"
            >
              <div
                className={cn("size-2 shrink-0 rounded-full", getStatusDotColor(monitor.status))}
                title={monitor.status}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs font-medium text-foreground">
                  {monitor.name}
                </span>
                <span className="text-[0.625rem] text-muted-foreground">
                  <span className={getUptimeColor(monitor.uptime24h)}>
                    24h: {formatUptime(monitor.uptime24h)}
                  </span>
                  {" | "}
                  <span className={getUptimeColor(monitor.uptime30d)}>
                    30d: {formatUptime(monitor.uptime30d)}
                  </span>
                </span>
              </div>
              <span className="shrink-0 text-[0.625rem] text-muted-foreground">
                {monitor.responseTime > 0 ? `${monitor.responseTime}ms` : "—"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
