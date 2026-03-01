"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { PencilEdit01Icon, Delete02Icon } from "@hugeicons/core-free-icons"
import { AppIcon } from "@/components/app-icon"
import type { App } from "@/lib/db/schema"
import type { HealthCheckResult } from "@/lib/health-check"

interface AppCardProps {
  app: App
  onEdit: (app: App) => void
  onDeleted: () => void
  health?: HealthCheckResult
}

function getStatusDotClasses(status?: HealthCheckResult["status"]): string {
  switch (status) {
    case "online":
      return "bg-emerald-500 animate-pulse"
    case "offline":
      return "bg-red-500"
    case "degraded":
      return "bg-amber-500"
    default:
      return "bg-muted-foreground/30"
  }
}

function getStatusTitle(health?: HealthCheckResult): string {
  if (!health) return "Status unknown"
  const label = health.status[0].toUpperCase() + health.status.slice(1)
  return health.latency > 0 ? `${label} - ${health.latency}ms` : label
}

export function AppCard({ app, onEdit, onDeleted, health }: AppCardProps): React.ReactElement {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm(`Delete "${app.name}"?`)) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/apps/${app.id}`, { method: "DELETE" })
      if (!res.ok) {
        console.warn("Failed to delete app:", await res.text())
        return
      }
      onDeleted()
    } catch (error) {
      console.warn("Failed to delete app:", error)
    } finally {
      setDeleting(false)
    }
  }

  function handleEdit(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onEdit(app)
  }

  return (
    <a
      href={app.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group/card relative flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/50"
    >
      <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 transition-opacity group-hover/card:opacity-100">
        <button
          type="button"
          onClick={handleEdit}
          className="flex size-5 items-center justify-center rounded-md bg-muted/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={`Edit ${app.name}`}
        >
          <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={2} className="size-3" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="flex size-5 items-center justify-center rounded-md bg-muted/80 text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
          aria-label={`Delete ${app.name}`}
        >
          <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-3" />
        </button>
      </div>

      <div className="absolute bottom-1.5 right-1.5">
        <span
          className={`block size-2.5 rounded-full ring-1 ring-background ${getStatusDotClasses(health?.status)}`}
          title={getStatusTitle(health)}
        />
      </div>

      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-lg">
        <AppIcon icon={app.icon} appName={app.name} size={20} />
      </div>

      <span className="w-full truncate text-center text-xs font-medium text-foreground">
        {app.name}
      </span>

      {app.description && (
        <span className="w-full truncate text-center text-[0.625rem] text-muted-foreground">
          {app.description}
        </span>
      )}
    </a>
  )
}
