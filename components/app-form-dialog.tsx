"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { AppIcon } from "@/components/app-icon"
import { IconPickerDialog } from "@/components/icon-picker-dialog"
import type { App } from "@/lib/db/schema"

interface AppFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  app?: App | null
}

export function AppFormDialog({ open, onOpenChange, onSaved, app }: AppFormDialogProps): React.ReactElement {
  const isEdit = !!app

  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [icon, setIcon] = useState("")
  const [description, setDescription] = useState("")
  const [statusCheckEnabled, setStatusCheckEnabled] = useState(false)
  const [statusCheckInterval, setStatusCheckInterval] = useState(300)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)

  useEffect(() => {
    if (open) {
      if (app) {
        setName(app.name)
        setUrl(app.url)
        setIcon(app.icon ?? "")
        setDescription(app.description ?? "")
        setStatusCheckEnabled(app.statusCheckEnabled === 1)
        setStatusCheckInterval(app.statusCheckInterval)
      } else {
        setName("")
        setUrl("")
        setIcon("")
        setDescription("")
        setStatusCheckEnabled(false)
        setStatusCheckInterval(300)
      }
      setError(null)
    }
  }, [open, app])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmedName = name.trim()
    const trimmedUrl = url.trim()

    if (!trimmedName) {
      setError("Name is required")
      return
    }

    if (!trimmedUrl) {
      setError("URL is required")
      return
    }

    if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
      setError("URL must start with http:// or https://")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const endpoint = isEdit ? `/api/apps/${app.id}` : "/api/apps"
      const method = isEdit ? "PATCH" : "POST"

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          url: trimmedUrl,
          icon: icon.trim() || null,
          description: description.trim() || null,
          statusCheckEnabled: statusCheckEnabled ? 1 : 0,
          statusCheckInterval,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Failed to ${isEdit ? "update" : "create"} app`)
      }

      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEdit ? "update" : "create"} app`)
    } finally {
      setLoading(false)
    }
  }

  function getSubmitLabel(): string {
    if (loading) return isEdit ? "Saving..." : "Creating..."
    return isEdit ? "Save" : "Create"
  }

  const canSubmit = name.trim().length > 0 && url.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit App" : "Add App"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details for this app."
              : "Add a new app bookmark to your dashboard."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-3 py-3">
            <div className="grid gap-1.5">
              <Label htmlFor="app-name">Name</Label>
              <Input
                id="app-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My App"
                autoFocus
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="app-url">URL</Label>
              <Input
                id="app-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Icon (optional)</Label>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted/30">
                  <AppIcon icon={icon || null} appName={name || "App"} size={20} />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIconPickerOpen(true)}
                >
                  {icon ? "Change Icon" : "Choose Icon"}
                </Button>
                {icon && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIcon("")}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="app-description">Description (optional)</Label>
              <Input
                id="app-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A short description"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="app-status-check" className="cursor-pointer">
                Enable Status Check
              </Label>
              <Switch
                id="app-status-check"
                checked={statusCheckEnabled}
                onCheckedChange={setStatusCheckEnabled}
                size="sm"
              />
            </div>

            {statusCheckEnabled && (
              <div className="grid gap-1.5">
                <Label htmlFor="app-check-interval">Check every N seconds</Label>
                <Input
                  id="app-check-interval"
                  type="number"
                  min={30}
                  value={statusCheckInterval}
                  onChange={(e) => setStatusCheckInterval(Number(e.target.value) || 300)}
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !canSubmit}>
              {getSubmitLabel()}
            </Button>
          </DialogFooter>
        </form>

        <IconPickerDialog
          open={iconPickerOpen}
          onOpenChange={setIconPickerOpen}
          onSelect={setIcon}
          currentIcon={icon || null}
        />
      </DialogContent>
    </Dialog>
  )
}
