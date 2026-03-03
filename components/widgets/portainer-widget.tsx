"use client"

import { useState, useEffect, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Package01Icon, Settings02Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { WidgetHeader } from "@/components/widget-header"
import { DeleteWidgetButton } from "@/components/delete-widget-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { PortainerResponse } from "@/app/api/widgets/portainer/types"

interface PortainerWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
}

const POLL_INTERVAL_MS = 30_000

function SettingsPanel({
  settingsServiceUrl,
  settingsSecretName,
  settingsEnvironmentId,
  saving,
  configured,
  onChangeServiceUrl,
  onChangeSecretName,
  onChangeEnvironmentId,
  onSave,
  onCancel,
  onDelete,
}: {
  settingsServiceUrl: string
  settingsSecretName: string
  settingsEnvironmentId: string
  saving: boolean
  configured: boolean
  onChangeServiceUrl: (v: string) => void
  onChangeSecretName: (v: string) => void
  onChangeEnvironmentId: (v: string) => void
  onSave: () => void
  onCancel?: () => void
  onDelete?: () => void
}): React.ReactElement {
  return (
    <div className="flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden">
      <WidgetHeader
        icon={Package01Icon}
        title="Portainer"
        isSettings
        settingsTitle={configured ? "Portainer Settings" : "Setup Portainer"}
        onSettingsClick={onCancel}
      />

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="portainer-url">Service URL</Label>
          <Input
            id="portainer-url"
            value={settingsServiceUrl}
            onChange={(e) => onChangeServiceUrl(e.target.value)}
            placeholder="https://portainer.local:9443"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="portainer-secret">Secret Name</Label>
          <Input
            id="portainer-secret"
            value={settingsSecretName}
            onChange={(e) => onChangeSecretName(e.target.value)}
            placeholder="PORTAINER"
          />
          <p className="text-[0.625rem] text-muted-foreground">
            Name of a secret created in Settings (not the raw API key)
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="portainer-env-id">Environment ID</Label>
          <Input
            id="portainer-env-id"
            value={settingsEnvironmentId}
            onChange={(e) => onChangeEnvironmentId(e.target.value)}
            placeholder=""
          />
          <p className="text-[0.625rem] text-muted-foreground">
            Optional — leave blank to show all environments
          </p>
        </div>

        <Button
          onClick={onSave}
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

export function PortainerWidget({
  widgetId,
  config,
  onDelete,
}: PortainerWidgetProps): React.ReactElement {
  const [savedConfig, setSavedConfig] = useState({
    serviceUrl: (config?.serviceUrl as string) ?? "",
    secretName: (config?.secretName as string) ?? "",
    environmentId: (config?.environmentId as string) ?? "",
  })
  const isConfigured = !!(savedConfig.serviceUrl && savedConfig.secretName)

  const [data, setData] = useState<PortainerResponse | null>(null)
  const [loading, setLoading] = useState(isConfigured)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const [settingsServiceUrl, setSettingsServiceUrl] = useState(savedConfig.serviceUrl)
  const [settingsSecretName, setSettingsSecretName] = useState(savedConfig.secretName)
  const [settingsEnvironmentId, setSettingsEnvironmentId] = useState(savedConfig.environmentId)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const incoming = {
      serviceUrl: (config?.serviceUrl as string) ?? "",
      secretName: (config?.secretName as string) ?? "",
      environmentId: (config?.environmentId as string) ?? "",
    }
    setSavedConfig(incoming)
    setSettingsServiceUrl(incoming.serviceUrl)
    setSettingsSecretName(incoming.secretName)
    setSettingsEnvironmentId(incoming.environmentId)
  }, [config])

  const fetchData = useCallback(async () => {
    if (!isConfigured) {
      setLoading(false)
      return
    }

    try {
      const params = new URLSearchParams({ widgetId })
      const res = await fetch(`/api/widgets/portainer?${params}`)

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }))
        setError(body.error ?? `Error ${res.status}`)
        setData(null)
        return
      }

      const result: PortainerResponse = await res.json()
      setData(result)
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

    const interval = setInterval(fetchData, POLL_INTERVAL_MS)
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
            serviceUrl: settingsServiceUrl,
            secretName: settingsSecretName,
            environmentId: settingsEnvironmentId,
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
        environmentId: settingsEnvironmentId,
      })
      setShowSettings(false)
      setLoading(true)
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const settingsProps = {
    settingsServiceUrl,
    settingsSecretName,
    settingsEnvironmentId,
    saving,
    configured: isConfigured,
    onChangeServiceUrl: setSettingsServiceUrl,
    onChangeSecretName: setSettingsSecretName,
    onChangeEnvironmentId: setSettingsEnvironmentId,
    onSave: handleSaveSettings,
    onDelete,
  }

  // Show setup if not configured
  if (!isConfigured && !showSettings) {
    return <SettingsPanel {...settingsProps} />
  }

  // Show settings panel
  if (showSettings) {
    return (
      <SettingsPanel
        {...settingsProps}
        onCancel={() => setShowSettings(false)}
      />
    )
  }

  // Error state — show error panel with settings button
  if (!loading && error) {
    return (
      <div className={cn(
        "flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden",
        "widget-glow-error"
      )}>
        <WidgetHeader
          icon={Package01Icon}
          title="Portainer"
          onSettingsClick={() => setShowSettings(true)}
          status="error"
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
          <HugeiconsIcon
            icon={Package01Icon}
            strokeWidth={1.5}
            className="size-10 text-muted-foreground/30"
          />
          <p className="text-sm font-medium text-muted-foreground">
            Cannot connect to Portainer
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

  const hasEnvironmentId = !!savedConfig.environmentId
  const upCount = data?.environments.filter((e) => e.status === 1).length ?? 0
  const totalEnvs = data?.environments.length ?? 0

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden",
        !loading && isConfigured && !error && "widget-glow-success"
      )}
    >
      <WidgetHeader
        icon={Package01Icon}
        title="Portainer"
        onSettingsClick={() => setShowSettings(true)}
        status={!loading && isConfigured ? "success" : undefined}
        badge={
          data ? (
            <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[0.5625rem]">
              {upCount}/{totalEnvs} up
            </Badge>
          ) : undefined
        }
      />

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
                  <Skeleton className="h-2 w-16" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        ) : !data ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-6">
            <HugeiconsIcon
              icon={Package01Icon}
              strokeWidth={1.5}
              className="size-8 text-muted-foreground/30"
            />
            <p className="text-xs text-muted-foreground">No data available</p>
          </div>
        ) : (
          <>
            {/* Container stats (only when environmentId is set) */}
            {hasEnvironmentId && data.containers.total > 0 && (
              <div className="grid grid-cols-3 gap-2 border-b border-border px-3 py-2.5">
                <div className="flex flex-col items-center gap-0.5 rounded-md bg-muted/50 px-2 py-1.5">
                  <span className="text-lg font-semibold text-green-500">
                    {data.containers.running}
                  </span>
                  <span className="text-[0.5625rem] text-muted-foreground">Running</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 rounded-md bg-muted/50 px-2 py-1.5">
                  <span className="text-lg font-semibold text-red-500">
                    {data.containers.stopped}
                  </span>
                  <span className="text-[0.5625rem] text-muted-foreground">Stopped</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 rounded-md bg-muted/50 px-2 py-1.5">
                  <span className="text-lg font-semibold text-foreground">
                    {data.containers.total}
                  </span>
                  <span className="text-[0.5625rem] text-muted-foreground">Total</span>
                </div>
              </div>
            )}

            {/* Environment list */}
            {data.environments.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 py-6">
                <HugeiconsIcon
                  icon={Package01Icon}
                  strokeWidth={1.5}
                  className="size-8 text-muted-foreground/30"
                />
                <p className="text-xs text-muted-foreground">No environments found</p>
              </div>
            ) : (
              data.environments.map((env) => (
                <div
                  key={env.id}
                  className="flex items-center gap-2 px-3 py-2 border-b border-border hover:bg-muted/50"
                >
                  <div
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      env.status === 1 ? "bg-green-500" : "bg-red-500"
                    )}
                    title={env.status === 1 ? "Up" : "Down"}
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-xs font-medium text-foreground">
                      {env.name}
                    </span>
                    <span className="text-[0.625rem] text-muted-foreground">
                      Environment {env.id}
                    </span>
                  </div>
                  <span className="shrink-0 text-[0.625rem] text-muted-foreground">
                    {env.status === 1 ? "Up" : "Down"}
                  </span>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}
