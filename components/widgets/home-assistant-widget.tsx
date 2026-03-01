"use client"

import { useState, useEffect, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import type { IconSvgElement } from "@hugeicons/react"
import {
  HomeWifiIcon,
  BulbIcon,
  ToggleOnIcon,
  Fan01Icon,
  Door01Icon,
  LockIcon,
  VolumeHighIcon,
  ThermometerIcon,
  DashboardSpeed01Icon,
  Camera01Icon,
  Settings02Icon,
  Plug01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type {
  EntityState,
  HomeAssistantResponse,
} from "@/app/api/widgets/home-assistant/types"

interface HomeAssistantWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
}

const DOMAIN_ICONS: Record<string, IconSvgElement> = {
  light: BulbIcon,
  switch: ToggleOnIcon,
  fan: Fan01Icon,
  cover: Door01Icon,
  lock: LockIcon,
  media_player: VolumeHighIcon,
  sensor: ThermometerIcon,
  binary_sensor: DashboardSpeed01Icon,
  camera: Camera01Icon,
  climate: ThermometerIcon,
  automation: Plug01Icon,
}

function getDomainIcon(domain: string): IconSvgElement {
  return DOMAIN_ICONS[domain] ?? DashboardSpeed01Icon
}

function getStateColor(state: string): string {
  switch (state) {
    case "on":
      return "text-green-500"
    case "off":
      return "text-muted-foreground"
    case "unavailable":
    case "unknown":
      return "text-red-500"
    default:
      return "text-foreground"
  }
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "now"
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

function parseEntityIds(config: Record<string, unknown> | null): string[] {
  const raw = config?.entityIds
  if (!Array.isArray(raw)) return []
  return raw.filter((id): id is string => typeof id === "string" && id.length > 0)
}

function entityIdsToText(ids: string[]): string {
  return ids.join("\n")
}

function textToEntityIds(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

const POLL_INTERVAL_MS = 15_000

export function HomeAssistantWidget({
  widgetId,
  config,
}: HomeAssistantWidgetProps): React.ReactElement {
  const configured = isConfigured(config)
  const entityIds = parseEntityIds(config)

  const [entities, setEntities] = useState<EntityState[]>([])
  const [loading, setLoading] = useState(configured)
  const [showSettings, setShowSettings] = useState(false)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  const [settingsServiceUrl, setSettingsServiceUrl] = useState(
    (config?.serviceUrl as string) ?? ""
  )
  const [settingsSecretName, setSettingsSecretName] = useState(
    (config?.secretName as string) ?? ""
  )
  const [settingsEntityIds, setSettingsEntityIds] = useState(
    entityIdsToText(entityIds)
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setSettingsServiceUrl((config?.serviceUrl as string) ?? "")
    setSettingsSecretName((config?.secretName as string) ?? "")
    setSettingsEntityIds(entityIdsToText(parseEntityIds(config)))
  }, [config])

  const fetchEntities = useCallback(async () => {
    if (!configured) return

    try {
      const params = new URLSearchParams({ widgetId })
      const res = await fetch(`/api/widgets/home-assistant?${params}`)

      if (!res.ok) {
        console.warn("Failed to fetch HA entities:", await res.text())
        return
      }

      const data: HomeAssistantResponse = await res.json()
      setEntities(data.entities)
    } catch (error) {
      console.warn("Failed to fetch HA entities:", error)
    } finally {
      setLoading(false)
    }
  }, [widgetId, configured])

  useEffect(() => {
    if (!configured) return
    fetchEntities()
    const interval = setInterval(fetchEntities, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchEntities, configured])

  async function handleToggle(entity: EntityState) {
    setTogglingIds((prev) => new Set(prev).add(entity.entityId))
    setEntities((prev) =>
      prev.map((e) =>
        e.entityId === entity.entityId
          ? { ...e, state: e.state === "on" ? "off" : "on" }
          : e
      )
    )

    try {
      const params = new URLSearchParams({ widgetId })
      const res = await fetch(`/api/widgets/home-assistant?${params}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entity.entityId,
          domain: "homeassistant",
          service: "toggle",
        }),
      })

      if (!res.ok) {
        setEntities((prev) =>
          prev.map((e) =>
            e.entityId === entity.entityId ? { ...e, state: entity.state } : e
          )
        )
        toast.error(`Failed to toggle ${entity.friendlyName}`)
        return
      }

      await fetchEntities()
    } catch {
      setEntities((prev) =>
        prev.map((e) =>
          e.entityId === entity.entityId ? { ...e, state: entity.state } : e
        )
      )
      toast.error(`Failed to toggle ${entity.friendlyName}`)
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(entity.entityId)
        return next
      })
    }
  }

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
            entityIds: textToEntityIds(settingsEntityIds),
          },
        }),
      })

      if (!res.ok) {
        toast.error("Failed to save settings")
        return
      }

      setShowSettings(false)
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  if (showSettings || !configured) {
    return (
      <div className="flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-1.5">
            <HugeiconsIcon
              icon={Settings02Icon}
              strokeWidth={2}
              className="size-3.5 text-muted-foreground"
            />
            <span className="text-xs font-medium text-foreground">
              {configured ? "Home Assistant Settings" : "Setup Home Assistant"}
            </span>
          </div>
          {configured && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setShowSettings(false)}
              aria-label="Close settings"
            >
              <span className="text-xs">&times;</span>
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ha-url">Service URL</Label>
            <Input
              id="ha-url"
              value={settingsServiceUrl}
              onChange={(e) => setSettingsServiceUrl(e.target.value)}
              placeholder="http://homeassistant.local:8123"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ha-secret">Secret Name</Label>
            <Input
              id="ha-secret"
              value={settingsSecretName}
              onChange={(e) => setSettingsSecretName(e.target.value)}
              placeholder="home-assistant-token"
            />
            <p className="text-[0.625rem] text-muted-foreground">
              Store a long-lived access token from HA Settings &gt; Security
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ha-entities">Entity IDs (one per line)</Label>
            <Textarea
              id="ha-entities"
              value={settingsEntityIds}
              onChange={(e) => setSettingsEntityIds(e.target.value)}
              placeholder={"light.living_room\nswitch.garage\nsensor.temperature"}
              rows={5}
              className="text-xs font-mono"
            />
            <p className="text-[0.625rem] text-muted-foreground">
              Leave empty to show the first 20 entities from your HA instance
            </p>
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
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <HugeiconsIcon
            icon={HomeWifiIcon}
            strokeWidth={2}
            className="size-3.5 text-muted-foreground"
          />
          <span className="text-xs font-medium text-foreground">
            Home Assistant
          </span>
          {!loading && (
            <Badge
              variant="secondary"
              className="ml-1 h-4 px-1.5 text-[0.5625rem]"
            >
              {entities.length}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setShowSettings(true)}
          aria-label="Home Assistant settings"
        >
          <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border"
              >
                <Skeleton className="size-4 shrink-0 rounded" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-2 w-16" />
                </div>
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>
        ) : entities.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-6">
            <HugeiconsIcon
              icon={HomeWifiIcon}
              strokeWidth={1.5}
              className="size-8 text-muted-foreground/30"
            />
            <p className="text-xs text-muted-foreground">
              {entityIds.length === 0
                ? "No entities configured"
                : "No matching entities found"}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
            >
              Configure Entities
            </Button>
          </div>
        ) : (
          entities.map((entity) => (
            <div
              key={entity.entityId}
              className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-muted/50"
            >
              <HugeiconsIcon
                icon={getDomainIcon(entity.domain)}
                strokeWidth={2}
                className={cn(
                  "size-4 shrink-0",
                  entity.state === "on" ? "text-amber-500" : "text-muted-foreground"
                )}
              />

              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs font-medium text-foreground">
                  {entity.friendlyName}
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "text-[0.625rem] font-medium",
                      getStateColor(entity.state)
                    )}
                  >
                    {entity.state}
                  </span>
                  <span className="text-[0.5625rem] text-muted-foreground">
                    {timeAgo(entity.lastChanged)}
                  </span>
                </div>
              </div>

              {entity.controllable && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleToggle(entity)}
                  disabled={togglingIds.has(entity.entityId)}
                  aria-label={`Toggle ${entity.friendlyName}`}
                  title="Toggle"
                  className={cn(
                    "shrink-0",
                    togglingIds.has(entity.entityId) && "animate-pulse"
                  )}
                >
                  <HugeiconsIcon
                    icon={ToggleOnIcon}
                    strokeWidth={2}
                    className={cn(
                      "size-3.5",
                      entity.state === "on" ? "text-green-500" : "text-muted-foreground"
                    )}
                  />
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
