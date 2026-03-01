---
phase: 03-drag-and-drop-widget-grid
plan: 03
type: execute
wave: 2
depends_on:
  - 03-drag-and-drop-widget-grid/01-PLAN.md
files_modified:
  - components/widget-grid.tsx
  - components/add-widget-dialog.tsx
  - app/board/[id]/page.tsx
autonomous: true

must_haves:
  truths:
    - Dragging a widget to a new position saves the new x/y coordinates to the database
    - Resizing a widget saves the new w/h dimensions to the database
    - Refreshing the page after dragging/resizing shows the widgets in their updated positions and sizes
    - Clicking "Add Widget" opens a dialog where the user can pick a widget type and it appears on the grid
    - Deleting a widget removes it from the grid and the database
  artifacts:
    - components/widget-grid.tsx (updated with persistence and widget removal)
    - components/add-widget-dialog.tsx (dialog for adding widgets to the board)
    - app/board/[id]/page.tsx (updated with add widget button)
  key_links:
    - components/widget-grid.tsx calls PATCH /api/widgets/[id] to persist layout changes
    - components/widget-grid.tsx calls DELETE /api/widgets/[id] to remove widgets
    - components/add-widget-dialog.tsx calls POST /api/widgets to create new widgets
    - app/board/[id]/page.tsx renders the add widget button and passes boardId to the dialog
---

<objective>
Add layout persistence (save widget positions/sizes to the database on drag/resize), an "Add Widget" dialog for placing new widgets, and widget deletion.

Purpose: Without persistence, layout changes are lost on refresh -- this completes the core grid editing loop. Without add/remove, there is no way to populate the grid through the UI.
Output: A fully functional grid editor where layout changes persist, widgets can be added from a dialog and removed via a button, completing all Phase 3 success criteria.
</objective>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/03-drag-and-drop-widget-grid/01-PLAN.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add layout persistence with debounced saving</name>
  <files>
    components/widget-grid.tsx
  </files>
  <action>
  Update the widget grid component to persist layout changes to the database when the user drags or resizes a widget.

  **Debounced save function** -- Create a save mechanism that batches layout changes to avoid hammering the API on every pixel of a drag. Use a ref-based debounce approach:
  - Store a `timeoutRef` using `useRef<NodeJS.Timeout | null>(null)`
  - In the `onLayoutChange` handler, compare the new layout against the current widget positions to find which widgets actually changed (position or size)
  - For each changed widget, queue a PATCH request to `/api/widgets/${widgetId}` with `{ x, y, w, h }`
  - Debounce this by clearing the previous timeout and setting a new one with a 500ms delay
  - Use `Promise.all()` to fire all PATCH requests in parallel when the debounce fires

  **Optimistic local state** -- The grid should already feel responsive during drag because react-grid-layout handles the visual layout internally. The `onLayoutChange` callback fires after the user finishes a drag/resize action (on mouse-up). Store the current layout in state so the grid is controlled and reflects local changes immediately. Only send the API calls in the background.

  **Error handling** -- If a save fails, log a warning to the console. Do not revert the local layout (the user can refresh to get the server state). In a future phase, a toast notification could be added, but for now console warnings are sufficient.

  **Widget deletion** -- Add a delete button to each widget. Place a small X button (or trash icon) in the top-right corner of the widget card, visible on hover. Use `position: absolute` inside the widget wrapper div. On click:
  - Call `DELETE /api/widgets/${widgetId}`
  - On success, remove the widget from local state (filter it out of the widgets array and the layout)
  - Call `router.refresh()` to sync server component data

  Import `useRouter` from `next/navigation` for the refresh call after deletion.

  Critical pattern -- detecting which widgets changed:
  ```typescript
  // Inside onLayoutChange(currentLayout, allLayouts)
  // Use the "lg" breakpoint layout (or whichever matches current)
  const changes = currentLayout.filter((item) => {
    const widget = widgets.find((w) => w.id === item.i);
    if (!widget) return false;
    return widget.x !== item.x || widget.y !== item.y || widget.w !== item.w || widget.h !== item.h;
  });
  ```
  </action>
  <verify>
  - Run `npx tsc --noEmit` -- no type errors
  - Start dev server, add widgets via API if needed
  - Drag a widget to a new position, wait 500ms, then refresh the page -- widget should be in the new position
  - Resize a widget, wait 500ms, then refresh -- widget should have the new size
  - Click the delete button on a widget -- it should disappear from the grid and not reappear on refresh
  - Check browser Network tab: PATCH requests fire ~500ms after drag/resize ends, not during the drag
  - Rapidly drag multiple widgets -- only the final positions should be saved (debounce works)
  </verify>
  <done>
  - Dragging a widget saves its new x/y to the database via PATCH /api/widgets/[id]
  - Resizing a widget saves its new w/h to the database
  - Saves are debounced at 500ms to avoid excessive API calls
  - Widget positions and sizes persist across page reloads
  - Widgets can be deleted via an X button that calls DELETE /api/widgets/[id]
  - Deleted widgets are removed from the grid immediately and do not reappear on refresh
  </done>
