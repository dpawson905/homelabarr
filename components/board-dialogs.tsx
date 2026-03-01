"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// ─── CreateBoardDialog ──────────────────────────────────────────────────────

interface CreateBoardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateBoardDialog({ open, onOpenChange }: CreateBoardDialogProps) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setName("")
      setError(null)
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmed = name.trim()
    if (!trimmed) {
      setError("Board name cannot be empty")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create board")
      }

      const newBoard = await res.json()
      router.push(`/board/${newBoard.id}`)
      router.refresh()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create board")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Board</DialogTitle>
          <DialogDescription>
            Add a new board to organize your dashboard.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-3 py-3">
            <div className="grid gap-1.5">
              <Label htmlFor="create-board-name">Name</Label>
              <Input
                id="create-board-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Board"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-destructive text-xs">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── RenameBoardDialog ──────────────────────────────────────────────────────

interface RenameBoardDialogProps {
  board: { id: string; name: string } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RenameBoardDialog({ board, open, onOpenChange }: RenameBoardDialogProps) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-fill the input with the current board name when dialog opens
  useEffect(() => {
    if (open && board) {
      setName(board.name)
      setError(null)
    }
  }, [open, board])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!board) return

    const trimmed = name.trim()
    if (!trimmed) {
      setError("Board name cannot be empty")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/boards/${board.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to rename board")
      }

      router.refresh()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename board")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Board</DialogTitle>
          <DialogDescription>
            Enter a new name for this board.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-3 py-3">
            <div className="grid gap-1.5">
              <Label htmlFor="rename-board-name">Name</Label>
              <Input
                id="rename-board-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Board name"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-destructive text-xs">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── DeleteBoardDialog ──────────────────────────────────────────────────────

interface DeleteBoardDialogProps {
  board: { id: string; name: string } | null
  open: boolean
  onOpenChange: (open: boolean) => void
  boardCount: number
}

export function DeleteBoardDialog({ board, open, onOpenChange, boardCount }: DeleteBoardDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset error state when dialog opens
  useEffect(() => {
    if (open) {
      setError(null)
    }
  }, [open])

  const isLastBoard = boardCount <= 1

  async function handleDelete() {
    if (!board || isLastBoard) return

    setLoading(true)
    setError(null)

    try {
      // Fetch the list of boards to find a fallback before deleting
      const boardsRes = await fetch("/api/boards")
      if (!boardsRes.ok) {
        throw new Error("Failed to fetch boards")
      }
      const { boards } = await boardsRes.json() as { boards: { id: string; name: string }[] }
      const fallback = boards.find((b) => b.id !== board.id)

      const res = await fetch(`/api/boards/${board.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete board")
      }

      if (fallback) {
        router.push(`/board/${fallback.id}`)
      }
      router.refresh()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete board")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Board</DialogTitle>
          <DialogDescription>
            {isLastBoard
              ? "You cannot delete the last remaining board."
              : (
                  <>
                    Are you sure you want to delete{" "}
                    <span className="font-medium text-foreground">{board?.name}</span>?
                    This action cannot be undone.
                  </>
                )}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p className="text-destructive text-xs">{error}</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || isLastBoard}
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
