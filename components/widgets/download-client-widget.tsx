"use client"

import { useState, useEffect, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Download01Icon, Settings02Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { WidgetHeader } from "@/components/widget-header"
import { DeleteWidgetButton } from "@/components/delete-widget-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
import type {
  DownloadItem,
  DownloadClientResponse,
} from "@/app/api/widgets/download-client/types"

interface DownloadClientWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getStatusColor(status: DownloadItem["status"]): string {
  switch (status) {
    case "downloading":
      return "bg-green-500"
    case "paused":
    case "queued":
      return "bg-amber-500"
    case "failed":
      return "bg-red-500"
    case "completed":
    case "seeding":
      return "bg-blue-500"
    default:
      return "bg-gray-400"
  }
}

function serviceLabel(serviceType: string): string {
  if (serviceType === "qbittorrent") return "qBittorrent"
  if (serviceType === "sabnzbd") return "SABnzbd"
  return "Download Client"
}

function DownloadItemRow({ item }: { item: DownloadItem }): React.ReactElement {
  const sizeText = `${formatBytes(item.sizeTotal - item.sizeRemaining)} / ${formatBytes(item.sizeTotal)}`
  const pctText = `${item.progressPercent.toFixed(1)}%`
  const etaText = item.eta ? ` - ETA ${item.eta}` : ""
  const speedText =
    item.status === "downloading" && item.downloadSpeed > 0
      ? `${formatBytes(item.downloadSpeed)}/s`
      : ""
  const uploadText =
    item.uploadSpeed && item.uploadSpeed > 0
      ? `${formatBytes(item.uploadSpeed)}/s up`
      : ""

  const color = getStatusColor(item.status)

  return (
    <div className="px-3 py-2 border-b border-border last:border-b-0">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "size-2 shrink-0 rounded-full",
            color,
            item.status === "downloading" && "animate-pulse"
          )}
        />
        <span className="flex-1 truncate text-xs font-medium">{item.name}</span>
        {speedText && (
          <span className="shrink-0 text-[0.625rem] font-medium text-green-600 dark:text-green-400">
            {speedText}
          </span>
        )}
        {uploadText && (
          <span className="shrink-0 text-[0.625rem] text-muted-foreground">
            {uploadText}
          </span>
        )}
      </div>

      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${Math.min(item.progressPercent, 100)}%` }}
        />
      </div>

      <div className="mt-0.5 text-[0.5625rem] text-muted-foreground">
        {pctText} - {sizeText}
        {etaText}
      </div>
    </div>
  )
}

interface SettingsPanelProps {
  widgetId: string
  currentConfig: Record<string, unknown> | null
  onClose: () => void
  onSaved?: (config: { serviceType: string; serviceUrl: string; secretName: string }) => void
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
  const [serviceType, setServiceType] = useState<string>(
    (currentConfig?.serviceType as string) ?? "qbittorrent"
  )
  const [serviceUrl, setServiceUrl] = useState<string>(
    (currentConfig?.serviceUrl as string) ?? ""
  )
  const [username, setUsername] = useState<string>(
    (currentConfig?.username as string) ?? "admin"
  )
  const [secretName, setSecretName] = useState<string>(
    (currentConfig?.secretName as string) ?? ""
  )
  const [showCompleted, setShowCompleted] = useState<boolean>(
    (currentConfig?.showCompleted as boolean) ?? false
  )
  const [saving, setSaving] = useState(false)

  const placeholder =
    serviceType === "qbittorrent" ? "http://localhost:8080" : "http://localhost:8085"
  const secretLabel =
    serviceType === "qbittorrent" ? "Password Secret" : "API Key Secret"

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
            username: serviceType === "qbittorrent" ? username.trim() : undefined,
            showCompleted,
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
      <WidgetHeader icon={Download01Icon} title={serviceLabel(serviceType)} isSettings settingsTitle="Download Client Settings" onSettingsClick={onClose} />
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="dc-service-type">Service Type</Label>
          <Select value={serviceType} onValueChange={setServiceType}>
            <SelectTrigger id="dc-service-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="qbittorrent">qBittorrent</SelectItem>
              <SelectItem value="sabnzbd">SABnzbd</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dc-url">URL</Label>
          <Input
            id="dc-url"
            value={serviceUrl}
            onChange={(e) => setServiceUrl(e.target.value)}
            placeholder={placeholder}
          />
        </div>

        {serviceType === "qbittorrent" && (
          <div className="space-y-1.5">
            <Label htmlFor="dc-username">Username</Label>
            <Input
              id="dc-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="dc-secret">{secretLabel}</Label>
          <Input
            id="dc-secret"
            value={secretName}
            onChange={(e) => setSecretName(e.target.value)}
            placeholder="SABNZBD"
          />
          <p className="text-[0.625rem] text-muted-foreground">
            Name of a secret created in Settings (not the raw key/password)
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="dc-show-completed">Show completed downloads</Label>
          <Switch
            id="dc-show-completed"
            size="sm"
            checked={showCompleted}
            onCheckedChange={setShowCompleted}
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full" size="sm">
          {saving ? "Saving..." : isSetup ? "Connect" : "Save Settings"}
        </Button>
        {onDelete && <DeleteWidgetButton onConfirm={onDelete} />}
      </div>
    </div>
  )
}

export function DownloadClientWidget({
  widgetId,
  config,
  onDelete,
}: DownloadClientWidgetProps): React.ReactElement {
  const [savedConfig, setSavedConfig] = useState({
    serviceType: (config?.serviceType as string) ?? "",
    serviceUrl: (config?.serviceUrl as string) ?? "",
    secretName: (config?.secretName as string) ?? "",
  })
  const isConfigured = !!(savedConfig.serviceType && savedConfig.serviceUrl && savedConfig.secretName)

  const [data, setData] = useState<DownloadClientResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(!isConfigured)

  useEffect(() => {
    const incoming = {
      serviceType: (config?.serviceType as string) ?? "",
      serviceUrl: (config?.serviceUrl as string) ?? "",
      secretName: (config?.secretName as string) ?? "",
    }
    setSavedConfig(incoming)
    if (!incoming.serviceType || !incoming.serviceUrl || !incoming.secretName) setShowSettings(true)
  }, [config])

  const fetchData = useCallback(async () => {
    if (!isConfigured) return

    try {
      const res = await fetch(
        `/api/widgets/download-client?widgetId=${encodeURIComponent(widgetId)}`
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }))
        setError(body.error ?? `Error ${res.status}`)
        setData(null)
        return
      }

      const json = (await res.json()) as DownloadClientResponse
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

    const interval = setInterval(fetchData, 10_000)
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

  const summaryText = data
    ? `${data.summary.activeItems} active - ${data.summary.totalSpeed}`
    : undefined

  if (!loading && error) {
    return (
      <div className={cn(
        "flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden",
        isConfigured && "widget-glow-error"
      )}>
        <WidgetHeader
          icon={Download01Icon}
          title={serviceLabel(savedConfig.serviceType)}
          onSettingsClick={() => setShowSettings(true)}
          status="error"
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
          <HugeiconsIcon
            icon={Download01Icon}
            strokeWidth={1.5}
            className="size-10 text-muted-foreground/30"
          />
          <p className="text-sm font-medium text-muted-foreground">
            Cannot connect to {serviceLabel(savedConfig.serviceType)}
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
        icon={Download01Icon}
        title={serviceLabel(savedConfig.serviceType)}
        onSettingsClick={() => setShowSettings(true)}
        status={!loading && isConfigured ? (error ? "error" : "success") : undefined}
        badge={summaryText ? <span className="ml-1 truncate text-[0.625rem] text-muted-foreground">{summaryText}</span> : undefined}
      />

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-3 py-2 border-b border-border space-y-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-2 rounded-full" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-1 w-full rounded-full" />
                <Skeleton className="h-2 w-40" />
              </div>
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-6">
            <HugeiconsIcon
              icon={Download01Icon}
              strokeWidth={1.5}
              className="size-8 text-muted-foreground/30"
            />
            <p className="text-xs text-muted-foreground">No active downloads</p>
          </div>
        ) : (
          data.items.map((item) => <DownloadItemRow key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}
