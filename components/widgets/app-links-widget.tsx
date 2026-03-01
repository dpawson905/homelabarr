"use client"

import { useState, useEffect, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignIcon, Link04Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { AppCard } from "@/components/widgets/app-card"
import { AppFormDialog } from "@/components/app-form-dialog"
import type { App } from "@/lib/db/schema"

export function AppLinksWidget() {
  const [apps, setApps] = useState<App[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingApp, setEditingApp] = useState<App | null>(null)

  const fetchApps = useCallback(async () => {
    try {
      const res = await fetch("/api/apps")
      if (!res.ok) {
        console.warn("Failed to fetch apps:", await res.text())
        return
      }
      const data = await res.json()
      setApps(data.apps ?? [])
    } catch (error) {
      console.warn("Failed to fetch apps:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchApps()
  }, [fetchApps])

  function handleAddClick() {
    setEditingApp(null)
    setDialogOpen(true)
  }

  function handleEditClick(app: App) {
    setEditingApp(app)
    setDialogOpen(true)
  }

  function handleSaved() {
    fetchApps()
  }

  function handleDeleted() {
    fetchApps()
  }

  return (
    <div className="flex h-full w-full flex-col rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <HugeiconsIcon
            icon={Link04Icon}
            strokeWidth={2}
            className="size-3.5 text-muted-foreground"
          />
          <span className="text-xs font-medium text-foreground">Apps</span>
        </div>
        <Button variant="ghost" size="icon-xs" onClick={handleAddClick} aria-label="Add app">
          <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-xs text-muted-foreground">Loading...</span>
          </div>
        ) : apps.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-6">
            <HugeiconsIcon
              icon={Link04Icon}
              strokeWidth={1.5}
              className="size-8 text-muted-foreground/30"
            />
            <p className="text-xs text-muted-foreground">No apps yet</p>
            <Button variant="outline" size="sm" onClick={handleAddClick}>
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
              Add your first app
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {apps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                onEdit={handleEditClick}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <AppFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={handleSaved}
        app={editingApp}
      />
    </div>
  )
}
