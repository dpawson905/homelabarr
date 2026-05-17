"use client"

import { useEffect, useState, useCallback } from "react"
import { BotIcon } from "@hugeicons/core-free-icons"
import { WidgetHeader } from "@/components/widget-header"
import { DeleteWidgetButton } from "@/components/delete-widget-button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { HermesResponse } from "@/app/api/widgets/hermes/types"

interface HermesWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
}

function relativeTime(ageSec: number | null): string {
  if (ageSec == null) return "—"
  if (ageSec < 60) return `${ageSec}s ago`
  if (ageSec < 3600) return `${Math.round(ageSec / 60)}m ago`
  if (ageSec < 86400) return `${Math.round(ageSec / 3600)}h ago`
  return `${Math.round(ageSec / 86400)}d ago`
}

function uptimeLabel(sec: number | null): string {
  if (sec == null) return "—"
  if (sec < 60) return `${sec}s`
  if (sec < 3600) return `${Math.round(sec / 60)}m`
  if (sec < 86400) return `${Math.round(sec / 3600)}h`
  return `${Math.round(sec / 86400)}d`
}

function statusColor(status: string): string {
  if (status === "done") return "text-green-500"
  if (status === "blocked" || status === "failed") return "text-red-500"
  if (status === "running") return "text-blue-500 animate-pulse"
  if (status === "ready") return "text-yellow-500"
  return "text-muted-foreground"
}

export function HermesWidget({
  widgetId: _widgetId,
  config: _config,
  onDelete,
}: HermesWidgetProps): React.ReactElement {
  const [data, setData] = useState<HermesResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/widgets/hermes")
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }))
        setError(body.error ?? `Error ${res.status}`)
        setData(null)
        return
      }
      setData(await res.json())
      setError(null)
    } catch {
      setError("Failed to connect")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const t = setInterval(fetchStatus, 15000)
    return () => clearInterval(t)
  }, [fetchStatus])

  const headerStatus: "success" | "error" | undefined = error
    ? "error"
    : data?.gateway.subState === "running"
      ? "success"
      : data
        ? "error"
        : undefined

  const activeProfile = data?.profiles.find((p) => p.active)

  return (
    <div className="flex h-full flex-col">
      <WidgetHeader
        icon={BotIcon}
        title="Hermes"
        status={headerStatus}
        isSettings={showSettings}
        onSettingsClick={() => setShowSettings((s) => !s)}
      />

      {showSettings ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
          <p className="text-muted-foreground">
            Polls a Hermes status shim at{" "}
            <span className="font-mono">HERMES_STATUS_SHIM_URL</span> (defaults to{" "}
            <span className="font-mono">http://100.90.28.107:7755/status</span>).
            Run <span className="font-mono">hermes-status-shim</span> on the host
            running Hermes Agent + gateway.
          </p>
          {onDelete && <DeleteWidgetButton onConfirm={onDelete} />}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-3 py-2 text-xs">
          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}

          {error && (
            <div className="rounded border border-red-500/40 bg-red-500/10 p-2 text-red-400">
              {error}
            </div>
          )}

          {data && (
            <div className="space-y-3">
              <div>
                <div className="text-muted-foreground mb-1">Gateway</div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className={cn("font-medium", data.gateway.subState === "running" ? "text-green-500" : "text-red-500")}>
                    {data.gateway.subState ?? "unknown"}
                  </span>
                  <span className="text-muted-foreground">
                    up {uptimeLabel(data.gateway.uptimeSec)}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Telegram: {data.gateway.telegramEnabled ? "✓ enabled" : "✗ disabled"}
                  {data.gateway.pid && <> · pid {data.gateway.pid}</>}
                </div>
              </div>

              {activeProfile && (
                <div>
                  <div className="text-muted-foreground mb-1">Active profile</div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono font-medium">{activeProfile.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[60%]">
                      {activeProfile.model}
                    </span>
                  </div>
                </div>
              )}

              {Object.keys(data.kanban.countsByStatus).length > 0 && (
                <div>
                  <div className="text-muted-foreground mb-1">Kanban</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(data.kanban.countsByStatus).map(([status, n]) => (
                      <div
                        key={status}
                        className="rounded bg-muted px-1.5 py-0.5 text-[10px]"
                      >
                        <span className={cn("uppercase font-medium", statusColor(status))}>{status}</span>
                        <span className="ml-1 font-mono">{n}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.kanban.recent.length > 0 && (
                <div>
                  <div className="text-muted-foreground mb-1">Recent tasks</div>
                  <ul className="space-y-0.5">
                    {data.kanban.recent.slice(0, 5).map((t) => (
                      <li
                        key={t.id}
                        className="flex items-baseline justify-between gap-2"
                      >
                        <span className="truncate min-w-0 flex-1">
                          <span className={cn("text-[10px] uppercase mr-1", statusColor(t.status))}>
                            {t.status}
                          </span>
                          <span className="text-[10px]">{t.title}</span>
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {relativeTime(t.ageSec)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
