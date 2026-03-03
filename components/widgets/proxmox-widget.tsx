"use client"

import { useState, useEffect, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ComputerIcon, Settings02Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { WidgetHeader } from "@/components/widget-header"
import { DeleteWidgetButton } from "@/components/delete-widget-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type {
  ProxmoxNode,
  ProxmoxGuest,
  ProxmoxSummary,
  ProxmoxResponse,
} from "@/app/api/widgets/proxmox/types"

interface ProxmoxWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
}

type SectionTab = "nodes" | "guests"

function formatUptime(seconds: number): string {
  if (seconds <= 0) return "0m"
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B"
  const tb = bytes / (1024 * 1024 * 1024 * 1024)
  if (tb >= 1) return `${tb.toFixed(1)} TB`
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(0)} MB`
}

function usageColor(pct: number): string {
  if (pct >= 80) return "bg-red-500"
  if (pct >= 60) return "bg-amber-500"
  return "bg-green-500"
}

function isConfigured(config: Record<string, unknown> | null): boolean {
  return (
    typeof config?.serviceUrl === "string" &&
    config.serviceUrl.length > 0 &&
    typeof config?.secretName === "string" &&
    config.secretName.length > 0
  )
}

const GUEST_STATUS_ORDER: Record<string, number> = { running: 0, paused: 1, stopped: 2 }

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

function LoadingSkeleton(): React.ReactElement {
  return (
    <div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-3 py-2.5 border-b border-border"
        >
          <Skeleton className="size-2 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ message }: { message: string }): React.ReactElement {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 py-6">
      <HugeiconsIcon
        icon={ComputerIcon}
        strokeWidth={1.5}
        className="size-8 text-muted-foreground/30"
      />
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  )
}

function NodesView({ nodes }: { nodes: ProxmoxNode[] }): React.ReactElement {
  if (nodes.length === 0) {
    return <EmptyState message="No nodes found" />
  }

  return (
    <>
      {nodes.map((node) => (
        <div
          key={node.id}
          className="flex items-start gap-2.5 px-3 py-2.5 border-b border-border last:border-b-0"
        >
          <span
            className={cn(
              "mt-1 size-2 shrink-0 rounded-full",
              node.status === "online" ? "bg-green-500" : "bg-red-500"
            )}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-baseline justify-between">
              <span className="truncate text-xs font-medium text-foreground">{node.name}</span>
              <span className="shrink-0 text-[0.5625rem] text-muted-foreground">
                {node.status === "online" ? formatUptime(node.uptime) : "offline"}
              </span>
            </div>
            <UsageBar label="CPU" pct={node.cpuUsage} />
            <UsageBar label="RAM" pct={node.memUsage} />
            <span className="text-[0.5625rem] text-muted-foreground">
              {formatBytes(node.memTotal)} total
            </span>
          </div>
        </div>
      ))}
    </>
  )
}

function GuestsView({ guests }: { guests: ProxmoxGuest[] }): React.ReactElement {
  if (guests.length === 0) {
    return <EmptyState message="No VMs or containers found" />
  }

  const sorted = [...guests].sort(
    (a, b) => (GUEST_STATUS_ORDER[a.status] ?? 2) - (GUEST_STATUS_ORDER[b.status] ?? 2)
  )

  return (
    <>
      {sorted.map((guest) => (
        <div
          key={`${guest.node}-${guest.type}-${guest.vmid}`}
          className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border last:border-b-0"
        >
          <span
            className={cn(
              "shrink-0 rounded px-1 py-0.5 text-[0.5rem] font-semibold leading-none",
              guest.type === "qemu"
                ? "bg-blue-500/10 text-blue-500"
                : "bg-purple-500/10 text-purple-500"
            )}
          >
            {guest.type === "qemu" ? "VM" : "CT"}
          </span>
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              guest.status === "running"
                ? "bg-green-500"
                : guest.status === "paused"
                  ? "bg-amber-500"
                  : "bg-gray-400"
            )}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-baseline gap-1.5">
              <span className="truncate text-xs font-medium text-foreground">{guest.name}</span>
              <span className="shrink-0 text-[0.5rem] text-muted-foreground">{guest.node}</span>
            </div>
            <span className="text-[0.5625rem] text-muted-foreground">
              CPU {guest.cpuUsage.toFixed(0)}% | RAM {guest.memUsage.toFixed(0)}%
            </span>
          </div>
        </div>
      ))}
    </>
  )
}

export function ProxmoxWidget({
  widgetId,
  config,
  onDelete,
}: ProxmoxWidgetProps): React.ReactElement {
  const [savedConfig, setSavedConfig] = useState({
    serviceUrl: (config?.serviceUrl as string) ?? "",
    secretName: (config?.secretName as string) ?? "",
  })
  const configured = !!savedConfig.serviceUrl && !!savedConfig.secretName

  const [nodes, setNodes] = useState<ProxmoxNode[]>([])
  const [guests, setGuests] = useState<ProxmoxGuest[]>([])
  const [summary, setSummary] = useState<ProxmoxSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<SectionTab>("nodes")
  const [showSettings, setShowSettings] = useState(false)

  const [settingsServiceUrl, setSettingsServiceUrl] = useState(savedConfig.serviceUrl)
  const [settingsSecretName, setSettingsSecretName] = useState(savedConfig.secretName)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const incoming = {
      serviceUrl: (config?.serviceUrl as string) ?? "",
      secretName: (config?.secretName as string) ?? "",
    }
    setSavedConfig(incoming)
    setSettingsServiceUrl(incoming.serviceUrl)
    setSettingsSecretName(incoming.secretName)
  }, [config])

  const fetchData = useCallback(async () => {
    if (!configured) {
      setLoading(false)
      return
    }

    try {
      const params = new URLSearchParams({ widgetId })
      const res = await fetch(`/api/widgets/proxmox?${params}`)

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }))
        setError(body.error ?? `Error ${res.status}`)
        setNodes([])
        setGuests([])
        setSummary(null)
        return
      }

      const data: ProxmoxResponse = await res.json()
      setNodes(data.nodes)
      setGuests(data.guests)
      setSummary(data.summary)
      setError(null)
    } catch {
      setError("Failed to connect")
      setNodes([])
      setGuests([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [widgetId, configured])

  useEffect(() => {
    if (!configured) {
      setLoading(false)
      return
    }

    setLoading(true)
    fetchData()

    const interval = setInterval(fetchData, 30_000)
    return () => clearInterval(interval)
  }, [fetchData, configured])

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
          },
        }),
      })

      if (!res.ok) {
        toast.error("Failed to save settings")
        return
      }

      setSavedConfig({
        serviceUrl: settingsServiceUrl,
        secretName: settingsSecretName,
      })
      setShowSettings(false)
      setLoading(true)
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  if (showSettings || !configured) {
    return (
      <div className="flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden">
        <WidgetHeader
          icon={ComputerIcon}
          title="Proxmox"
          isSettings
          settingsTitle={configured ? "Proxmox Settings" : "Setup Proxmox"}
          onSettingsClick={configured ? () => setShowSettings(false) : undefined}
        />

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="proxmox-url">Service URL</Label>
            <Input
              id="proxmox-url"
              value={settingsServiceUrl}
              onChange={(e) => setSettingsServiceUrl(e.target.value)}
              placeholder="https://proxmox.local:8006"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proxmox-secret">Secret Name</Label>
            <Input
              id="proxmox-secret"
              value={settingsSecretName}
              onChange={(e) => setSettingsSecretName(e.target.value)}
              placeholder="PROXMOX"
            />
            <p className="text-[0.625rem] text-muted-foreground">
              Name of a secret created in Settings (format: USER@REALM!TOKENID=UUID)
            </p>
          </div>

          <Button
            onClick={handleSaveSettings}
            disabled={saving || !settingsServiceUrl.trim() || !settingsSecretName.trim()}
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
          icon={ComputerIcon}
          title="Proxmox"
          onSettingsClick={() => setShowSettings(true)}
          status="error"
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
          <HugeiconsIcon
            icon={ComputerIcon}
            strokeWidth={1.5}
            className="size-10 text-muted-foreground/30"
          />
          <p className="text-sm font-medium text-muted-foreground">
            Cannot connect to Proxmox
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
        icon={ComputerIcon}
        title="Proxmox"
        onSettingsClick={() => setShowSettings(true)}
        status={!loading && configured ? (error ? "error" : "success") : undefined}
        badge={
          summary !== null ? (
            <>
              <span className="ml-1 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[0.5625rem] font-medium text-blue-500">
                {summary.onlineNodes}/{summary.totalNodes} nodes
              </span>
              <span className="rounded-full bg-green-500/10 px-1.5 py-0.5 text-[0.5625rem] font-medium text-green-500">
                {summary.runningGuests}/{summary.totalGuests} running
              </span>
            </>
          ) : undefined
        }
      />

      <div className="flex shrink-0 items-center gap-1 border-b border-border px-3 py-1.5">
        {(["nodes", "guests"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "rounded-full px-2 py-0.5 text-[0.625rem] font-medium transition-colors capitalize",
              activeTab === tab
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <LoadingSkeleton />
        ) : activeTab === "nodes" ? (
          <NodesView nodes={nodes} />
        ) : (
          <GuestsView guests={guests} />
        )}
      </div>
    </div>
  )
}
