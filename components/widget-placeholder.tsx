import { HugeiconsIcon } from "@hugeicons/react"
import { GridViewIcon } from "@hugeicons/core-free-icons"

interface WidgetPlaceholderProps {
  type: string
}

export function WidgetPlaceholder({ type }: WidgetPlaceholderProps) {
  return (
    <div className="flex h-full w-full cursor-grab flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card p-4">
      <HugeiconsIcon
        icon={GridViewIcon}
        strokeWidth={1.5}
        className="size-6 text-muted-foreground/40"
      />
      <span className="text-xs font-medium text-muted-foreground">
        {type}
      </span>
    </div>
  )
}
