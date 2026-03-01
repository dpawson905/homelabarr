"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  EyeIcon,
  LogoutIcon,
  PlusSignIcon,
  PencilEdit01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// ─── Types ──────────────────────────────────────────────────────────────────

interface SecretListItem {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

interface SecretDetail {
  id: string
  name: string
  description: string | null
  value: string
}

// ─── Password Change Form ───────────────────────────────────────────────────

function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to change password")
        return
      }

      toast.success("Password changed successfully")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch {
      toast.error("Failed to change password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current Password</Label>
        <Input
          id="currentPassword"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          placeholder="Enter current password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <Input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          placeholder="At least 8 characters"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          placeholder="Repeat new password"
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Changing..." : "Change Password"}
      </Button>
    </form>
  )
}

// ─── Secret Dialog (Add / Edit) ─────────────────────────────────────────────

function SecretDialog({
  open,
  onOpenChange,
  editingId,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingId: string | null
  onSaved: () => void
}) {
  const [name, setName] = useState("")
  const [value, setValue] = useState("")
  const [description, setDescription] = useState("")
  const [showValue, setShowValue] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)

  const isEditing = !!editingId

  // Fetch secret details when editing
  useEffect(() => {
    if (!open) {
      // Reset form when dialog closes
      setName("")
      setValue("")
      setDescription("")
      setShowValue(false)
      return
    }

    if (editingId) {
      setFetching(true)
      fetch(`/api/secrets/${editingId}`)
        .then((res) => res.json())
        .then((data: SecretDetail) => {
          setName(data.name)
          setValue(data.value)
          setDescription(data.description ?? "")
        })
        .catch(() => toast.error("Failed to load secret"))
        .finally(() => setFetching(false))
    }
  }, [open, editingId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const url = isEditing ? `/api/secrets/${editingId}` : "/api/secrets"
      const method = isEditing ? "PUT" : "POST"

      const body: Record<string, string> = { name, value }
      if (description) body.description = description

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to save secret")
        return
      }

      toast.success(isEditing ? "Secret updated" : "Secret created")
      onSaved()
      onOpenChange(false)
    } catch {
      toast.error("Failed to save secret")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Secret" : "Add Secret"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the secret name, value, or description."
              : "Store a new encrypted secret for use in integrations."}
          </DialogDescription>
        </DialogHeader>
        {fetching ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
            Loading...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="secretName">Name</Label>
              <Input
                id="secretName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. SONARR_API_KEY"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secretValue">Value</Label>
              <div className="relative">
                <Input
                  id="secretValue"
                  type={showValue ? "text" : "password"}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  required
                  placeholder="Enter secret value"
                  className="pr-8"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowValue(!showValue)}
                >
                  <HugeiconsIcon icon={EyeIcon} strokeWidth={2} />
                  <span className="sr-only">
                    {showValue ? "Hide" : "Show"} value
                  </span>
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secretDescription">Description (optional)</Label>
              <Textarea
                id="secretDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this secret used for?"
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete Confirmation ────────────────────────────────────────────────────

function DeleteSecretDialog({
  secretName,
  open,
  onOpenChange,
  onConfirm,
}: {
  secretName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Secret</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{secretName}&quot;? This action
            cannot be undone.
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
  )
}

// ─── Secrets Manager Section ────────────────────────────────────────────────

function SecretsManager() {
  const [secrets, setSecrets] = useState<SecretListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<SecretListItem | null>(
    null
  )

  const fetchSecrets = useCallback(async () => {
    try {
      const res = await fetch("/api/secrets")
      const data = await res.json()
      setSecrets(data.secrets ?? [])
    } catch {
      toast.error("Failed to load secrets")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSecrets()
  }, [fetchSecrets])

  function handleEdit(secret: SecretListItem) {
    setEditingId(secret.id)
    setDialogOpen(true)
  }

  function handleAdd() {
    setEditingId(null)
    setDialogOpen(true)
  }

  async function handleDelete() {
    if (!deleteConfirm) return

    try {
      const res = await fetch(`/api/secrets/${deleteConfirm.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to delete secret")
        return
      }

      toast.success("Secret deleted")
      setDeleteConfirm(null)
      fetchSecrets()
    } catch {
      toast.error("Failed to delete secret")
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <CardTitle>Secrets</CardTitle>
          <CardDescription className="mt-1">
            Encrypted secrets for app integrations and API keys.
          </CardDescription>
        </div>
        <Button size="sm" onClick={handleAdd}>
          <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
          Add Secret
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
          Loading secrets...
        </div>
      ) : secrets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground text-sm">
            No secrets stored yet
          </p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            Add your first secret to get started with integrations.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {secrets.map((secret) => (
              <TableRow key={secret.id}>
                <TableCell className="font-medium font-mono">
                  {secret.name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {secret.description || "--"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(secret.createdAt)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleEdit(secret)}
                    >
                      <HugeiconsIcon
                        icon={PencilEdit01Icon}
                        strokeWidth={2}
                      />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setDeleteConfirm(secret)}
                    >
                      <HugeiconsIcon
                        icon={Delete02Icon}
                        strokeWidth={2}
                        className="text-destructive"
                      />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <SecretDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingId={editingId}
        onSaved={fetchSecrets}
      />

      <DeleteSecretDialog
        secretName={deleteConfirm?.name ?? ""}
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        onConfirm={handleDelete}
      />
    </>
  )
}

// ─── Settings Page ──────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" })
      if (res.ok) {
        router.push("/login")
      } else {
        toast.error("Logout failed")
        setLoggingOut(false)
      }
    } catch {
      toast.error("Logout failed")
      setLoggingOut(false)
    }
  }

  return (
    <div className="overflow-y-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Section 1: Security */}
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>
            Manage your password and session.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <PasswordChangeForm />

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Logout</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                End your current session and return to the login screen.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              <HugeiconsIcon icon={LogoutIcon} strokeWidth={2} />
              {loggingOut ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Secrets Manager */}
      <Card>
        <CardContent className="space-y-4 pt-2">
          <SecretsManager />
        </CardContent>
      </Card>
    </div>
  )
}
