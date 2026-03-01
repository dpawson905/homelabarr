"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { PencilEdit01Icon, Delete02Icon } from "@hugeicons/core-free-icons"
import type { App } from "@/lib/db/schema"

interface AppCardProps {
  app: App
  onEdit: (app: App) => void
  onDeleted: () => void
}

export function AppCard({ app, onEdit, onDeleted }: AppCardProps) {
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

  const hasIcon = app.icon && app.icon.trim().length > 0

  return (
    <a
      href={app.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group/card relative flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/50"
    >
      {/* Action buttons - visible on hover */}
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

      {/* Status indicator dot */}
      <div className="absolute top-1.5 left-1.5">
        <span className="block size-2 rounded-full bg-muted-foreground/30" />
      </div>

      {/* Icon or avatar */}
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-lg">
        {hasIcon ? (
          <span>{app.icon}</span>
        ) : (
          <span className="text-sm font-semibold text-muted-foreground">
            {app.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Name */}
      <span className="w-full truncate text-center text-xs font-medium text-foreground">
        {app.name}
      </span>

      {/* Description */}
      {app.description && (
        <span className="w-full truncate text-center text-[0.625rem] text-muted-foreground">
          {app.description}
        </span>
      )}
    </a>
  )
}
