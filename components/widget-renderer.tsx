"use client"

import { WidgetPlaceholder } from "@/components/widget-placeholder"
import { AppLinksWidget } from "@/components/widgets/app-links-widget"
import { SearchWidget } from "@/components/widgets/search-widget"

interface WidgetRendererProps {
  type: string
  widgetId: string
  config?: Record<string, unknown> | null
}

export function WidgetRenderer({ type }: WidgetRendererProps): React.ReactElement {
  switch (type) {
    case "app-links":
      return <AppLinksWidget />
    case "search":
      return <SearchWidget />
    default:
      return <WidgetPlaceholder type={type} />
  }
}
