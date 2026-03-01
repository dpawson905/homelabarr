"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignIcon } from "@hugeicons/core-free-icons"
import { AddWidgetDialog } from "@/components/add-widget-dialog"

interface AddWidgetButtonProps {
  boardId: string
}

export function AddWidgetButton({ boardId }: AddWidgetButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-20 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
        aria-label="Add widget"
      >
        <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} className="size-5" />
      </button>
      <AddWidgetDialog boardId={boardId} open={open} onOpenChange={setOpen} />
    </>
  )
}
