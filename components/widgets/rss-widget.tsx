"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { RssIcon, PlusSignIcon, Cancel01Icon, Alert02Icon } from "@hugeicons/core-free-icons"
import { WidgetHeader } from "@/components/widget-header"
import { Button } from "@/components/ui/button"
import { DeleteWidgetButton } from "@/components/delete-widget-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatDistanceToNow } from "date-fns"

interface RssWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
}

interface FeedConfig {
  url: string
  name?: string
}

interface FeedItem {
  title: string
  link: string
  pubDate: string
  contentSnippet: string
  creator: string
  feedName: string
}

interface FeedResult {
  title: string
  description: string
  link: string
  items: Omit<FeedItem, "feedName">[]
}

function parseFeeds(raw: unknown): FeedConfig[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (f): f is FeedConfig =>
      typeof f === "object" &&
      f !== null &&
      typeof f.url === "string" &&
      f.url.trim().length > 0
  )
}

function formatPubDate(dateStr: string): string {
  if (!dateStr) return "Unknown date"
  try {
    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) return "Unknown date"
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return "Unknown date"
  }
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function RssWidget({ widgetId, config, onDelete }: RssWidgetProps): React.ReactElement {
  const feeds = useMemo(() => parseFeeds(config?.feeds), [config?.feeds])
  const maxItems = typeof config?.maxItems === "number" ? config.maxItems : 15
  const refreshInterval = typeof config?.refreshInterval === "number" ? config.refreshInterval : 15

  const [showSettings, setShowSettings] = useState(false)
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [feedErrors, setFeedErrors] = useState<Record<string, string>>({})

  // Settings form state
  const [settingsFeeds, setSettingsFeeds] = useState<FeedConfig[]>(feeds)
  const [settingsMaxItems, setSettingsMaxItems] = useState(maxItems)
  const [newFeedUrl, setNewFeedUrl] = useState("")
  const [newFeedName, setNewFeedName] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchAllFeeds = useCallback(async () => {
    if (feeds.length === 0) return

    setLoading(true)
    const errors: Record<string, string> = {}
    const allItems: FeedItem[] = []

    const results = await Promise.allSettled(
      feeds.map(async (f) => {
        const res = await fetch(`/api/widgets/rss?url=${encodeURIComponent(f.url)}&limit=20`)
        if (!res.ok) throw new Error("Failed to fetch feed")
        const data: FeedResult = await res.json()
        return { feed: f, data }
      })
    )

    for (const [index, result] of results.entries()) {
      if (result.status === "fulfilled") {
        const { feed, data } = result.value
        const feedName = feed.name || data.title || "Unknown Feed"
        for (const item of data.items) {
          allItems.push({ ...item, feedName })
        }
      } else {
        const failedFeed = feeds[index]
        if (failedFeed) {
          errors[failedFeed.url] = "Failed to load"
        }
      }
    }

    allItems.sort((a, b) => {
      const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0
      const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0
      if (Number.isNaN(dateA) && Number.isNaN(dateB)) return 0
      if (Number.isNaN(dateA)) return 1
      if (Number.isNaN(dateB)) return -1
      return dateB - dateA
    })

    setItems(allItems.slice(0, maxItems))
    setFeedErrors(errors)
    setLoading(false)
  }, [feeds, maxItems])

  // Fetch on mount and refresh on interval
  useEffect(() => {
    if (feeds.length === 0) return
    fetchAllFeeds()
    const interval = setInterval(fetchAllFeeds, refreshInterval * 60 * 1000)
    return () => clearInterval(interval)
  }, [feeds, fetchAllFeeds, refreshInterval])

  // Sync settings state when config changes externally
  useEffect(() => {
    setSettingsFeeds(feeds)
    setSettingsMaxItems(maxItems)
  }, [feeds, maxItems])

  function handleAddFeed() {
    const trimmedUrl = newFeedUrl.trim()
    if (!trimmedUrl || !isValidUrl(trimmedUrl)) return
    setSettingsFeeds((prev) => [
      ...prev,
      { url: trimmedUrl, name: newFeedName.trim() || undefined },
    ])
    setNewFeedUrl("")
    setNewFeedName("")
  }

  function handleRemoveFeed(index: number) {
    setSettingsFeeds((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSaveSettings() {
    setSaving(true)
    try {
      const res = await fetch(`/api/widgets/${widgetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: { feeds: settingsFeeds, maxItems: settingsMaxItems, refreshInterval },
        }),
      })
      if (res.ok) setShowSettings(false)
    } catch (error) {
      console.warn("Failed to save RSS config:", error)
    } finally {
      setSaving(false)
    }
  }

  async function handleSetupFirstFeed() {
    const trimmedUrl = newFeedUrl.trim()
    if (!trimmedUrl || !isValidUrl(trimmedUrl)) return

    setSaving(true)
    try {
      const res = await fetch(`/api/widgets/${widgetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            feeds: [{ url: trimmedUrl, name: newFeedName.trim() || undefined }],
            maxItems,
            refreshInterval,
          },
        }),
      })
      if (res.ok) {
        setNewFeedUrl("")
        setNewFeedName("")
      }
    } catch (error) {
      console.warn("Failed to save RSS config:", error)
    } finally {
      setSaving(false)
    }
  }

  const hasErrors = Object.keys(feedErrors).length > 0

  if (feeds.length === 0 && !showSettings) {
    return (
      <div className="h-full w-full flex flex-col rounded-lg border border-border bg-card overflow-hidden">
        <WidgetHeader icon={RssIcon} title="RSS Feed" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
          <HugeiconsIcon icon={RssIcon} strokeWidth={1.5} className="size-8 text-muted-foreground" />
          <p className="text-xs text-muted-foreground text-center">Add a feed URL to get started</p>
          <div className="flex w-full max-w-xs flex-col gap-2">
            <Input
              placeholder="https://example.com/feed.xml"
              value={newFeedUrl}
              onChange={(e) => setNewFeedUrl(e.target.value)}
            />
            <Input
              placeholder="Feed name (optional)"
              value={newFeedName}
              onChange={(e) => setNewFeedName(e.target.value)}
            />
            <Button size="sm" onClick={handleSetupFirstFeed} disabled={saving || !newFeedUrl.trim()}>
              {saving ? "Adding..." : "Add Feed"}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <WidgetHeader
        icon={RssIcon}
        title="RSS Feed"
        onSettingsClick={() => setShowSettings((s) => !s)}
        badge={
          hasErrors && !showSettings ? (
            <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-3 text-yellow-500" />
          ) : undefined
        }
      />

      {/* Settings panel */}
      {showSettings ? (
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex flex-col gap-3 p-3">
            {/* Existing feeds */}
            <div className="flex flex-col gap-1">
              <Label className="text-[0.625rem] text-muted-foreground">Configured Feeds</Label>
              {settingsFeeds.length === 0 ? (
                <span className="text-[0.625rem] text-muted-foreground">No feeds configured</span>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {settingsFeeds.map((feed, index) => (
                    <div
                      key={`${feed.url}-${index}`}
                      className="flex items-center gap-1.5 rounded border border-border px-2 py-1.5"
                    >
                      <div className="flex min-w-0 flex-1 flex-col">
                        {feed.name && (
                          <span className="text-[0.625rem] font-medium text-foreground truncate">
                            {feed.name}
                          </span>
                        )}
                        <span className="text-[0.5rem] text-muted-foreground truncate">{feed.url}</span>
                        {feedErrors[feed.url] && (
                          <span className="text-[0.5rem] text-yellow-500">{feedErrors[feed.url]}</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleRemoveFeed(index)}
                        aria-label={`Remove feed ${feed.name || feed.url}`}
                      >
                        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add feed form */}
            <div className="flex flex-col gap-1.5 border-t border-border pt-2">
              <Label className="text-[0.625rem] text-muted-foreground">Add Feed</Label>
              <Input
                placeholder="https://example.com/feed.xml"
                value={newFeedUrl}
                onChange={(e) => setNewFeedUrl(e.target.value)}
              />
              <Input
                placeholder="Feed name (optional)"
                value={newFeedName}
                onChange={(e) => setNewFeedName(e.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddFeed}
                disabled={!newFeedUrl.trim()}
              >
                <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} className="size-3" />
                Add
              </Button>
            </div>

            {/* Max items */}
            <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
              <Label htmlFor="rss-max-items" className="text-[0.625rem] text-muted-foreground">
                Max Items
              </Label>
              <Input
                id="rss-max-items"
                type="number"
                min={5}
                max={50}
                value={settingsMaxItems}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  if (val >= 5 && val <= 50) setSettingsMaxItems(val)
                }}
                className="w-16 text-center"
              />
            </div>

            {/* Save button */}
            <Button size="sm" onClick={handleSaveSettings} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
            {onDelete && <DeleteWidgetButton onConfirm={onDelete} />}
          </div>
        </div>
      ) : (
        <>
          {/* Loading state */}
          {loading && items.length === 0 ? (
            <div className="flex flex-1 flex-col gap-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="flex gap-2">
                    <div className="h-2 w-16 animate-pulse rounded bg-muted" />
                    <div className="h-2 w-12 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="h-2 w-full animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4">
              <span className="text-xs text-muted-foreground">No feed items found</span>
              <Button size="sm" variant="outline" onClick={fetchAllFeeds}>
                Retry
              </Button>
            </div>
          ) : (
            /* Feed items list */
            <div className="flex-1 overflow-y-auto">
              {items.map((item, index) => (
                <button
                  key={`${item.link}-${index}`}
                  type="button"
                  onClick={() => window.open(item.link, "_blank", "noopener,noreferrer")}
                  className="flex w-full flex-col gap-0.5 border-b border-border px-3 py-2 text-left transition-colors hover:bg-muted/50 cursor-pointer"
                >
                  <span className="text-xs font-medium text-foreground line-clamp-2">{item.title}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[0.625rem] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground shrink-0">
                      {item.feedName}
                    </span>
                    <span className="text-[0.625rem] text-muted-foreground">
                      {formatPubDate(item.pubDate)}
                    </span>
                  </div>
                  {item.contentSnippet && (
                    <span className="text-[0.625rem] text-muted-foreground line-clamp-2">
                      {item.contentSnippet}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
