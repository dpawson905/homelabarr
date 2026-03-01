"use client"

import { useState, useCallback } from "react"
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ReactGridLayoutLib = require("react-grid-layout")
import type ReactGridLayout from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"
import { HugeiconsIcon } from "@hugeicons/react"
import { DragDropIcon } from "@hugeicons/core-free-icons"
import { WidgetPlaceholder } from "@/components/widget-placeholder"

const ResponsiveGridLayout = ReactGridLayoutLib.WidthProvider(
  ReactGridLayoutLib.Responsive
) as React.ComponentType<ReactGridLayout.ResponsiveProps & { className?: string }>

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

export function WidgetGrid({ widgets, boardId }: WidgetGridProps) {
  const initialLayout: ReactGridLayout.Layout[] = widgets.map((widget) => ({
    i: widget.id,
    x: widget.x,
    y: widget.y,
    w: widget.w,
    h: widget.h,
    minW: 1,
    minH: 1,
  }))

  const [layouts, setLayouts] = useState<ReactGridLayout.Layouts>({
    lg: initialLayout,
    md: initialLayout,
    sm: initialLayout,
    xs: initialLayout,
    xxs: initialLayout,
  })

  const handleLayoutChange = useCallback(
    (_currentLayout: ReactGridLayout.Layout[], allLayouts: ReactGridLayout.Layouts) => {
      setLayouts(allLayouts)
    },
    []
  )

  return (
    <ResponsiveGridLayout
      layouts={layouts}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
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
          <WidgetPlaceholder type={widget.type} id={widget.id} />
        </div>
      ))}
    </ResponsiveGridLayout>
  )
}
