"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

const WIDGET_TYPES = [
  { type: "app-links", name: "App Links", description: "Quick links to your apps" },
  { type: "search", name: "Search", description: "Search across all your apps" },
  { type: "clock", name: "Clock", description: "Display the current time and date" },
  { type: "weather", name: "Weather", description: "Show local weather conditions" },
  { type: "system-stats", name: "System Stats", description: "Monitor system resources" },
  { type: "notes", name: "Notes", description: "Jot down quick notes" },
  { type: "rss-feed", name: "RSS Feed", description: "Follow your favorite feeds" },
]

const WIDGET_DEFAULT_SIZES: Record<string, { w: number; h: number }> = {
  search: { w: 4, h: 2 },
}

interface AddWidgetDialogProps {
  boardId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddWidgetDialog({ boardId, open, onOpenChange }: AddWidgetDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleAddWidget(type: string) {
    setLoading(true)
    const { w, h } = WIDGET_DEFAULT_SIZES[type] ?? { w: 3, h: 2 }
    try {
      const response = await fetch("/api/widgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId, type, x: 0, y: Infinity, w, h }),
      })

      if (!response.ok) {
        console.warn("Failed to create widget:", await response.text())
        return
      }

      router.refresh()
      onOpenChange(false)
    } catch (error) {
      console.warn("Failed to create widget:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
          <DialogDescription>
            Choose a widget type to add to your board.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {WIDGET_TYPES.map((widget) => (
            <button
              key={widget.type}
              type="button"
              disabled={loading}
              onClick={() => handleAddWidget(widget.type)}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 text-center transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            >
              <span className="text-xs font-medium">{widget.name}</span>
              <span className="text-[0.625rem] text-muted-foreground">
                {widget.description}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
