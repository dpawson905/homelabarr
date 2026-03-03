"use client"

import { useState, useEffect, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Globe02Icon, Settings02Icon, AlertCircleIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { WidgetHeader } from "@/components/widget-header"
import { DeleteWidgetButton } from "@/components/delete-widget-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { NpmResponse } from "@/app/api/widgets/nginx-proxy/types"

interface NginxProxyWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
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
      <WidgetHeader icon={Globe02Icon} title="Nginx Proxy Manager" isSettings onSettingsClick={onClose} />
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="npm-url">URL</Label>
          <Input
            id="npm-url"
            value={serviceUrl}
            onChange={(e) => setServiceUrl(e.target.value)}
            placeholder="http://npm.local:81"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="npm-secret">Secret Name</Label>
          <Input
            id="npm-secret"
            value={secretName}
            onChange={(e) => setSecretName(e.target.value)}
            placeholder="NPM"
          />
          <p className="text-[0.625rem] text-muted-foreground">
            Name of a secret in Settings (format: email:password)
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

export function NginxProxyWidget({
  widgetId,
  config,
  onDelete,
}: NginxProxyWidgetProps): React.ReactElement {
  const [savedConfig, setSavedConfig] = useState({
    serviceUrl: (config?.serviceUrl as string) ?? "",
    secretName: (config?.secretName as string) ?? "",
  })
  const isConfigured = !!(savedConfig.serviceUrl && savedConfig.secretName)

  const [data, setData] = useState<NpmResponse | null>(null)
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
        `/api/widgets/nginx-proxy?widgetId=${encodeURIComponent(widgetId)}`
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }))
        setError(body.error ?? `Error ${res.status}`)
        setData(null)
        return
      }

      const json = (await res.json()) as NpmResponse
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

  if (!loading && error) {
    return (
      <div className={cn(
        "flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden",
        isConfigured && "widget-glow-error"
      )}>
        <WidgetHeader
          icon={Globe02Icon}
          title="Nginx Proxy Manager"
          onSettingsClick={() => setShowSettings(true)}
          status="error"
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
          <HugeiconsIcon
            icon={Globe02Icon}
            strokeWidth={1.5}
            className="size-10 text-muted-foreground/30"
          />
          <p className="text-sm font-medium text-muted-foreground">
            Cannot connect to Nginx Proxy Manager
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
        icon={Globe02Icon}
        title="Nginx Proxy Manager"
        onSettingsClick={() => setShowSettings(true)}
        status={!loading && isConfigured ? (error ? "error" : "success") : undefined}
      />

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
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
            <div className="grid grid-cols-3 gap-2">
              <StatCard
                label="Proxy Hosts"
                value={`${data.proxyHosts.enabled}/${data.proxyHosts.total}`}
              />
              <StatCard
                label="Redirects"
                value={String(data.redirectionHosts)}
              />
              <StatCard
                label="Streams"
                value={String(data.streams)}
              />
            </div>

            <div>
              <p className="mb-1.5 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
                Certificates
              </p>
              <div className="space-y-1">
                <div className="flex items-center justify-between rounded px-1.5 py-1">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="text-xs font-semibold tabular-nums">
                    {data.certificates.total}
                  </span>
                </div>
                {data.certificates.expiringSoon > 0 && (
                  <div className="flex items-center justify-between rounded px-1.5 py-1 bg-amber-500/10">
                    <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                      <HugeiconsIcon
                        icon={AlertCircleIcon}
                        strokeWidth={2}
                        className="size-3 shrink-0"
                      />
                      Expiring Soon
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                      {data.certificates.expiringSoon}
                    </span>
                  </div>
                )}
                {data.certificates.expired > 0 && (
                  <div className="flex items-center justify-between rounded px-1.5 py-1 bg-red-500/10">
                    <span className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                      <HugeiconsIcon
                        icon={AlertCircleIcon}
                        strokeWidth={2}
                        className="size-3 shrink-0"
                      />
                      Expired
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-red-600 dark:text-red-400">
                      {data.certificates.expired}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
