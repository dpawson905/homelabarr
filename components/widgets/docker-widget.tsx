"use client"

import { useState, useEffect, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ContainerTruckIcon,
  PlayIcon,
  StopIcon,
  RefreshIcon,
  Settings02Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { WidgetHeader } from "@/components/widget-header"
import { DeleteWidgetButton } from "@/components/delete-widget-button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { ContainerData } from "@/app/api/widgets/docker/types"

interface DockerWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(decimals)} ${sizes[i]}`
}

function getStatusColor(state: string): string {
  switch (state) {
    case "running":
      return "bg-green-500"
    case "exited":
    case "dead":
      return "bg-red-500"
    case "paused":
      return "bg-amber-500"
    default:
      return "bg-gray-400"
  }
}

export function DockerWidget({ widgetId, config, onDelete }: DockerWidgetProps): React.ReactElement {
  const [savedConfig, setSavedConfig] = useState({
    socketPath: (config?.socketPath as string) ?? "/var/run/docker.sock",
    showStopped: (config?.showStopped as boolean) ?? false,
    refreshInterval: (config?.refreshInterval as number) ?? 10,
  })

  const [containers, setContainers] = useState<ContainerData[]>([])
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [settingsSocketPath, setSettingsSocketPath] = useState(savedConfig.socketPath)
  const [settingsShowStopped, setSettingsShowStopped] = useState(savedConfig.showStopped)
  const [settingsRefreshInterval, setSettingsRefreshInterval] = useState(savedConfig.refreshInterval)
  const [saving, setSaving] = useState(false)

  // Keep settings form in sync when saved config propagates back via props
  useEffect(() => {
    const incoming = {
      socketPath: (config?.socketPath as string) ?? "/var/run/docker.sock",
      showStopped: (config?.showStopped as boolean) ?? false,
      refreshInterval: (config?.refreshInterval as number) ?? 10,
    }
    setSavedConfig(incoming)
    setSettingsSocketPath(incoming.socketPath)
    setSettingsShowStopped(incoming.showStopped)
    setSettingsRefreshInterval(incoming.refreshInterval)
  }, [config])

  const fetchContainers = useCallback(async () => {
    const params = new URLSearchParams()
    if (savedConfig.socketPath !== "/var/run/docker.sock") params.set("socketPath", savedConfig.socketPath)
    if (savedConfig.showStopped) params.set("all", "true")

    const query = params.toString()
    const url = `/api/widgets/docker${query ? `?${query}` : ""}`

    try {
      const res = await fetch(url)

      if (res.status === 503) {
        setUnavailable(true)
        setContainers([])
        return
      }

      if (!res.ok) {
        console.warn("Failed to fetch Docker containers:", await res.text())
        return
      }

      const data = await res.json()
      setUnavailable(false)
      setContainers(data.containers ?? [])
    } catch (error) {
      console.warn("Failed to fetch Docker containers:", error)
    } finally {
      setLoading(false)
    }
  }, [savedConfig.socketPath, savedConfig.showStopped])

  useEffect(() => {
    setLoading(true)
    fetchContainers()

    const interval = setInterval(fetchContainers, savedConfig.refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [fetchContainers, savedConfig.refreshInterval])

  async function handleAction(containerId: string, action: "start" | "stop" | "restart") {
    setActionLoading(`${containerId}-${action}`)
    try {
      const res = await fetch(`/api/widgets/docker/${containerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, socketPath: savedConfig.socketPath }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.message || `Failed to ${action} container`)
        return
      }

      await fetchContainers()
    } catch {
      toast.error(`Failed to ${action} container`)
    } finally {
      setActionLoading(null)
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
            socketPath: settingsSocketPath,
            showStopped: settingsShowStopped,
            refreshInterval: settingsRefreshInterval,
          },
        }),
      })

      if (!res.ok) {
        toast.error("Failed to save settings")
        return
      }

      setSavedConfig({
        socketPath: settingsSocketPath,
        showStopped: settingsShowStopped,
        refreshInterval: settingsRefreshInterval,
      })
      setShowSettings(false)
      setLoading(true)
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const runningCount = containers.filter((c) => c.state === "running").length

  if (showSettings) {
    return (
      <div className="flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden">
        <WidgetHeader icon={ContainerTruckIcon} title="Docker" isSettings onSettingsClick={() => setShowSettings(false)} />
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="docker-socket">Socket Path</Label>
            <Input
              id="docker-socket"
              value={settingsSocketPath}
              onChange={(e) => setSettingsSocketPath(e.target.value)}
              placeholder="/var/run/docker.sock"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="docker-show-stopped">Show stopped containers</Label>
            <Switch
              id="docker-show-stopped"
              size="sm"
              checked={settingsShowStopped}
              onCheckedChange={setSettingsShowStopped}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="docker-refresh">Refresh interval (seconds)</Label>
            <Input
              id="docker-refresh"
              type="number"
              min={5}
              max={300}
              value={settingsRefreshInterval}
              onChange={(e) => setSettingsRefreshInterval(Number(e.target.value) || 10)}
            />
          </div>

          <Button onClick={handleSaveSettings} disabled={saving} className="w-full" size="sm">
            {saving ? "Saving..." : "Save Settings"}
          </Button>
          {onDelete && <DeleteWidgetButton onConfirm={onDelete} />}
        </div>
      </div>
    )
  }

  if (!loading && unavailable) {
    return (
      <div className={cn(
        "flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden",
        "widget-glow-error"
      )}>
        <WidgetHeader icon={ContainerTruckIcon} title="Docker" onSettingsClick={() => setShowSettings(true)} status="error" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
          <HugeiconsIcon
            icon={ContainerTruckIcon}
            strokeWidth={1.5}
            className="size-10 text-muted-foreground/30"
          />
          <p className="text-sm font-medium text-muted-foreground">Cannot connect to Docker</p>
          <p className="text-center text-xs text-muted-foreground/70">
            Make sure Docker is running and the socket is accessible at{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[0.625rem]">{savedConfig.socketPath}</code>
          </p>
          <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
            <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} data-icon="inline-start" />
            Settings
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden",
      !loading && !unavailable && "widget-glow-success",
      !loading && unavailable && "widget-glow-error"
    )}>
      <WidgetHeader
        icon={ContainerTruckIcon}
        title="Docker"
        onSettingsClick={() => setShowSettings(true)}
        status={!loading ? (unavailable ? "error" : "success") : undefined}
        badge={!loading && runningCount !== undefined ? (
          <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[0.5625rem]">
            {runningCount}
          </Badge>
        ) : undefined}
      />

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 border-b border-border">
                <Skeleton className="size-2 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2 w-16" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ) : containers.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-6">
            <HugeiconsIcon
              icon={ContainerTruckIcon}
              strokeWidth={1.5}
              className="size-8 text-muted-foreground/30"
            />
            <p className="text-xs text-muted-foreground">No containers found</p>
          </div>
        ) : (
          containers.map((container) => (
            <div
              key={container.id}
              className="flex items-center gap-2 px-3 py-2 border-b border-border hover:bg-muted/50"
            >
              <div className={cn("size-2 shrink-0 rounded-full", getStatusColor(container.state))} />

              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs font-medium">{container.name}</span>
                <span className="truncate text-[0.625rem] text-muted-foreground">
                  {container.image}
                </span>
              </div>

              <span className="hidden shrink-0 text-[0.625rem] text-muted-foreground sm:block">
                {container.status}
              </span>

              {container.state === "running" && container.stats && (
                <div className="hidden shrink-0 flex-col items-end gap-0.5 md:flex">
                  <span className="text-[0.5625rem] text-muted-foreground">
                    {container.stats.cpuPercent.toFixed(1)}%
                  </span>
                  <div className="h-1 w-10 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(container.stats.cpuPercent, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {container.state === "running" && container.stats && (
                <span className="hidden shrink-0 text-[0.5625rem] text-muted-foreground lg:block">
                  {formatBytes(container.stats.memoryUsage)} /{" "}
                  {formatBytes(container.stats.memoryLimit)}
                </span>
              )}

              <div className="flex shrink-0 items-center gap-0.5">
                {container.state !== "running" && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleAction(container.id, "start")}
                    disabled={actionLoading === `${container.id}-start`}
                    aria-label={`Start ${container.name}`}
                    title="Start"
                  >
                    <HugeiconsIcon
                      icon={PlayIcon}
                      strokeWidth={2}
                      className={cn(
                        "size-2.5",
                        actionLoading === `${container.id}-start` && "animate-pulse"
                      )}
                    />
                  </Button>
                )}
                {container.state === "running" && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleAction(container.id, "stop")}
                      disabled={actionLoading === `${container.id}-stop`}
                      aria-label={`Stop ${container.name}`}
                      title="Stop"
                    >
                      <HugeiconsIcon
                        icon={StopIcon}
                        strokeWidth={2}
                        className={cn(
                          "size-2.5",
                          actionLoading === `${container.id}-stop` && "animate-pulse"
                        )}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleAction(container.id, "restart")}
                      disabled={actionLoading === `${container.id}-restart`}
                      aria-label={`Restart ${container.name}`}
                      title="Restart"
                    >
                      <HugeiconsIcon
                        icon={RefreshIcon}
                        strokeWidth={2}
                        className={cn(
                          "size-2.5",
                          actionLoading === `${container.id}-restart` && "animate-pulse"
                        )}
                      />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
