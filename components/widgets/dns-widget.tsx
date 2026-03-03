"use client"

import { useState, useEffect, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Shield01Icon, Settings02Icon, AlertCircleIcon } from "@hugeicons/core-free-icons"
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
import type { DnsResponse } from "@/app/api/widgets/dns/types"

interface DnsWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
}

function serviceLabel(serviceType: string): string {
  if (serviceType === "pihole") return "Pi-hole"
  if (serviceType === "adguard") return "AdGuard Home"
  return "DNS"
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
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
    (currentConfig?.serviceType as string) ?? "pihole"
  )
  const [serviceUrl, setServiceUrl] = useState<string>(
    (currentConfig?.serviceUrl as string) ?? ""
  )
  const [secretName, setSecretName] = useState<string>(
    (currentConfig?.secretName as string) ?? ""
  )
  const [saving, setSaving] = useState(false)

  const placeholder =
    serviceType === "pihole" ? "http://pi.hole" : "http://localhost:3000"
  const secretHelp =
    serviceType === "pihole"
      ? "Name of a secret in Settings (Pi-hole API token)"
      : "Name of a secret in Settings (AdGuard user:pass)"

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
      <WidgetHeader icon={Shield01Icon} title={serviceLabel(serviceType)} isSettings onSettingsClick={onClose} />
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="dns-service-type">Service Type</Label>
          <Select value={serviceType} onValueChange={setServiceType}>
            <SelectTrigger id="dns-service-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pihole">Pi-hole</SelectItem>
              <SelectItem value="adguard">AdGuard Home</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dns-url">URL</Label>
          <Input
            id="dns-url"
            value={serviceUrl}
            onChange={(e) => setServiceUrl(e.target.value)}
            placeholder={placeholder}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dns-secret">Secret Name</Label>
          <Input
            id="dns-secret"
            value={secretName}
            onChange={(e) => setSecretName(e.target.value)}
            placeholder="DNS_SECRET"
          />
          <p className="text-[0.625rem] text-muted-foreground">{secretHelp}</p>
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

export function DnsWidget({
  widgetId,
  config,
  onDelete,
}: DnsWidgetProps): React.ReactElement {
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

  const [data, setData] = useState<DnsResponse | null>(null)
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
        `/api/widgets/dns?widgetId=${encodeURIComponent(widgetId)}`
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }))
        setError(body.error ?? `Error ${res.status}`)
        setData(null)
        return
      }

      const json = (await res.json()) as DnsResponse
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
          icon={Shield01Icon}
          title={serviceLabel(savedConfig.serviceType)}
          onSettingsClick={() => setShowSettings(true)}
          status="error"
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
          <HugeiconsIcon
            icon={Shield01Icon}
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
        icon={Shield01Icon}
        title={serviceLabel(savedConfig.serviceType)}
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
            <div className="grid grid-cols-2 gap-2">
              <StatCard
                label="Total Queries"
                value={formatNumber(data.stats.totalQueries)}
              />
              <StatCard
                label="Blocked"
                value={formatNumber(data.stats.blockedQueries)}
              />
              <StatCard
                label="Block Rate"
                value={`${data.stats.blockPercentage.toFixed(1)}%`}
              />
              {data.serviceType === "pihole" ? (
                <StatCard
                  label="Domains Blocked"
                  value={formatNumber(data.stats.domainsBlocked)}
                />
              ) : (
                <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-2">
                  <div
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      data.protectionEnabled ? "bg-green-500" : "bg-red-500"
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-[0.5625rem] text-muted-foreground">Protection</p>
                    <p className="text-sm font-semibold">
                      {data.protectionEnabled ? "On" : "Off"}
                    </p>
                  </div>
                  {!data.protectionEnabled && (
                    <HugeiconsIcon
                      icon={AlertCircleIcon}
                      strokeWidth={2}
                      className="ml-auto size-3.5 shrink-0 text-red-500"
                    />
                  )}
                </div>
              )}
            </div>

            {data.stats.topClients.length > 0 && (
              <div>
                <p className="mb-1.5 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
                  Top Clients
                </p>
                <div className="space-y-1">
                  {data.stats.topClients.map((client) => (
                    <div
                      key={client.name}
                      className="flex items-center justify-between rounded px-1.5 py-1 hover:bg-muted/50"
                    >
                      <span className="truncate text-xs">{client.name}</span>
                      <span className="shrink-0 ml-2 text-[0.625rem] tabular-nums text-muted-foreground">
                        {formatNumber(client.queryCount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.serviceType === "pihole" && (
              <div className="flex items-center gap-1.5 text-xs">
                <div
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    data.protectionEnabled ? "bg-green-500" : "bg-red-500"
                  )}
                />
                <span className="text-muted-foreground">
                  {data.protectionEnabled ? "Protection enabled" : "Protection disabled"}
                </span>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
