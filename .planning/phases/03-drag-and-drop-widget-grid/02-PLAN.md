---
phase: 03-drag-and-drop-widget-grid
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - components/app-sidebar.tsx
  - components/board-dialogs.tsx
autonomous: true

must_haves:
  truths:
    - Clicking "Add Board" in the sidebar opens a dialog, and submitting it creates a new board that appears in the sidebar
    - Right-clicking (or using a menu button on) a board in the sidebar shows options to rename or delete it
    - Renaming a board updates its name in the sidebar and breadcrumb immediately
    - Deleting a board removes it from the sidebar and navigates to another board
    - The last remaining board cannot be deleted (API returns an error, UI shows a message)
  artifacts:
    - components/board-dialogs.tsx (create/rename/delete dialog components)
    - components/app-sidebar.tsx (updated with board management interactions)
  key_links:
    - components/app-sidebar.tsx uses board CRUD dialogs from components/board-dialogs.tsx
    - Board operations call /api/boards (POST) and /api/boards/[id] (PATCH, DELETE)
    - After mutations, sidebar uses router.refresh() to re-fetch server component data
---

<objective>
Add full board management to the sidebar: create, rename, and delete boards via dialogs, with navigation between boards.

Purpose: Multi-board support is a Phase 3 success criterion. Users need to create separate dashboards for different purposes and manage them from the sidebar.
Output: A fully interactive sidebar where users can create new boards, rename existing ones, delete boards (with protection against deleting the last one), and navigate between boards by clicking.
</objective>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create board management dialog components</name>
  <files>
    components/board-dialogs.tsx
  </files>
  <action>
  Create a "use client" module containing three dialog components for board management. All dialogs use the existing shadcn/ui Dialog component (already installed at components/ui/dialog.tsx).

  **CreateBoardDialog** -- A dialog triggered by external state (controlled open/onOpenChange pattern).
  - Props: `{ open: boolean; onOpenChange: (open: boolean) => void }`
  - Contains a form with a single text input for the board name
  - On submit: POST to `/api/boards` with `{ name }`. On success, call `router.push(\`/board/${newBoard.id}\`)` then `router.refresh()` to update the server component data, then close the dialog.
  - Show a loading state on the submit button while the request is in flight using React useState
  - Validate that the name is non-empty before submitting

  **RenameBoardDialog** -- A dialog for renaming an existing board.
  - Props: `{ board: { id: string; name: string } | null; open: boolean; onOpenChange: (open: boolean) => void }`
  - Pre-fill the input with the current board name
  - On submit: PATCH to `/api/boards/${board.id}` with `{ name }`. On success, call `router.refresh()` and close.

  **DeleteBoardDialog** -- A confirmation dialog for deleting a board.
  - Props: `{ board: { id: string; name: string } | null; open: boolean; onOpenChange: (open: boolean) => void; boardCount: number }`
  - Show the board name in the confirmation message
  - If `boardCount <= 1`, show a disabled delete button with a message explaining that the last board cannot be deleted
  - On confirm: DELETE to `/api/boards/${board.id}`. On success, call `router.push(\`/board/${fallbackBoardId}\`)` then `router.refresh()` and close. To get the fallback board, fetch `/api/boards` first to find another board to navigate to.
  - Use destructive button styling for the delete action

  All dialogs should import `useRouter` from `next/navigation` for navigation and refresh.

  Use the existing shadcn Dialog components: Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter. Use Button from components/ui/button, Input from components/ui/input, and Label from components/ui/label.
  </action>
  <verify>
  - Run `npx tsc --noEmit` -- no type errors
  - Confirm components/board-dialogs.tsx exports CreateBoardDialog, RenameBoardDialog, DeleteBoardDialog
  - Confirm all dialogs use the controlled open/onOpenChange pattern
  - Confirm CreateBoardDialog POSTs to /api/boards
  - Confirm RenameBoardDialog PATCHes to /api/boards/[id]
  - Confirm DeleteBoardDialog DELETEs from /api/boards/[id] with last-board protection
  </verify>
  <done>
  - Three dialog components exist: CreateBoardDialog, RenameBoardDialog, DeleteBoardDialog
  - Each dialog uses shadcn/ui Dialog with controlled open state
  - Dialogs call the correct API endpoints for board CRUD
  - DeleteBoardDialog prevents deleting the last board
  - All dialogs call router.refresh() after successful mutations
  - TypeScript compiles without errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire board management into the sidebar</name>
  <files>
    components/app-sidebar.tsx
  </files>
  <action>
  Update the sidebar to support board navigation and board management actions.

  **Board navigation** -- Each board's SidebarMenuButton should be wrapped in a Next.js Link (from `next/link`) pointing to `/board/${board.id}`. This enables clicking a board to navigate to it. The `isActive` state already works based on the `activeBoardId` prop.

  **Add Board button** -- The existing SidebarGroupAction with the plus icon should open the CreateBoardDialog. Add state: `const [createDialogOpen, setCreateDialogOpen] = useState(false)`. Wire the SidebarGroupAction's `onClick` to `() => setCreateDialogOpen(true)`. Render `<CreateBoardDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />` at the bottom of the component.

  **Board context menu** -- Add a DropdownMenu (from components/ui/dropdown-menu.tsx) to each board's SidebarMenuItem. Use a SidebarMenuAction as the trigger (the three-dot icon that appears on hover). The dropdown should have two items:
  - "Rename" -- opens the RenameBoardDialog for that board
  - "Delete" -- opens the DeleteBoardDialog for that board (pass `boardCount={boards.length}`)

  Add state for which board is selected for rename/delete:
  ```typescript
  const [renameBoard, setRenameBoard] = useState<Board | null>(null);
  const [deleteBoard, setDeleteBoard] = useState<Board | null>(null);
  ```

  Render the RenameBoardDialog and DeleteBoardDialog once each at the bottom of the component (not inside the map), controlled by the renameBoard/deleteBoard state:
  ```
  <RenameBoardDialog board={renameBoard} open={!!renameBoard} onOpenChange={(open) => !open && setRenameBoard(null)} />
  <DeleteBoardDialog board={deleteBoard} open={!!deleteBoard} onOpenChange={(open) => !open && setDeleteBoard(null)} boardCount={boards.length} />
  ```

  Import the needed icons from @hugeicons/core-free-icons: PencilEdit01Icon (or similar) for rename, Delete02Icon (or similar) for delete, and MoreHorizontalIcon (or similar) for the three-dot menu trigger. Check what icons are available in the hugeicons free set -- if exact names differ, use the closest match. The SidebarMenuAction component from shadcn sidebar already handles the hover-reveal behavior.

  The sidebar is already a "use client" component, so all these interactive features work without additional directives.
  </action>
  <verify>
  - Run `npx next build` to verify the full application builds
  - Start dev server and verify:
    - Clicking a board in the sidebar navigates to /board/{boardId}
    - The active board is highlighted in the sidebar
    - Clicking "Add Board" (plus icon) opens the create dialog
    - Typing a name and submitting creates a new board and navigates to it
    - Hovering over a board shows a three-dot menu
    - Clicking the menu shows Rename and Delete options
    - Rename opens a dialog, submitting updates the board name in the sidebar
    - Delete opens a confirmation, confirming removes the board and navigates away
    - Attempting to delete the last board is prevented
  </verify>
  <done>
  - Clicking a board navigates to /board/{boardId}
  - "Add Board" button opens a create dialog that successfully creates new boards
  - Each board has a context menu with Rename and Delete options
  - Rename dialog updates the board name via API and refreshes the UI
  - Delete dialog removes the board via API with last-board protection
  - All sidebar interactions work without full page reloads (using router.refresh())
  - The application builds without errors
  </done>
</task>

</tasks>

<verification>
1. `npx next build` completes without errors
2. Clicking a board in the sidebar navigates to /board/{boardId} and the URL updates
3. The active board is visually highlighted in the sidebar
4. "Add Board" creates a new board that immediately appears in the sidebar
5. Rename changes the board name in both the sidebar and the header breadcrumb
6. Delete removes the board and navigates to another board
7. The last board cannot be deleted -- the UI prevents it
8. All operations persist across page reloads (database-backed)
</verification>

<success_criteria>
- Users can create, rename, and delete boards from the sidebar
- Board navigation via clicking works with URL-based routing
- The last board is protected from deletion
- All board mutations persist to the database and reflect immediately in the UI
- The application builds without TypeScript or build errors
</success_criteria>

<output>
After completion, create `.planning/phases/03-drag-and-drop-widget-grid/03-02-SUMMARY.md`
</output>
