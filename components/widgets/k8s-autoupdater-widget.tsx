"use client"

import { useEffect, useState, useCallback } from "react"
import { ServerStack01Icon } from "@hugeicons/core-free-icons"
import { WidgetHeader } from "@/components/widget-header"
import { DeleteWidgetButton } from "@/components/delete-widget-button"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import type {
  K8sAutoupdaterResponse,
  K8sAutoupdaterCycle,
} from "@/app/api/widgets/k8s-autoupdater/types"

interface K8sAutoupdaterWidgetProps {
  widgetId: string
  config: Record<string, unknown> | null
  onDelete?: () => void
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—"
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return "—"
  const diffSec = Math.round((Date.now() - then) / 1000)
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h ago`
  return `${Math.round(diffSec / 86400)}d ago`
}

function outcomeStyle(o: K8sAutoupdaterCycle["outcome"]): string {
  if (o === "success") return "text-green-500"
  if (o === "failed") return "text-red-500"
  if (o === "running") return "text-blue-500 animate-pulse"
  return "text-muted-foreground"
}

export function K8sAutoupdaterWidget({
  widgetId,
  config: _config,
  onDelete,
}: K8sAutoupdaterWidgetProps): React.ReactElement {
  const [data, setData] = useState<K8sAutoupdaterResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/widgets/k8s-autoupdater?widgetId=${widgetId}`)
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
  }, [widgetId])

  useEffect(() => {
    fetchStatus()
    const t = setInterval(fetchStatus, 30000)
    return () => clearInterval(t)
  }, [fetchStatus])

  const headerStatus: "success" | "error" | undefined = error
    ? "error"
    : data?.killSwitch || data?.lastCycle?.outcome === "failed"
      ? "error"
      : data?.lastCycle?.outcome === "success"
        ? "success"
        : undefined

  return (
    <div className="flex h-full flex-col">
      <WidgetHeader
        icon={ServerStack01Icon}
        title="k8s-autoupdater"
        status={headerStatus}
        isSettings={showSettings}
        onSettingsClick={() => setShowSettings((s) => !s)}
      />

      {showSettings ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
          <p className="text-muted-foreground">
            This widget reads <span className="font-mono">/opt/k8s-autoupdater/state.db</span>{" "}
            (bind-mounted read-only). No configuration is required.
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
            {data.killSwitch && (
              <div className="rounded border border-red-500/40 bg-red-500/10 p-2">
                <div className="font-semibold text-red-400">KILL SWITCH ACTIVE</div>
                {data.killSwitchReason && (
                  <div className="text-red-300/80 mt-0.5">{data.killSwitchReason}</div>
                )}
              </div>
            )}

            {data.lastCycle && (
              <div>
                <div className="text-muted-foreground mb-1">Last cycle</div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className={cn("font-medium", outcomeStyle(data.lastCycle.outcome))}>
                    {data.lastCycle.outcome ?? "unknown"}
                  </span>
                  <span className="text-muted-foreground">
                    {relativeTime(data.lastCycle.finishedAt ?? data.lastCycle.startedAt)}
                  </span>
                </div>
                {data.lastCycle.tiers.length > 0 && (
                  <div className="mt-1 grid grid-cols-3 gap-1">
                    {data.lastCycle.tiers.map((t) => (
                      <div
                        key={t.tier}
                        className="rounded bg-muted px-1.5 py-0.5 text-[10px]"
                        title={`${t.updated} updated · ${t.deferred} deferred · ${t.rolledBack} rolled back`}
                      >
                        <span className="font-mono uppercase">{t.tier}</span>
                        <span className="ml-1 text-muted-foreground">
                          {t.updated}/{t.deferred}/{t.rolledBack}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {data.lastCycle.durationSec != null && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    duration {data.lastCycle.durationSec}s · circuit {data.lastCycle.circuitBreaker ?? "—"}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">Tracked components</span>
              <span className="font-mono">{data.trackedComponents}</span>
            </div>

            {data.recentlyUpdated.length > 0 && (
              <div>
                <div className="text-muted-foreground mb-1">Recently updated</div>
                <ul className="space-y-0.5">
                  {data.recentlyUpdated.map((c) => (
                    <li
                      key={`${c.namespace}/${c.deployment}/${c.container}`}
                      className="flex items-baseline justify-between gap-2"
                    >
                      <span className="truncate font-mono text-[10px]">
                        {c.namespace}/{c.deployment}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {relativeTime(c.lastUpdatedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.recentlyRolledBack.length > 0 && (
              <div>
                <div className="text-yellow-500/90 mb-1">Recent rollbacks</div>
                <ul className="space-y-0.5">
                  {data.recentlyRolledBack.map((c) => (
                    <li
                      key={`${c.namespace}/${c.deployment}/${c.container}`}
                      className="flex items-baseline justify-between gap-2"
                    >
                      <span className="truncate font-mono text-[10px]">
                        {c.namespace}/{c.deployment}
                      </span>
                      <span className="shrink-0 text-[10px] text-yellow-500/80">
                        {relativeTime(c.lastRollbackAt)}
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
