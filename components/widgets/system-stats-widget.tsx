"use client"

import { useState, useEffect } from "react"
import { CpuIcon } from "@hugeicons/core-free-icons"
import { WidgetHeader } from "@/components/widget-header"
import { DeleteWidgetButton } from "@/components/delete-widget-button"
import { cn } from "@/lib/utils"

interface SystemStatsWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
}

interface SystemStatsData {
  cpu: {
    usage: number
    cores: number[]
  }
  memory: {
    used: number
    total: number
    usage: number
  }
  disk: {
    used: number
    total: number
    usage: number
    filesystems: { mount: string; used: number; size: number; usage: number }[]
  }
  network: {
    rx_sec: number
    tx_sec: number
  }
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(decimals)} ${sizes[i]}`
}

function getBarColor(usage: number): string {
  if (usage < 60) return "bg-green-500"
  if (usage <= 85) return "bg-amber-500"
  return "bg-red-500"
}

export function SystemStatsWidget({ config, onDelete }: SystemStatsWidgetProps): React.ReactElement {
  const [showSettings, setShowSettings] = useState(false)
  const refreshInterval =
    typeof config?.refreshInterval === "number" && config.refreshInterval > 0
      ? config.refreshInterval
      : 5

  const [data, setData] = useState<SystemStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchStats() {
    try {
      const res = await fetch("/api/widgets/system-stats")
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Failed to fetch system stats" }))
        setError(body.error ?? "Failed to fetch system stats")
        return
      }
      setData(await res.json())
      setError(null)
    } catch {
      setError("Failed to fetch system stats")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, refreshInterval * 1000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshInterval])

  return (
    <div className={cn(
      "h-full w-full flex flex-col rounded-lg border border-border bg-card overflow-hidden",
      !loading && !error && "widget-glow-success",
      !loading && error && "widget-glow-error"
    )}>
      <WidgetHeader
        icon={CpuIcon}
        title="System Stats"
        isSettings={showSettings}
        onSettingsClick={() => setShowSettings((s) => !s)}
        status={!showSettings && !loading ? (error ? "error" : "success") : undefined}
        rightContent={
          error ? (
            <span className="text-[0.625rem] text-red-400">error</span>
          ) : undefined
        }
      />

      {/* Settings panel */}
      {showSettings ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {onDelete && <DeleteWidgetButton onConfirm={onDelete} />}
        </div>
      ) : (
      <>

      {/* Loading state */}
      {loading && !data ? (
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="flex flex-col items-center gap-2">
            <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            <span className="text-xs text-muted-foreground">Loading system stats...</span>
          </div>
        </div>
      ) : null}

      {/* Error state (no data at all) */}
      {!loading && !data && error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4">
          <span className="text-xs text-muted-foreground">{error}</span>
          <button
            onClick={fetchStats}
            className="text-xs text-primary underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* Stats display */}
      {data ? (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-3">
            {/* CPU */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[0.625rem] font-medium text-muted-foreground">CPU</span>
                <span className="text-[0.625rem] font-medium text-foreground">
                  {data.cpu.usage.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getBarColor(data.cpu.usage)}`}
                  style={{ width: `${Math.min(data.cpu.usage, 100)}%` }}
                />
              </div>
            </div>

            {/* RAM */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[0.625rem] font-medium text-muted-foreground">RAM</span>
                <span className="text-[0.625rem] font-medium text-foreground">
                  {formatBytes(data.memory.used)} / {formatBytes(data.memory.total)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getBarColor(data.memory.usage)}`}
                  style={{ width: `${Math.min(data.memory.usage, 100)}%` }}
                />
              </div>
            </div>

            {/* Disk */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[0.625rem] font-medium text-muted-foreground">Disk</span>
                <span className="text-[0.625rem] font-medium text-foreground">
                  {formatBytes(data.disk.used)} / {formatBytes(data.disk.total)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getBarColor(data.disk.usage)}`}
                  style={{ width: `${Math.min(data.disk.usage, 100)}%` }}
                />
              </div>
            </div>

            {/* Network */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[0.625rem] font-medium text-muted-foreground">Network</span>
              </div>
              <div className="flex items-center gap-2 text-[0.625rem] font-medium text-foreground">
                <span>↓ {formatBytes(Math.max(0, data.network.rx_sec))}/s</span>
                <span>↑ {formatBytes(Math.max(0, data.network.tx_sec))}/s</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      </>
      )}
    </div>
  )
}
