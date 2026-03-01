"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { WidthProvider, Responsive } from "react-grid-layout/legacy"
import type { Layout, LayoutItem, ResponsiveLayouts } from "react-grid-layout/legacy"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"
import { HugeiconsIcon } from "@hugeicons/react"
import { DragDropIcon, Cancel01Icon } from "@hugeicons/core-free-icons"
import { WidgetPlaceholder } from "@/components/widget-placeholder"

const ResponsiveGridLayout = WidthProvider(Responsive)

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }
const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }

interface Widget {
  id: string
  type: string
  x: number
  y: number
  w: number
  h: number
  [key: string]: unknown
}

interface WidgetGridProps {
  widgets: Widget[]
  boardId: string
}

export function WidgetGrid({ widgets: initialWidgets, boardId }: WidgetGridProps) {
  const router = useRouter()
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const initialLayout: Layout = widgets.map((widget) => ({
    i: widget.id,
    x: widget.x,
    y: widget.y,
    w: widget.w,
    h: widget.h,
    minW: 1,
    minH: 1,
  }))

  const [layouts, setLayouts] = useState<ResponsiveLayouts>({
    lg: initialLayout,
    md: initialLayout,
    sm: initialLayout,
    xs: initialLayout,
    xxs: initialLayout,
  })

  const saveLayoutChanges = useCallback(
    (currentLayout: Layout) => {
      const changes = currentLayout.filter((item: LayoutItem) => {
        const widget = widgets.find((w) => w.id === item.i)
        if (!widget) return false
        return (
          widget.x !== item.x ||
          widget.y !== item.y ||
          widget.w !== item.w ||
          widget.h !== item.h
        )
      })

      if (changes.length === 0) return

      // Update local widget state optimistically
      setWidgets((prev) =>
        prev.map((w) => {
          const changed = changes.find((c: LayoutItem) => c.i === w.id)
          if (!changed) return w
          return { ...w, x: changed.x, y: changed.y, w: changed.w, h: changed.h }
        })
      )

      // Debounced save to API
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        Promise.all(
          changes.map((item: LayoutItem) =>
            fetch(`/api/widgets/${item.i}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ x: item.x, y: item.y, w: item.w, h: item.h }),
            })
          )
        ).catch((error) => {
          console.warn("Failed to save layout changes:", error)
        })
      }, 500)
    },
    [widgets]
  )

  const handleLayoutChange = useCallback(
    (currentLayout: Layout, allLayouts: ResponsiveLayouts) => {
      setLayouts(allLayouts)
      saveLayoutChanges(currentLayout)
    },
    [saveLayoutChanges]
  )

  const handleDeleteWidget = useCallback(
    async (widgetId: string) => {
      try {
        const response = await fetch(`/api/widgets/${widgetId}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          console.warn("Failed to delete widget:", await response.text())
          return
        }

        // Remove from local state
        setWidgets((prev) => prev.filter((w) => w.id !== widgetId))
        setLayouts((prev) => {
          const updated: ResponsiveLayouts = {}
          for (const [bp, layout] of Object.entries(prev)) {
            if (layout) {
              updated[bp] = layout.filter((item: LayoutItem) => item.i !== widgetId)
            }
          }
          return updated
        })

        router.refresh()
      } catch (error) {
        console.warn("Failed to delete widget:", error)
      }
    },
    [router]
  )

  return (
    <ResponsiveGridLayout
      layouts={layouts}
      breakpoints={BREAKPOINTS}
      cols={COLS}
      rowHeight={64}
      draggableHandle=".widget-drag-handle"
      onLayoutChange={handleLayoutChange}
      className="layout"
    >
      {widgets.map((widget) => (
        <div key={widget.id} className="group relative">
          <div className="widget-drag-handle absolute inset-x-0 top-0 z-10 flex h-6 cursor-grab items-center justify-center rounded-t-lg opacity-0 transition-opacity group-hover:opacity-100">
            <HugeiconsIcon
              icon={DragDropIcon}
              strokeWidth={2}
              className="size-4 text-muted-foreground"
            />
          </div>
          <button
            type="button"
            onClick={() => handleDeleteWidget(widget.id)}
            className="absolute top-1 right-1 z-10 flex size-5 items-center justify-center rounded-full bg-destructive/10 text-destructive opacity-0 transition-opacity hover:bg-destructive/20 group-hover:opacity-100"
            aria-label="Delete widget"
          >
            <HugeiconsIcon
              icon={Cancel01Icon}
              strokeWidth={2}
              className="size-3"
            />
          </button>
          <WidgetPlaceholder type={widget.type} />
        </div>
      ))}
    </ResponsiveGridLayout>
  )
}
