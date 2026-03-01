"use client"

import { WidgetPlaceholder } from "@/components/widget-placeholder"
import { AppLinksWidget } from "@/components/widgets/app-links-widget"

interface WidgetRendererProps {
  type: string
  widgetId: string
  config?: Record<string, unknown> | null
}

export function WidgetRenderer({ type, widgetId: _widgetId, config: _config }: WidgetRendererProps) {
  switch (type) {
    case "app-links":
      return <AppLinksWidget />
    default:
      return <WidgetPlaceholder type={type} />
  }
}
