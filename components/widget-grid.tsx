"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { WidthProvider, Responsive } from "react-grid-layout/legacy"
import type { Layout, LayoutItem, ResponsiveLayouts } from "react-grid-layout/legacy"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"
import { HugeiconsIcon } from "@hugeicons/react"
import { DragDropIcon } from "@hugeicons/core-free-icons"
import { WidgetRenderer } from "@/components/widget-renderer"

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

function buildLayouts(items: Widget[]): ResponsiveLayouts {
  const result: ResponsiveLayouts = {}

  for (const [bp, cols] of Object.entries(COLS)) {
    result[bp] = items.map((widget) => {
      // Clamp width to available columns so widgets don't overflow on smaller screens
      const w = Math.min(widget.w, cols)
      // Clamp x so the widget stays within bounds
      const x = Math.min(widget.x, cols - w)
      return {
        i: widget.id,
        x,
        y: widget.y,
        w,
        h: widget.h,
        minW: 1,
        minH: 1,
      }
    })
  }

  return result
}

export function WidgetGrid({ widgets: initialWidgets }: WidgetGridProps) {
  const router = useRouter()
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets)
  // Keep a ref so handleLayoutChange can read current widgets without
  // being re-created on every state update (which would interrupt drags).
  const widgetsRef = useRef<Widget[]>(initialWidgets)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [layouts, setLayouts] = useState<ResponsiveLayouts>(() => buildLayouts(initialWidgets))

  // Sync when server re-renders with new data (e.g. after adding a widget)
  useEffect(() => {
    setWidgets(initialWidgets)
    widgetsRef.current = initialWidgets
    setLayouts(buildLayouts(initialWidgets))
  }, [initialWidgets])

  // Keep ref in sync with state between server re-renders
  useEffect(() => {
    widgetsRef.current = widgets
  }, [widgets])

  const handleLayoutChange = useCallback(
    (currentLayout: Layout, allLayouts: ResponsiveLayouts) => {
      setLayouts(allLayouts)

      // Read from ref — avoids re-creating this callback on every drag, which
      // would cause RGL to re-register its drag listeners and interrupt drags.
      const changes = currentLayout.filter((item: LayoutItem) => {
        const widget = widgetsRef.current.find((w) => w.id === item.i)
        return widget && (widget.x !== item.x || widget.y !== item.y || widget.w !== item.w || widget.h !== item.h)
      })

      if (changes.length === 0) return

      setWidgets((prev) =>
        prev.map((w) => {
          const changed = changes.find((c: LayoutItem) => c.i === w.id)
          return changed ? { ...w, x: changed.x, y: changed.y, w: changed.w, h: changed.h } : w
        })
      )

      if (timeoutRef.current) clearTimeout(timeoutRef.current)

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
    [] // stable ref — never needs to re-create
  )

  const handleDeleteWidget = useCallback(
    async (widgetId: string) => {
      try {
        const response = await fetch(`/api/widgets/${widgetId}`, { method: "DELETE" })

        if (!response.ok) {
          console.warn("Failed to delete widget:", await response.text())
          return
        }

        setWidgets((prev) => prev.filter((w) => w.id !== widgetId))
        setLayouts((prev) =>
          Object.fromEntries(
            Object.entries(prev)
              .filter(([, layout]) => layout)
              .map(([bp, layout]) => [bp, layout!.filter((item: LayoutItem) => item.i !== widgetId)])
          )
        )
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
      compactType="vertical"
      preventCollision={false}
      className="layout"
    >
      {widgets.map((widget) => (
        <div key={widget.id} className="group relative h-full">
          <div className="widget-drag-handle absolute left-0 right-10 top-0 z-10 flex h-8 cursor-grab items-center justify-center rounded-tl-lg opacity-0 transition-opacity group-hover:opacity-100">
            <HugeiconsIcon
              icon={DragDropIcon}
              strokeWidth={2}
              className="size-4 text-muted-foreground"
            />
          </div>
          <div className="h-full overflow-visible">
            <WidgetRenderer
              type={widget.type}
              widgetId={widget.id}
              config={widget.config as Record<string, unknown> | null}
              onDelete={() => handleDeleteWidget(widget.id)}
            />
          </div>
        </div>
      ))}
    </ResponsiveGridLayout>
  )
}
