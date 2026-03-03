"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import type { IconSvgElement } from "@hugeicons/react"
import { Settings02Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface WidgetHeaderProps {
  icon: IconSvgElement
  title: string
  onSettingsClick?: () => void
  isSettings?: boolean
  settingsTitle?: string
  status?: "success" | "error"
  badge?: React.ReactNode
  rightContent?: React.ReactNode
}

export function WidgetHeader({
  icon,
  title,
  onSettingsClick,
  isSettings = false,
  settingsTitle,
  status,
  badge,
  rightContent,
}: WidgetHeaderProps): React.ReactElement {
  const displayIcon = isSettings ? Settings02Icon : icon
  const displayTitle = isSettings ? (settingsTitle ?? `${title} Settings`) : title

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <HugeiconsIcon
          icon={displayIcon}
          strokeWidth={2}
          className="size-3.5 shrink-0 text-muted-foreground"
        />
        <span className="truncate text-xs font-medium text-foreground">
          {displayTitle}
        </span>
        {!isSettings && status && (
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full animate-pulse",
              status === "error" ? "bg-red-500" : "bg-green-500"
            )}
          />
        )}
        {!isSettings && badge}
      </div>
      {(rightContent || onSettingsClick) && (
        <div className="flex shrink-0 items-center gap-1">
          {!isSettings && rightContent}
          {onSettingsClick && (
            isSettings ? (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onSettingsClick}
                aria-label="Close settings"
              >
                <span className="text-xs">&times;</span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onSettingsClick}
                aria-label={`${title} settings`}
              >
                <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} />
              </Button>
            )
          )}
        </div>
      )}
    </div>
  )
}
