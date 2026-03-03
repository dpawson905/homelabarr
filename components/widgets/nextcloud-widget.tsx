"use client"

import { useState, useEffect, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { CloudIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { WidgetHeader } from "@/components/widget-header"
import { DeleteWidgetButton } from "@/components/delete-widget-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { NextcloudResponse } from "@/app/api/widgets/nextcloud/types"

interface NextcloudWidgetProps {
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

function formatCount(n: number): string {
  return n.toLocaleString()
}

function StatCard({
  label,
  value,
}: {
  label: string
  value: string
}): React.ReactElement {
  return (
    <div className="rounded-md bg-muted/50 px-2.5 py-2">
      <p className="text-[0.5625rem] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function SettingsPanel({
  widgetId,
  currentConfig,
  onClose,
  onSaved,
  isSetup = false,
  onDelete,
}: {
  widgetId: string
  currentConfig: Record<string, unknown> | null
  onClose: () => void
  onSaved?: (config: { serviceUrl: string; secretName: string }) => void
  isSetup?: boolean
  onDelete?: () => void
}): React.ReactElement {
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
      <WidgetHeader icon={CloudIcon} title="Nextcloud" isSettings onSettingsClick={onClose} />
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="nextcloud-url">Service URL</Label>
          <Input
            id="nextcloud-url"
            value={serviceUrl}
            onChange={(e) => setServiceUrl(e.target.value)}
            placeholder="https://cloud.example.com"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="nextcloud-secret">Secret Name</Label>
          <Input
            id="nextcloud-secret"
            value={secretName}
            onChange={(e) => setSecretName(e.target.value)}
            placeholder="NEXTCLOUD"
          />
          <p className="text-[0.625rem] text-muted-foreground">
            Name of a secret in Settings (format: username:apppassword)
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || !serviceUrl.trim() || !secretName.trim()}
          className="w-full"
          size="sm"
        >
          {saving ? "Saving..." : isSetup ? "Connect" : "Save Settings"}
        </Button>
        {onDelete && <DeleteWidgetButton onConfirm={onDelete} />}
      </div>
    </div>
  )
}

export function NextcloudWidget({
  widgetId,
  config,
  onDelete,
}: NextcloudWidgetProps): React.ReactElement {
  const [savedConfig, setSavedConfig] = useState({
    serviceUrl: (config?.serviceUrl as string) ?? "",
    secretName: (config?.secretName as string) ?? "",
  })
  const isConfigured = !!(savedConfig.serviceUrl && savedConfig.secretName)

  const [data, setData] = useState<NextcloudResponse | null>(null)
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
        `/api/widgets/nextcloud?widgetId=${encodeURIComponent(widgetId)}`
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }))
        setError(body.error ?? `Error ${res.status}`)
        setData(null)
        return
      }

      const json = (await res.json()) as NextcloudResponse
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

    const interval = setInterval(fetchData, 60_000)
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

  return (
    <div className={cn(
      "flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden",
      !loading && isConfigured && !error && "widget-glow-success",
      !loading && isConfigured && error && "widget-glow-error"
    )}>
      <WidgetHeader
        icon={CloudIcon}
        title="Nextcloud"
        onSettingsClick={() => setShowSettings(true)}
        status={!loading && isConfigured ? (error ? "error" : "success") : undefined}
        badge={
          data ? (
            <span className="ml-1 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[0.5625rem] font-medium text-blue-500">
              v{data.version}
            </span>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-md bg-muted/50 px-2.5 py-2 space-y-1">
                  <Skeleton className="h-2 w-10" />
                  <Skeleton className="h-4 w-8" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-md bg-muted/50 px-2.5 py-2 space-y-1">
                  <Skeleton className="h-2 w-14" />
                  <Skeleton className="h-4 w-10" />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-6">
            <HugeiconsIcon
              icon={CloudIcon}
              strokeWidth={1.5}
              className="size-8 text-muted-foreground/30"
            />
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        ) : data ? (
          <>
            <div>
              <p className="mb-1.5 text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">
                Active Users
              </p>
              <div className="grid grid-cols-3 gap-2">
                <StatCard label="Last 5m" value={formatCount(data.activeUsers.last5min)} />
                <StatCard label="Last 1h" value={formatCount(data.activeUsers.lastHour)} />
                <StatCard label="Last 24h" value={formatCount(data.activeUsers.lastDay)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Free Space" value={formatBytes(data.storage.freeBytes)} />
              <StatCard label="Total Files" value={formatCount(data.storage.totalFiles)} />
              <StatCard label="Shares" value={formatCount(data.shares.total)} />
              <div className="rounded-md bg-muted/50 px-2.5 py-2">
                <p className="text-[0.5625rem] text-muted-foreground">Apps</p>
                <p className="text-sm font-semibold tabular-nums">
                  {formatCount(data.apps.installed)}
                  {data.apps.updatesAvailable > 0 && (
                    <span className="ml-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[0.5625rem] font-medium text-amber-500">
                      {data.apps.updatesAvailable} updates
                    </span>
                  )}
                </p>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
