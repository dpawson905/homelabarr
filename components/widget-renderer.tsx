"use client"

import { WidgetPlaceholder } from "@/components/widget-placeholder"
import { AppLinksWidget } from "@/components/widgets/app-links-widget"
import { SearchWidget } from "@/components/widgets/search-widget"
import { ClockWidget } from "@/components/widgets/clock-widget"
import { NotesWidget } from "@/components/widgets/notes-widget"
import { WeatherWidget } from "@/components/widgets/weather-widget"
import { CalendarWidget } from "@/components/widgets/calendar-widget"
import { RssWidget } from "@/components/widgets/rss-widget"

interface WidgetRendererProps {
  type: string
  widgetId: string
  config?: Record<string, unknown> | null
}

export function WidgetRenderer({ type, widgetId, config }: WidgetRendererProps): React.ReactElement {
  switch (type) {
    case "app-links":
      return <AppLinksWidget />
    case "search":
      return <SearchWidget />
    case "clock":
      return <ClockWidget widgetId={widgetId} config={config ?? null} />
    case "notes":
      return <NotesWidget widgetId={widgetId} config={config ?? null} />
    case "weather":
      return <WeatherWidget widgetId={widgetId} config={config ?? null} />
    case "calendar":
      return <CalendarWidget widgetId={widgetId} config={config ?? null} />
    case "rss-feed":
      return <RssWidget widgetId={widgetId} config={config ?? null} />
    default:
      return <WidgetPlaceholder type={type} />
  }
}
