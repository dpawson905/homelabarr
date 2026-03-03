"use client"

import { useState, useEffect, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { GitBranchIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { WidgetHeader } from "@/components/widget-header"
import { DeleteWidgetButton } from "@/components/delete-widget-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { GiteaResponse } from "@/app/api/widgets/gitea/types"

interface GiteaWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
}

const POLL_INTERVAL_MS = 60_000

function serviceLabel(serviceType: string): string {
  if (serviceType === "forgejo") return "Forgejo"
  return "Gitea"
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
  onSaved?: (config: { serviceType: string; serviceUrl: string; secretName: string }) => void
  isSetup?: boolean
  onDelete?: () => void
}): React.ReactElement {
  const [serviceType, setServiceType] = useState<string>(
    (currentConfig?.serviceType as string) ?? "gitea"
  )
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
            serviceType,
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
        serviceType,
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
      <WidgetHeader
        icon={GitBranchIcon}
        title={serviceLabel(serviceType)}
        isSettings
        settingsTitle={isSetup ? `Setup ${serviceLabel(serviceType)}` : `${serviceLabel(serviceType)} Settings`}
        onSettingsClick={onClose}
      />

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="gitea-service-type">Service Type</Label>
          <Select value={serviceType} onValueChange={setServiceType}>
            <SelectTrigger id="gitea-service-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gitea">Gitea</SelectItem>
              <SelectItem value="forgejo">Forgejo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="gitea-url">Service URL</Label>
          <Input
            id="gitea-url"
            value={serviceUrl}
            onChange={(e) => setServiceUrl(e.target.value)}
            placeholder="https://gitea.local:3000"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="gitea-secret">Secret Name</Label>
          <Input
            id="gitea-secret"
            value={secretName}
            onChange={(e) => setSecretName(e.target.value)}
            placeholder="GITEA"
          />
          <p className="text-[0.625rem] text-muted-foreground">
            Name of a secret created in Settings (not the raw token)
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

export function GiteaWidget({
  widgetId,
  config,
  onDelete,
}: GiteaWidgetProps): React.ReactElement {
  const [savedConfig, setSavedConfig] = useState({
    serviceType: (config?.serviceType as string) ?? "gitea",
    serviceUrl: (config?.serviceUrl as string) ?? "",
    secretName: (config?.secretName as string) ?? "",
  })
  const isConfigured = !!(savedConfig.serviceUrl && savedConfig.secretName)

  const [data, setData] = useState<GiteaResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(!isConfigured)

  useEffect(() => {
    const incoming = {
      serviceType: (config?.serviceType as string) ?? "gitea",
      serviceUrl: (config?.serviceUrl as string) ?? "",
      secretName: (config?.secretName as string) ?? "",
    }
    setSavedConfig(incoming)
  }, [config])

  const fetchData = useCallback(async () => {
    if (!isConfigured) return

    try {
      const res = await fetch(
        `/api/widgets/gitea?widgetId=${encodeURIComponent(widgetId)}`
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }))
        setError(body.error ?? `Error ${res.status}`)
        setData(null)
        return
      }

      const json = (await res.json()) as GiteaResponse
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

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden",
        !loading && isConfigured && !error && "widget-glow-success",
        !loading && isConfigured && error && "widget-glow-error"
      )}
    >
      <WidgetHeader
        icon={GitBranchIcon}
        title={serviceLabel(savedConfig.serviceType)}
        onSettingsClick={() => setShowSettings(true)}
        status={!loading && isConfigured ? (error ? "error" : "success") : undefined}
      />

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 2 }).map((_, i) => (
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
              icon={GitBranchIcon}
              strokeWidth={1.5}
              className="size-8 text-muted-foreground/30"
            />
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        ) : data ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md bg-muted/50 px-2.5 py-2">
              <p className="text-[0.5625rem] text-muted-foreground">Repositories</p>
              <p className="text-sm font-semibold tabular-nums">
                {data.repositories.toLocaleString()}
              </p>
            </div>
            <div className="rounded-md bg-muted/50 px-2.5 py-2">
              <p className="text-[0.5625rem] text-muted-foreground">Notifications</p>
              <p
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  data.notifications > 0 && "text-amber-500"
                )}
              >
                {data.notifications.toLocaleString()}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
