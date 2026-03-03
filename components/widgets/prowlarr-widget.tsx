"use client"

import { useState, useEffect, useCallback } from "react"
import { Search01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { WidgetHeader } from "@/components/widget-header"
import { DeleteWidgetButton } from "@/components/delete-widget-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { ProwlarrResponse } from "@/app/api/widgets/prowlarr/types"

interface ProwlarrWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
}

const POLL_INTERVAL_MS = 30_000

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
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
      <WidgetHeader icon={Search01Icon} title="Prowlarr" isSettings onSettingsClick={onClose} />
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="prowlarr-url">URL</Label>
          <Input
            id="prowlarr-url"
            value={serviceUrl}
            onChange={(e) => setServiceUrl(e.target.value)}
            placeholder="http://prowlarr.local:9696"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="prowlarr-secret">Secret Name</Label>
          <Input
            id="prowlarr-secret"
            value={secretName}
            onChange={(e) => setSecretName(e.target.value)}
            placeholder="PROWLARR"
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

function StatCard({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}): React.ReactElement {
  return (
    <div className={cn("rounded-md bg-muted/50 px-2.5 py-2", className)}>
      <p className="text-[0.5625rem] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  )
}

export function ProwlarrWidget({
  widgetId,
  config,
  onDelete,
}: ProwlarrWidgetProps): React.ReactElement {
  const [savedConfig, setSavedConfig] = useState({
    serviceUrl: (config?.serviceUrl as string) ?? "",
    secretName: (config?.secretName as string) ?? "",
  })
  const isConfigured = !!(savedConfig.serviceUrl && savedConfig.secretName)

  const [data, setData] = useState<ProwlarrResponse | null>(null)
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
        `/api/widgets/prowlarr?widgetId=${encodeURIComponent(widgetId)}`
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }))
        setError(body.error ?? `Error ${res.status}`)
        setData(null)
        return
      }

      const json = (await res.json()) as ProwlarrResponse
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

    const interval = setInterval(fetchData, POLL_INTERVAL_MS)
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

  const healthWarningCount = data?.health?.length ?? 0
  const totalFailed = (data?.failedGrabs ?? 0) + (data?.failedQueries ?? 0)

  return (
    <div className={cn(
      "flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden",
      !loading && isConfigured && !error && "widget-glow-success",
      !loading && isConfigured && error && "widget-glow-error"
    )}>
      <WidgetHeader
        icon={Search01Icon}
        title="Prowlarr"
        onSettingsClick={() => setShowSettings(true)}
        status={!loading && isConfigured ? (error ? "error" : "success") : undefined}
        badge={
          healthWarningCount > 0 ? (
            <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[0.5625rem]">
              {healthWarningCount} {healthWarningCount === 1 ? "warning" : "warnings"}
            </Badge>
          ) : undefined
        }
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
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <StatCard
                label="Indexers"
                value={`${data.indexers.enabled}/${data.indexers.total}`}
              />
              <StatCard
                label="Grabs"
                value={formatNumber(data.grabs)}
              />
              <StatCard
                label="Queries"
                value={formatNumber(data.queries)}
              />
              <StatCard
                label="Failed"
                value={formatNumber(totalFailed)}
                className={totalFailed > 0 ? "text-red-500" : undefined}
              />
            </div>

            {data.health.length > 0 && (
              <div>
                <p className="mb-1.5 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
                  Health Warnings
                </p>
                <div className="space-y-1.5">
                  {data.health.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded px-1.5 py-1 hover:bg-muted/50"
                    >
                      <span
                        className={cn(
                          "mt-0.5 inline-flex shrink-0 items-center rounded px-1 py-0.5 text-[0.5rem] font-medium uppercase leading-none",
                          item.type === "error"
                            ? "bg-red-500/10 text-red-500"
                            : "bg-amber-500/10 text-amber-500"
                        )}
                      >
                        {item.type}
                      </span>
                      <span className="text-xs text-muted-foreground leading-tight">
                        {item.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
