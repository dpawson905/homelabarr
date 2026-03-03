"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  EyeIcon,
  LogoutIcon,
  PlusSignIcon,
  PencilEdit01Icon,
  Delete02Icon,
  Download05Icon,
  Upload04Icon,
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

type SecretDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingId: string | null
  onSaved: () => void
}

function SecretDialog({ open, onOpenChange, editingId, onSaved }: SecretDialogProps) {
  const [name, setName] = useState("")
  const [value, setValue] = useState("")
  const [description, setDescription] = useState("")
  const [showValue, setShowValue] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)

  const isEditing = !!editingId

  useEffect(() => {
    if (!open) {
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
                  <span className="sr-only">{showValue ? "Hide" : "Show"} value</span>
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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

type DeleteSecretDialogProps = {
  secretName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

function DeleteSecretDialog({ secretName, open, onOpenChange, onConfirm }: DeleteSecretDialogProps) {
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function SecretsManager() {
  const [secrets, setSecrets] = useState<SecretListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<SecretListItem | null>(null)

  async function fetchSecrets() {
    try {
      const res = await fetch("/api/secrets")
      const data = await res.json()
      setSecrets(data.secrets ?? [])
    } catch {
      toast.error("Failed to load secrets")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSecrets()
  }, [])

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
          <p className="text-muted-foreground text-sm">No secrets stored yet</p>
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
                <TableCell className="font-medium font-mono">{secret.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {secret.description || "--"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(secret.createdAt)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon-xs" onClick={() => handleEdit(secret)}>
                      <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={2} />
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

// ─── Config Export / Import ─────────────────────────────────────────────────

interface ParsedConfig {
  version: number
  boards?: unknown[]
  apps?: unknown[]
  [key: string]: unknown
}

interface ImportResult {
  boardsImported: number
  widgetsImported: number
  appsImported: number
  warnings: string[]
}

interface SelectedFile {
  name: string
  config: ParsedConfig
}

function pluralize(count: number, word: string): string {
  return `${count} ${word}${count !== 1 ? "s" : ""}`
}

function ConfigExportImport() {
  const router = useRouter()
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null)
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch("/api/config/export")
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.error || "Failed to export configuration")
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url

      const disposition = res.headers.get("Content-Disposition")
      const match = disposition?.match(/filename="?([^"]+)"?/)
      a.download = match?.[1] ?? `homelabarr-export-${new Date().toISOString().slice(0, 10)}.json`

      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success("Configuration exported")
    } catch {
      toast.error("Failed to export configuration")
    } finally {
      setExporting(false)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string)
        if (!parsed.version) {
          toast.error("Invalid configuration file: missing version field")
          return
        }
        setSelectedFile({ name: file.name, config: parsed as ParsedConfig })
      } catch {
        toast.error("Invalid JSON file")
      }
    }
    reader.readAsText(file)

    // Reset so re-selecting the same file triggers onChange
    e.target.value = ""
  }

  async function handleImport(mode: "merge" | "replace") {
    if (!selectedFile) return
    setImporting(true)

    try {
      const res = await fetch("/api/config/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: selectedFile.config, mode }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to import configuration")
        return
      }

      const result = data as ImportResult
      toast.success(
        `Imported ${result.boardsImported} boards, ${result.widgetsImported} widgets, ${result.appsImported} apps`
      )

      for (const warning of result.warnings ?? []) {
        toast.warning(warning)
      }

      setSelectedFile(null)
      router.refresh()
    } catch {
      toast.error("Failed to import configuration")
    } finally {
      setImporting(false)
    }
  }

  const boardCount = Array.isArray(selectedFile?.config.boards) ? selectedFile.config.boards.length : 0
  const appCount = Array.isArray(selectedFile?.config.apps) ? selectedFile.config.apps.length : 0

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Export</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Download your dashboard configuration as a JSON file.
            </p>
          </div>
          <Button onClick={handleExport} disabled={exporting}>
            <HugeiconsIcon icon={Download05Icon} strokeWidth={2} />
            {exporting ? "Exporting..." : "Download Export"}
          </Button>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Import</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload a JSON configuration file to restore or merge settings.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            <HugeiconsIcon icon={Upload04Icon} strokeWidth={2} />
            Import Configuration
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {selectedFile && (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {pluralize(boardCount, "board")}, {pluralize(appCount, "app")}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                Cancel
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleImport("merge")} disabled={importing}>
                {importing ? "Importing..." : "Merge"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowReplaceConfirm(true)}
                disabled={importing}
              >
                Replace
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={showReplaceConfirm} onOpenChange={setShowReplaceConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace All Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all existing boards, widgets, and apps. Your password
              and secrets will be preserved. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setShowReplaceConfirm(false)
                handleImport("replace")
              }}
            >
              Replace Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Manage your password and session.</CardDescription>
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
            <Button variant="destructive" onClick={handleLogout} disabled={loggingOut}>
              <HugeiconsIcon icon={LogoutIcon} strokeWidth={2} />
              {loggingOut ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Export or import your dashboard configuration.</CardDescription>
        </CardHeader>
        <CardContent>
          <ConfigExportImport />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-2">
          <SecretsManager />
        </CardContent>
      </Card>
    </div>
  )
}
