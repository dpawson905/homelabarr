"use client"

import { useState, useEffect, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Notification01Icon,
  Film01Icon,
  Tv01Icon,
  Settings02Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { WidgetHeader } from "@/components/widget-header"
import { DeleteWidgetButton } from "@/components/delete-widget-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type {
  MediaRequest,
  RequestCounts,
  MediaRequestsResponse,
} from "@/app/api/widgets/media-requests/types"

interface MediaRequestsWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
}

type FilterOption = "all" | "pending" | "approved" | "available"

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "available", label: "Available" },
]

const STATUS_COLORS: Record<MediaRequest["status"], string> = {
  pending: "bg-amber-500/10 text-amber-500",
  approved: "bg-blue-500/10 text-blue-500",
  available: "bg-green-500/10 text-green-500",
  declined: "bg-red-500/10 text-red-500",
  processing: "bg-indigo-500/10 text-indigo-500",
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function isConfigured(config: Record<string, unknown> | null): boolean {
  return (
    typeof config?.serviceUrl === "string" &&
    config.serviceUrl.length > 0 &&
    typeof config?.secretName === "string" &&
    config.secretName.length > 0
  )
}

export function MediaRequestsWidget({
  widgetId,
  config,
  onDelete,
}: MediaRequestsWidgetProps): React.ReactElement {
  const [savedConfig, setSavedConfig] = useState({
    serviceType: (config?.serviceType as string) ?? "overseerr",
    serviceUrl: (config?.serviceUrl as string) ?? "",
    secretName: (config?.secretName as string) ?? "",
    defaultFilter: ((config?.defaultFilter as FilterOption) ?? "all") as FilterOption,
  })
  const configured = !!savedConfig.serviceUrl && !!savedConfig.secretName

  const [requests, setRequests] = useState<MediaRequest[]>([])
  const [counts, setCounts] = useState<RequestCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterOption>(savedConfig.defaultFilter)
  const [showSettings, setShowSettings] = useState(false)

  const [settingsServiceType, setSettingsServiceType] = useState(savedConfig.serviceType)
  const [settingsServiceUrl, setSettingsServiceUrl] = useState(savedConfig.serviceUrl)
  const [settingsSecretName, setSettingsSecretName] = useState(savedConfig.secretName)
  const [settingsDefaultFilter, setSettingsDefaultFilter] =
    useState<FilterOption>(savedConfig.defaultFilter)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const incoming = {
      serviceType: (config?.serviceType as string) ?? "overseerr",
      serviceUrl: (config?.serviceUrl as string) ?? "",
      secretName: (config?.secretName as string) ?? "",
      defaultFilter: ((config?.defaultFilter as FilterOption) ?? "all") as FilterOption,
    }
    setSavedConfig(incoming)
    setSettingsServiceType(incoming.serviceType)
    setSettingsServiceUrl(incoming.serviceUrl)
    setSettingsSecretName(incoming.secretName)
    setSettingsDefaultFilter(incoming.defaultFilter)
  }, [config])

  const fetchRequests = useCallback(async () => {
    if (!configured) {
      setLoading(false)
      return
    }

    try {
      const params = new URLSearchParams({
        widgetId,
        filter,
      })
      const res = await fetch(`/api/widgets/media-requests?${params}`)

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }))
        setError(body.error ?? `Error ${res.status}`)
        setRequests([])
        setCounts(null)
        return
      }

      const data: MediaRequestsResponse = await res.json()
      setRequests(data.requests)
      setCounts(data.counts)
      setError(null)
    } catch {
      setError("Failed to connect")
      setRequests([])
      setCounts(null)
    } finally {
      setLoading(false)
    }
  }, [widgetId, filter, configured])

  useEffect(() => {
    if (!configured) {
      setLoading(false)
      return
    }

    setLoading(true)
    fetchRequests()

    const interval = setInterval(fetchRequests, 60_000)
    return () => clearInterval(interval)
  }, [fetchRequests, configured])

  async function handleSaveSettings() {
    setSaving(true)
    try {
      const res = await fetch(`/api/widgets/${widgetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            serviceType: settingsServiceType,
            serviceUrl: settingsServiceUrl,
            secretName: settingsSecretName,
            defaultFilter: settingsDefaultFilter,
          },
        }),
      })

      if (!res.ok) {
        toast.error("Failed to save settings")
        return
      }

      setSavedConfig({
        serviceType: settingsServiceType,
        serviceUrl: settingsServiceUrl,
        secretName: settingsSecretName,
        defaultFilter: settingsDefaultFilter,
      })
      setShowSettings(false)
      setLoading(true)
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const serviceLabel =
    settingsServiceType === "jellyseerr" ? "Jellyseerr" : "Overseerr"

  if (showSettings || !configured) {
    return (
      <div className="flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden">
        <WidgetHeader
          icon={Notification01Icon}
          title={serviceLabel}
          isSettings
          settingsTitle={configured ? `${serviceLabel} Settings` : "Setup Media Requests"}
          onSettingsClick={configured ? () => setShowSettings(false) : undefined}
        />

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="media-req-service-type">Service Type</Label>
            <Select
              value={settingsServiceType}
              onValueChange={setSettingsServiceType}
            >
              <SelectTrigger className="w-full" id="media-req-service-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overseerr">Overseerr</SelectItem>
                <SelectItem value="jellyseerr">Jellyseerr</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="media-req-url">Service URL</Label>
            <Input
              id="media-req-url"
              value={settingsServiceUrl}
              onChange={(e) => setSettingsServiceUrl(e.target.value)}
              placeholder="http://192.168.1.100:5055"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="media-req-secret">Secret Name</Label>
            <Input
              id="media-req-secret"
              value={settingsSecretName}
              onChange={(e) => setSettingsSecretName(e.target.value)}
              placeholder="OVERSEERR"
            />
            <p className="text-[0.625rem] text-muted-foreground">
              Name of the stored secret containing your API key
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="media-req-default-filter">Default Filter</Label>
            <Select
              value={settingsDefaultFilter}
              onValueChange={(v) =>
                setSettingsDefaultFilter(v as FilterOption)
              }
            >
              <SelectTrigger className="w-full" id="media-req-default-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSaveSettings}
            disabled={
              saving ||
              !settingsServiceUrl.trim() ||
              !settingsSecretName.trim()
            }
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

  const currentServiceLabel = savedConfig.serviceType === "jellyseerr" ? "Jellyseerr" : "Overseerr"

  if (!loading && error) {
    return (
      <div className={cn(
        "flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden",
        "widget-glow-error"
      )}>
        <WidgetHeader
          icon={Notification01Icon}
          title={currentServiceLabel}
          onSettingsClick={() => setShowSettings(true)}
          status="error"
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
          <HugeiconsIcon
            icon={Notification01Icon}
            strokeWidth={1.5}
            className="size-10 text-muted-foreground/30"
          />
          <p className="text-sm font-medium text-muted-foreground">
            Cannot connect to {currentServiceLabel}
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
      !loading && configured && !error && "widget-glow-success",
      !loading && configured && error && "widget-glow-error"
    )}>
      <WidgetHeader
        icon={Notification01Icon}
        title={currentServiceLabel}
        onSettingsClick={() => setShowSettings(true)}
        status={!loading && configured ? (error ? "error" : "success") : undefined}
        badge={
          counts !== null && counts.pending > 0 ? (
            <span className="ml-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[0.5625rem] font-medium text-amber-500">
              {counts.pending} pending
            </span>
          ) : undefined
        }
      />

      <div className="flex shrink-0 items-center gap-1 border-b border-border px-3 py-1.5">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFilter(opt.value)}
            className={cn(
              "rounded-full px-2 py-0.5 text-[0.625rem] font-medium transition-colors",
              filter === opt.value
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {counts !== null && !loading && (
        <div className="flex shrink-0 items-center gap-1.5 border-b border-border px-3 py-1.5">
          {counts.pending > 0 && (
            <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[0.5625rem] font-medium text-amber-500">
              {counts.pending} pending
            </span>
          )}
          {counts.approved > 0 && (
            <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[0.5625rem] font-medium text-blue-500">
              {counts.approved} approved
            </span>
          )}
          {counts.processing > 0 && (
            <span className="rounded-full bg-indigo-500/10 px-1.5 py-0.5 text-[0.5625rem] font-medium text-indigo-500">
              {counts.processing} processing
            </span>
          )}
          {counts.available > 0 && (
            <span className="rounded-full bg-green-500/10 px-1.5 py-0.5 text-[0.5625rem] font-medium text-green-500">
              {counts.available} available
            </span>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2.5 border-b border-border"
              >
                <Skeleton className="size-4 shrink-0 rounded" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2 w-20" />
                </div>
                <Skeleton className="h-4 w-14 rounded-full" />
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-6">
            <HugeiconsIcon
              icon={Notification01Icon}
              strokeWidth={1.5}
              className="size-8 text-muted-foreground/30"
            />
            <p className="text-xs text-muted-foreground">
              {filter === "all" ? "No media requests" : `No ${filter} requests`}
            </p>
          </div>
        ) : (
          requests.map((req) => (
            <div
              key={req.id}
              className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-b-0"
            >
              <HugeiconsIcon
                icon={req.mediaType === "movie" ? Film01Icon : Tv01Icon}
                strokeWidth={2}
                className="size-4 shrink-0 text-muted-foreground"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-baseline gap-1.5">
                  <span className="truncate text-xs font-medium text-foreground">
                    {req.title}
                  </span>
                  {req.year && (
                    <span className="shrink-0 text-[0.625rem] text-muted-foreground">
                      ({req.year})
                    </span>
                  )}
                </div>
                <span className="truncate text-[0.625rem] text-muted-foreground">
                  {req.requestedBy} - {timeAgo(req.requestedAt)}
                </span>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[0.625rem] font-medium",
                  STATUS_COLORS[req.status]
                )}
              >
                {req.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
