# Plan 05-04: Settings Page — Summary

## Completed Tasks

### Task 1: Password Change API and Settings Page Layout
**Files created:**
- `app/api/auth/password/route.ts`
- `app/settings/layout.tsx`

**Files modified:**
- `app/layout.tsx`
- `components/app-sidebar.tsx`

**Password change API details:**
- **PUT /api/auth/password** — Accepts `{ currentPassword, newPassword, confirmPassword }`. Requires authenticated session via `getSessionFromCookies()` (401 if null). Fetches current hash from settings table, verifies with `verifyPassword()`. Validates new password is at least 8 characters and matches confirmation. Hashes new password with `hashPassword()` and updates the settings table. Returns `{ success: true }` on success.

**Settings layout details:**
- Server component following the same pattern as `app/board/[id]/layout.tsx`
- Wraps children in `SidebarProvider` + `AppSidebar` + `SidebarInset` shell
- Passes `activeBoardId=""` (no board is active on the settings page)
- Breadcrumb displays "Settings"
- Includes theme toggle in header

**Sidebar update:**
- Changed the Settings `SidebarMenuButton` to use `asChild` pattern with a `next/link` `<Link>` to `/settings`

**Root layout update:**
- Added `<Toaster />` from `@/components/ui/sonner` inside ThemeProvider alongside children for toast notifications app-wide

### Task 2: Settings Page with Security and Secrets Sections
**Files created:**
- `app/settings/page.tsx`

**Page structure:**
Client component (`"use client"`) with scrollable container, heading "Settings", and two Card sections.

**Section 1: Security**
- **Password change form**: Three password inputs (current, new, confirm) with submit button. Calls `PUT /api/auth/password`, shows success/error toast via sonner, clears form on success.
- **Logout button**: Destructive variant button calling `POST /api/auth/logout`. On success, redirects to `/login` via `router.push()`.

**Section 2: Secrets Manager**
- **Secrets list**: Table fetched from `GET /api/secrets` on mount, showing name (monospace), description, created date, and action buttons (edit/delete). Values are never displayed in the list.
- **Empty state**: "No secrets stored yet" message with helper text when no secrets exist.
- **Add Secret dialog**: Name input (required), value input (password type with show/hide eye toggle), optional description textarea. Saves via `POST /api/secrets`, refreshes list, shows toast.
- **Edit Secret dialog**: Same form pre-populated with data from `GET /api/secrets/:id` (fetches decrypted value on open). Saves via `PUT /api/secrets/:id`.
- **Delete confirmation**: AlertDialog asking for confirmation before calling `DELETE /api/secrets/:id`. Shows toast and refreshes list on success.

**State management:**
- `secrets` array, `loading` flag, `dialogOpen` boolean, `editingId` (null for add, string for edit), `deleteConfirm` (SecretListItem or null)

## Verification
- `npx tsc --noEmit` passes with zero errors for both tasks
- Settings layout renders sidebar with "Settings" breadcrumb
- Settings sidebar link navigates to `/settings`
- Password change API validates all fields and updates hash
- Settings page renders both Security and Secrets Manager sections
- Full CRUD operations work for secrets

## Architecture Notes
- The Toaster is placed in root layout to support toasts from any page in the app
- Secrets manager fetches decrypted values only when editing (never in list view) for security
- The password change API requires session authentication, preventing unauthorized changes
- Logout route was already built in Plan 05-03; this plan consumes it
- All UI uses existing shadcn/ui components (Card, Dialog, AlertDialog, Table, Button, Input, Label, Textarea, Separator)
- Icons use @hugeicons/react + @hugeicons/core-free-icons (EyeIcon, LogoutIcon, PlusSignIcon, PencilEdit01Icon, Delete02Icon)
