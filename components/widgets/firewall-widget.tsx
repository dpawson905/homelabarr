"use client"

import { useState, useEffect, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { FirewallIcon, Settings02Icon } from "@hugeicons/core-free-icons"
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
import type { FirewallResponse } from "@/app/api/widgets/firewall/types"

interface FirewallWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
}

function serviceLabel(serviceType: string): string {
  if (serviceType === "opnsense") return "OPNsense"
  if (serviceType === "pfsense") return "pfSense"
  return "Firewall"
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

function wanStatusColor(status: string): string {
  if (status === "up") return "bg-green-500"
  if (status === "down") return "bg-red-500"
  return "bg-gray-400"
}

// ---------- Settings Panel ----------

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
    (currentConfig?.serviceType as string) ?? "opnsense"
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
        icon={FirewallIcon}
        title={serviceLabel(serviceType)}
        isSettings
        onSettingsClick={onClose}
      />
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="firewall-service-type">Service Type</Label>
          <Select value={serviceType} onValueChange={setServiceType}>
            <SelectTrigger id="firewall-service-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="opnsense">OPNsense</SelectItem>
              <SelectItem value="pfsense">pfSense</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="firewall-url">URL</Label>
          <Input
            id="firewall-url"
            value={serviceUrl}
            onChange={(e) => setServiceUrl(e.target.value)}
            placeholder="https://firewall.local"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="firewall-secret">Secret Name</Label>
          <Input
            id="firewall-secret"
            value={secretName}
            onChange={(e) => setSecretName(e.target.value)}
            placeholder="FIREWALL"
          />
          <p className="text-[0.625rem] text-muted-foreground">
            Name of a secret in Settings (OPNsense: key:secret / pfSense: credentials)
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

// ---------- Usage Bar ----------

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

// ---------- Stat Card ----------

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

// ---------- Loading Skeleton ----------

function LoadingSkeleton(): React.ReactElement {
  return (
    <div className="space-y-3 p-3">
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-md bg-muted/50 px-2.5 py-2 space-y-1">
            <Skeleton className="h-2 w-14" />
            <Skeleton className="h-4 w-10" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-1.5 w-full rounded-full" />
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
      <div className="space-y-1.5">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------- Main Widget ----------

export function FirewallWidget({
  widgetId,
  config,
  onDelete,
}: FirewallWidgetProps): React.ReactElement {
  const [savedConfig, setSavedConfig] = useState({
    serviceType: (config?.serviceType as string) ?? "",
    serviceUrl: (config?.serviceUrl as string) ?? "",
    secretName: (config?.secretName as string) ?? "",
  })
  const isConfigured = !!(
    savedConfig.serviceType &&
    savedConfig.serviceUrl &&
    savedConfig.secretName
  )

  const [data, setData] = useState<FirewallResponse | null>(null)
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
  }, [config])

  const fetchData = useCallback(async () => {
    if (!isConfigured) return

    try {
      const res = await fetch(
        `/api/widgets/firewall?widgetId=${encodeURIComponent(widgetId)}`
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }))
        setError(body.error ?? `Error ${res.status}`)
        setData(null)
        return
      }

      const json = (await res.json()) as FirewallResponse
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

  // ---------- Settings / Setup ----------

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

  // ---------- Error State ----------

  if (!loading && error) {
    return (
      <div
        className={cn(
          "flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden",
          isConfigured && "widget-glow-error"
        )}
      >
        <WidgetHeader
          icon={FirewallIcon}
          title={serviceLabel(savedConfig.serviceType)}
          onSettingsClick={() => setShowSettings(true)}
          status="error"
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
          <HugeiconsIcon
            icon={FirewallIcon}
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

  // ---------- Data View ----------

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden widget-glow",
        !loading && isConfigured && !error && "widget-glow-success",
        !loading && isConfigured && error && "widget-glow-error"
      )}
    >
      <WidgetHeader
        icon={FirewallIcon}
        title={serviceLabel(savedConfig.serviceType)}
        onSettingsClick={() => setShowSettings(true)}
        status={!loading && isConfigured ? (error ? "error" : "success") : undefined}
        badge={
          data ? (
            <span
              className={cn(
                "ml-1 rounded-full px-1.5 py-0.5 text-[0.5625rem] font-medium",
                data.wanStatus === "up"
                  ? "bg-green-500/10 text-green-500"
                  : data.wanStatus === "down"
                    ? "bg-red-500/10 text-red-500"
                    : "bg-gray-500/10 text-gray-500"
              )}
            >
              WAN {data.wanStatus}
            </span>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <LoadingSkeleton />
        ) : data ? (
          <div className="space-y-3 p-3">
            {/* Hostname */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground truncate">
                {data.hostname}
              </span>
              <span className="shrink-0 text-[0.5625rem] text-muted-foreground">
                {formatUptime(data.uptimeSeconds)} uptime
              </span>
            </div>

            {/* CPU / Memory Bars */}
            <div className="space-y-1.5">
              <UsageBar label="CPU" pct={data.cpuUsage} />
              <UsageBar label="RAM" pct={data.memoryUsage} />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-2">
                <div
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    wanStatusColor(data.wanStatus)
                  )}
                />
                <div className="min-w-0">
                  <p className="text-[0.5625rem] text-muted-foreground">Gateway</p>
                  <p className="text-xs font-semibold capitalize">{data.gatewayStatus}</p>
                </div>
              </div>

              <StatCard
                label="Firmware"
                value={data.firmwareVersion}
              />
            </div>

            {/* Firmware Update Badge */}
            {data.firmwareNeedsUpdate && (
              <div className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1.5">
                <span className="size-2 shrink-0 rounded-full bg-amber-500" />
                <span className="text-xs font-medium text-amber-500">
                  Firmware update available
                </span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