</task>

<task type="auto">
  <name>Task 2: Build the "Add Widget" dialog and wire it into the board page</name>
  <files>
    components/add-widget-dialog.tsx
    app/board/[id]/page.tsx
  </files>
  <action>
  **components/add-widget-dialog.tsx** -- Create a "use client" dialog component for adding a new widget to the board.
  - Props: `{ boardId: string; open: boolean; onOpenChange: (open: boolean) => void }`
  - Display a list of available widget types. For now, use a hardcoded list of placeholder types: `["clock", "weather", "app-links", "system-stats", "notes", "rss-feed"]`. These are just labels for Phase 3 -- real widget implementations come in later phases.
  - Render each type as a clickable card/button in a grid layout (2-3 columns). Each card shows the type name and a brief description placeholder.
  - When the user clicks a widget type:
    - POST to `/api/widgets` with `{ boardId, type, x: 0, y: 0, w: 3, h: 2 }` (default size of 3x2, placed at the origin -- react-grid-layout will auto-place it in the next available spot if `y: Infinity` is used, but `y: 0` with compaction enabled also works since RGL pushes overlapping items down)
    - Actually, use `y: Infinity` which tells react-grid-layout to place the widget at the bottom of the grid, avoiding overlap with existing widgets
    - On success, call `router.refresh()` to re-fetch server data and close the dialog
  - Show a loading state while the request is in flight
  - Use the existing shadcn Dialog components for the dialog shell

  **app/board/[id]/page.tsx** -- Add an "Add Widget" button to the board page.
  - The button should appear in the board content area. Two placement options -- choose the one that fits best:
    Option A: A floating action button in the bottom-right corner (position fixed/sticky)
    Option B: A button in the header area next to the breadcrumb

  Use Option A (floating button) for better UX -- it is always accessible regardless of scroll position. Create a small client component wrapper or use a client component that renders the button + dialog together. Since the page is a server component, you need a thin client wrapper:

  Create a `AddWidgetButton` client component inline in the page file or in the dialog file itself. It manages the dialog open state and renders both the trigger button and the AddWidgetDialog. The server component page just renders `<AddWidgetButton boardId={id} />`.

  The floating button should use:
  - `fixed bottom-6 right-6` positioning (or `bottom-6 right-6` with appropriate z-index)
  - A plus icon from @hugeicons/react
  - The primary color scheme: `bg-primary text-primary-foreground hover:bg-primary/90`
  - A circular shape: `rounded-full size-12` with the icon centered
  - `shadow-lg` for elevation
  - `z-20` to float above the grid

  When the board has no widgets, the empty state should also have a call-to-action button that opens the same add widget dialog. Wrap the empty state in a client component or add an onClick that triggers the dialog.
  </action>
  <verify>
  - Run `npx next build` to verify the full application builds
  - Start dev server and navigate to a board
  - Click the floating "+" button -- the add widget dialog should open
  - Click a widget type (e.g., "clock") -- a new widget should appear on the grid
  - The new widget should be saved to the database (refresh the page to confirm it persists)
  - Add multiple widgets -- they should stack vertically without overlapping
  - On an empty board, the empty state should also have a button to add widgets
  - Verify the floating button doesn't overlap with sidebar or header
  </verify>
  <done>
  - An "Add Widget" floating button appears on every board page
  - Clicking it opens a dialog with available widget types
  - Selecting a type creates the widget via POST /api/widgets and it appears on the grid
  - New widgets are placed without overlapping existing widgets
  - The empty board state also provides a way to add the first widget
  - New widgets persist across page reloads
  - The application builds without errors
  </done>
</task>

</tasks>

<verification>
1. `npx next build` completes without errors
2. Drag a widget, refresh the page -- widget is in the new position (persistence works)
3. Resize a widget, refresh -- widget has the new size (persistence works)
4. Click "Add Widget" and select a type -- widget appears on the grid
5. Add multiple widgets -- they arrange without overlap
6. Delete a widget -- it disappears and stays gone after refresh
7. Network tab shows debounced PATCH requests (not one per pixel of drag)
8. Empty board state shows add widget prompt
9. All Phase 3 success criteria are met:
   - Drag widgets onto a grid and they snap
   - Resize widgets by dragging edges/corners
   - Reorder widgets by dragging to new positions
   - Create, rename, and delete multiple boards (from Plan 02)
   - Widget positions and sizes persist across page reloads
</verification>

<success_criteria>
- Widget layout changes (drag and resize) persist to the database with debounced saving
- Users can add new widgets to the grid via an "Add Widget" dialog
- Users can delete widgets from the grid
- All changes survive page reloads
- Combined with Plans 01 and 02, all five Phase 3 success criteria are fully met
- The application builds without TypeScript or build errors
</success_criteria>

<output>
After completion, create `.planning/phases/03-drag-and-drop-widget-grid/03-03-SUMMARY.md`
</output>
