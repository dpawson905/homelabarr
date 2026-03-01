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
}: MediaServerWidgetProps): React.ReactElement {
  const serviceType = (config?.serviceType as string) ?? ""
  const serviceUrl = (config?.serviceUrl as string) ?? ""
  const secretName = (config?.secretName as string) ?? ""
  const isConfigured = !!serviceType && !!serviceUrl && !!secretName

  const [nowPlaying, setNowPlaying] = useState<NowPlayingItem[]>([])
  const [recentlyAdded, setRecentlyAdded] = useState<RecentlyAddedItem[]>([])
  const [serverName, setServerName] = useState<string | undefined>()
  const [loading, setLoading] = useState(isConfigured)
  const [activeTab, setActiveTab] = useState<"now-playing" | "recently-added">("now-playing")
  const [showSettings, setShowSettings] = useState(false)

  const [formServiceType, setFormServiceType] = useState(serviceType || "plex")
  const [formServiceUrl, setFormServiceUrl] = useState(serviceUrl)
  const [formSecretName, setFormSecretName] = useState(secretName)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setFormServiceType(serviceType || "plex")
    setFormServiceUrl(serviceUrl)
    setFormSecretName(secretName)
  }, [serviceType, serviceUrl, secretName])

  const fetchData = useCallback(async () => {
    if (!isConfigured) return

    try {
      const res = await fetch(`/api/widgets/media-server?widgetId=${widgetId}`)
      if (!res.ok) {
        console.warn("Failed to fetch media server data:", await res.text())
        return
      }

      const data: MediaServerResponse = await res.json()
      setNowPlaying(data.nowPlaying)
      setRecentlyAdded(data.recentlyAdded)
      setServerName(data.serverName)
    } catch (error) {
      console.warn("Failed to fetch media server data:", error)
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
        setShowSettings(false)
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
        <div className="flex shrink-0 items-center gap-1.5 border-b border-border px-3 py-2">
          <HugeiconsIcon icon={Tv01Icon} strokeWidth={2} className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Media Server</span>
        </div>
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
              placeholder="Secret name (e.g. plex-token)"
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
        <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-1.5">
            <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Media Server Settings</span>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setShowSettings(false)}
            aria-label="Close settings"
          >
            <span className="text-xs">&times;</span>
          </Button>
        </div>
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
              placeholder="plex-token"
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || !formServiceUrl.trim() || !formSecretName.trim()}
            className="w-full"
            size="sm"
          >
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <HugeiconsIcon icon={Tv01Icon} strokeWidth={2} className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">
            {serverName ?? "Media Server"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setShowSettings(true)}
          aria-label="Media server settings"
        >
          <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} />
        </Button>
      </div>

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
            <HugeiconsIcon
              icon={getMediaTypeIcon(item.mediaType)}
              strokeWidth={2}
              className="size-3.5 shrink-0 text-muted-foreground"
            />
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
          <HugeiconsIcon
            icon={getMediaTypeIcon(item.mediaType)}
            strokeWidth={2}
            className="size-3.5 shrink-0 text-muted-foreground"
          />
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
