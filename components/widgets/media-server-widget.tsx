"use client"

import { useState, useEffect, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Tv01Icon,
  Film01Icon,
  MusicNote01Icon,
  Settings02Icon,
} from "@hugeicons/core-free-icons"
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
import type {
  NowPlayingItem,
  RecentlyAddedItem,
  MediaServerResponse,
} from "@/app/api/widgets/media-server/types"

interface MediaServerWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
}

interface NowPlayingViewProps {
  items: NowPlayingItem[]
}

interface RecentlyAddedViewProps {
  items: RecentlyAddedItem[]
}

function timeAgo(isoDate: string): string {
  if (!isoDate) return ""
  const diff = Date.now() - new Date(isoDate).getTime()
  if (Number.isNaN(diff)) return ""
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function getMediaTypeIcon(mediaType: string) {
  switch (mediaType) {
    case "movie": return Film01Icon
    case "music": return MusicNote01Icon
    default: return Tv01Icon
  }
}

export function MediaServerWidget({
  widgetId,
  config,
  onDelete,
}: MediaServerWidgetProps): React.ReactElement {
  const [savedConfig, setSavedConfig] = useState({
    serviceType: (config?.serviceType as string) ?? "",
    serviceUrl: (config?.serviceUrl as string) ?? "",
    secretName: (config?.secretName as string) ?? "",
  })
  const isConfigured = !!savedConfig.serviceType && !!savedConfig.serviceUrl && !!savedConfig.secretName

  const [nowPlaying, setNowPlaying] = useState<NowPlayingItem[]>([])
  const [recentlyAdded, setRecentlyAdded] = useState<RecentlyAddedItem[]>([])
  const [serverName, setServerName] = useState<string | undefined>()
  const [loading, setLoading] = useState(isConfigured)
  const [activeTab, setActiveTab] = useState<"now-playing" | "recently-added">("now-playing")
  const [showSettings, setShowSettings] = useState(false)

  const [formServiceType, setFormServiceType] = useState(savedConfig.serviceType || "plex")
  const [formServiceUrl, setFormServiceUrl] = useState(savedConfig.serviceUrl)
  const [formSecretName, setFormSecretName] = useState(savedConfig.secretName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const incoming = {
      serviceType: (config?.serviceType as string) ?? "",
      serviceUrl: (config?.serviceUrl as string) ?? "",
      secretName: (config?.secretName as string) ?? "",
    }
    setSavedConfig(incoming)
    setFormServiceType(incoming.serviceType || "plex")
    setFormServiceUrl(incoming.serviceUrl)
    setFormSecretName(incoming.secretName)
  }, [config])

  const fetchData = useCallback(async () => {
    if (!isConfigured) return

    try {
      const res = await fetch(`/api/widgets/media-server?widgetId=${widgetId}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }))
        setError(body.error ?? `Error ${res.status}`)
        setNowPlaying([])
        setRecentlyAdded([])
        return
      }

      const data: MediaServerResponse = await res.json()
      setNowPlaying(data.nowPlaying)
      setRecentlyAdded(data.recentlyAdded)
      setServerName(data.serverName)
      setError(null)
    } catch {
      setError("Failed to connect")
      setNowPlaying([])
      setRecentlyAdded([])
    } finally {
      setLoading(false)
    }
  }, [widgetId, isConfigured])

  useEffect(() => {
    if (!isConfigured) return

    fetchData()
    const interval = setInterval(fetchData, 30_000)
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
            serviceType: formServiceType,
            serviceUrl: formServiceUrl,
            secretName: formSecretName,
          },
        }),
      })
      if (res.ok) {
        setSavedConfig({
          serviceType: formServiceType,
          serviceUrl: formServiceUrl,
          secretName: formSecretName,
        })
        setShowSettings(false)
        setLoading(true)
      }
    } catch (error) {
      console.warn("Failed to save media server config:", error)
    } finally {
      setSaving(false)
    }
  }

  if (!isConfigured && !showSettings) {
    return (
      <div className="h-full w-full flex flex-col rounded-lg border border-border bg-card overflow-hidden">
        <WidgetHeader icon={Tv01Icon} title="Media Server" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
          <HugeiconsIcon icon={Tv01Icon} strokeWidth={1.5} className="size-8 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground text-center">Connect to Plex or Jellyfin</p>
          <div className="flex w-full max-w-xs flex-col gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="ms-setup-type" className="text-[0.625rem]">Service Type</Label>
              <Select value={formServiceType} onValueChange={setFormServiceType}>
                <SelectTrigger id="ms-setup-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plex">Plex</SelectItem>
                  <SelectItem value="jellyfin">Jellyfin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="http://localhost:32400"
              value={formServiceUrl}
              onChange={(e) => setFormServiceUrl(e.target.value)}
            />
            <Input
              placeholder="PLEX_TOKEN"
              value={formSecretName}
              onChange={(e) => setFormSecretName(e.target.value)}
            />
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !formServiceUrl.trim() || !formSecretName.trim()}
            >
              {saving ? "Saving..." : "Connect"}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (showSettings) {
    return (
      <div className="h-full w-full flex flex-col rounded-lg border border-border bg-card overflow-hidden">
        <WidgetHeader icon={Tv01Icon} title={serverName ?? "Media Server"} isSettings onSettingsClick={() => setShowSettings(false)} />
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ms-settings-type">Service Type</Label>
            <Select value={formServiceType} onValueChange={setFormServiceType}>
              <SelectTrigger id="ms-settings-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plex">Plex</SelectItem>
                <SelectItem value="jellyfin">Jellyfin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ms-settings-url">Service URL</Label>
            <Input
              id="ms-settings-url"
              value={formServiceUrl}
              onChange={(e) => setFormServiceUrl(e.target.value)}
              placeholder="http://localhost:32400"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ms-settings-secret">Secret Name</Label>
            <Input
              id="ms-settings-secret"
              value={formSecretName}
              onChange={(e) => setFormSecretName(e.target.value)}
              placeholder="PLEX_TOKEN"
            />
            <p className="text-[0.625rem] text-muted-foreground">
              Name of a secret created in Settings (not the raw token)
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || !formServiceUrl.trim() || !formSecretName.trim()}
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

  if (!loading && error) {
    return (
      <div className={cn(
        "flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden",
        "widget-glow-error"
      )}>
        <WidgetHeader
          icon={Tv01Icon}
          title="Media Server"
          onSettingsClick={() => setShowSettings(true)}
          status="error"
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
          <HugeiconsIcon
            icon={Tv01Icon}
            strokeWidth={1.5}
            className="size-10 text-muted-foreground/30"
          />
          <p className="text-sm font-medium text-muted-foreground">
            Cannot connect to Media Server
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
        icon={Tv01Icon}
        title={serverName ?? "Media Server"}
        onSettingsClick={() => setShowSettings(true)}
        status={!loading && isConfigured ? (error ? "error" : "success") : undefined}
      />

      <div className="flex shrink-0 border-b border-border">
        {(["now-playing", "recently-added"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 px-3 py-1.5 text-[0.625rem] font-medium transition-colors",
              activeTab === tab
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === "now-playing" ? "Now Playing" : "Recently Added"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 border-b border-border">
                <Skeleton className="size-4 rounded" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2 w-16" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        ) : activeTab === "now-playing" ? (
          <NowPlayingView items={nowPlaying} />
        ) : (
          <RecentlyAddedView items={recentlyAdded} />
        )}
      </div>
    </div>
  )
}

function MediaThumb({ src, alt }: { src?: string; alt: string }) {
  const [error, setError] = useState(false)

  if (!src || error) {
    return null
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="size-9 shrink-0 rounded object-cover bg-muted"
      onError={() => setError(true)}
    />
  )
}

function NowPlayingView({ items }: NowPlayingViewProps): React.ReactElement {
  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-6">
        <HugeiconsIcon icon={Tv01Icon} strokeWidth={1.5} className="size-8 text-muted-foreground/30" />
        <p className="text-xs text-muted-foreground">Nothing playing right now</p>
      </div>
    )
  }

  return (
    <>
      {items.map((item, index) => (
        <div
          key={`${item.title}-${item.user}-${index}`}
          className="flex flex-col gap-1 px-3 py-2 border-b border-border"
        >
          <div className="flex items-center gap-2">
            <MediaThumb src={item.thumbUrl} alt={item.title} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-xs font-medium text-foreground">{item.title}</span>
              {item.subtitle && (
                <span className="truncate text-[0.625rem] text-muted-foreground">{item.subtitle}</span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {item.state === "paused" && (
                <Badge variant="secondary" className="h-4 px-1.5 text-[0.5625rem]">
                  Paused
                </Badge>
              )}
              <span className="text-[0.625rem] text-muted-foreground">{item.user}</span>
            </div>
          </div>
          <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(item.progressPercent, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </>
  )
}

function RecentlyAddedView({ items }: RecentlyAddedViewProps): React.ReactElement {
  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-6">
        <HugeiconsIcon icon={Tv01Icon} strokeWidth={1.5} className="size-8 text-muted-foreground/30" />
        <p className="text-xs text-muted-foreground">No recently added items</p>
      </div>
    )
  }

  return (
    <>
      {items.map((item, index) => (
        <div
          key={`${item.title}-${item.addedAt}-${index}`}
          className="flex items-center gap-2 px-3 py-2 border-b border-border"
        >
          <MediaThumb src={item.thumbUrl} alt={item.title} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-xs font-medium text-foreground">{item.title}</span>
            {item.subtitle && (
              <span className="truncate text-[0.625rem] text-muted-foreground">{item.subtitle}</span>
            )}
          </div>
          <span className="shrink-0 text-[0.625rem] text-muted-foreground">
            {timeAgo(item.addedAt)}
          </span>
        </div>
      ))}
    </>
  )
}
