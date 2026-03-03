"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"

interface DeleteWidgetButtonProps {
  onConfirm: () => void
}

export function DeleteWidgetButton({ onConfirm }: DeleteWidgetButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setOpen(true)}
        className="w-full"
        size="sm"
      >
        Delete Widget
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Widget?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the widget and its configuration from the board.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
