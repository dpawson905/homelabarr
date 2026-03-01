"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { LayoutIcon, PlusSignIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { AddWidgetDialog } from "@/components/add-widget-dialog"

interface BoardEmptyStateProps {
  boardId: string
}

export function BoardEmptyState({ boardId }: BoardEmptyStateProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex max-w-md flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/20 bg-gradient-to-b from-muted/30 to-transparent p-12 text-center">
        <HugeiconsIcon
          icon={LayoutIcon}
          strokeWidth={1.5}
          className="size-14 text-muted-foreground/30"
        />
        <p className="text-lg font-medium text-muted-foreground">
          No widgets yet
        </p>
        <p className="text-sm text-muted-foreground/70">
          Add your first widget to start building your dashboard.
        </p>
        <Button
          onClick={() => setOpen(true)}
          className="mt-2"
          size="lg"
        >
          <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
          Add Widget
        </Button>
      </div>
      <AddWidgetDialog boardId={boardId} open={open} onOpenChange={setOpen} />
    </div>
  )
}
