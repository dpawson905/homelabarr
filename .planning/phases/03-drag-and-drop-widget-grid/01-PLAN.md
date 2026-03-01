---
phase: 03-drag-and-drop-widget-grid
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - app/page.tsx
  - app/board/[id]/page.tsx
  - app/board/[id]/layout.tsx
  - components/widget-grid.tsx
  - components/widget-placeholder.tsx
  - app/globals.css
autonomous: true

must_haves:
  truths:
    - Navigating to / redirects the browser to /board/{defaultBoardId}
    - The board page at /board/{id} renders a react-grid-layout grid area with the sticky header and sidebar
    - Widgets stored in the database for a board appear as draggable, resizable placeholder cards on the grid
    - Dragging a widget to a new position snaps it to the grid
    - Resizing a widget by dragging its edges snaps to grid increments
  artifacts:
    - app/board/[id]/page.tsx (Server Component that loads board + widgets, passes to grid)
    - app/board/[id]/layout.tsx (shared shell with sidebar, header)
    - components/widget-grid.tsx (Client Component wrapping ResponsiveGridLayout)
    - components/widget-placeholder.tsx (generic placeholder widget card)
  key_links:
    - app/page.tsx redirects to /board/{id} using data from getDefaultBoardId()
    - app/board/[id]/page.tsx imports getBoards, getBoardById, getWidgetsByBoardId from lib/db/queries
    - app/board/[id]/page.tsx passes widget array as props to components/widget-grid.tsx
    - components/widget-grid.tsx renders each widget using components/widget-placeholder.tsx
---

<objective>
Install react-grid-layout, set up board-based URL routing, and build the draggable/resizable widget grid.

Purpose: This is the foundation of Phase 3. Without the grid component and board routing, nothing else (board management, widget persistence) has a surface to attach to.
Output: A working drag-and-drop grid at /board/[id] that renders widget placeholders from the database, with / redirecting to the default board.
</objective>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install react-grid-layout and set up board routing</name>
  <files>
    package.json
    app/page.tsx
    app/board/[id]/layout.tsx
    app/board/[id]/page.tsx
  </files>
  <action>
  Install react-grid-layout and its type definitions:
  `npm install react-grid-layout` and `npm install -D @types/react-grid-layout`

  **app/page.tsx** -- Convert to a redirect. Import `redirect` from `next/navigation` and `getDefaultBoardId` from `@/lib/db/queries`. Call `getDefaultBoardId()` (synchronous, no await). If the result is non-null, call `redirect(\`/board/${defaultBoardId}\`)`. If null (no boards exist at all), render a minimal "No boards found" fallback message. This file no longer renders the sidebar or header.

  **app/board/[id]/layout.tsx** -- Create this as the shared shell for all board pages. This is an async Server Component. It should:
  - Import `getBoards` from `@/lib/db/queries`
  - Call `getBoards()` (synchronous, no await) to get all boards
  - Extract the board `id` from `params` (remember: `{ params: Promise<{ id: string }> }` in Next.js 15+, so `const { id } = await params`)
  - Render the same SidebarProvider > AppSidebar + SidebarInset > header + children structure that currently lives in app/page.tsx
  - Pass `boards` and `activeBoardId={id}` to AppSidebar
  - The header breadcrumb should find the active board name from the boards array and display it
  - Children render below the header in the main content area

  **app/board/[id]/page.tsx** -- Create this as the board page. This is an async Server Component. It should:
  - Extract `id` from `params` (same Promise pattern as layout)
  - Call `getBoardById(id)` to verify the board exists; if not, call `notFound()` from `next/navigation`
  - Call `getWidgetsByBoardId(id)` to get all widgets for this board
  - If no widgets exist, render the same dashed-border empty state that currently exists in app/page.tsx (the "No widgets yet" placeholder)
  - If widgets exist, render `<WidgetGrid widgets={widgets} boardId={id} />` (the client component from Task 2)
  - The page content area should use `min-h-[calc(100svh-3rem)]` to fill the viewport below the header

  Critical pattern for params in Next.js 15+:
  ```typescript
  type PageProps = { params: Promise<{ id: string }> };

  export default async function BoardPage({ params }: PageProps) {
    const { id } = await params;
    // ...
  }
  ```
  </action>
  <verify>
  - Run `npx tsc --noEmit` -- no type errors
  - Confirm react-grid-layout is in package.json dependencies
  - Confirm @types/react-grid-layout is in package.json devDependencies
  - Confirm app/page.tsx calls redirect() and does NOT render sidebar/header
  - Confirm app/board/[id]/layout.tsx renders sidebar + header
  - Confirm app/board/[id]/page.tsx awaits params and loads board/widgets
  </verify>
  <done>
  - react-grid-layout and @types/react-grid-layout are installed
  - Navigating to / redirects to /board/{defaultBoardId}
  - app/board/[id]/layout.tsx renders the sidebar and header shell
  - app/board/[id]/page.tsx loads widgets for the board from the database
  - TypeScript compiles without errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Build the widget grid and placeholder components</name>
  <files>
    components/widget-grid.tsx
    components/widget-placeholder.tsx
    app/globals.css
  </files>
  <action>
  **components/widget-placeholder.tsx** -- Create a simple presentational component that renders a placeholder card for any widget type. It should:
  - Accept props: `{ type: string; id: string }`
  - Render a card with a border, rounded corners, and the widget type name centered inside
  - Use existing design tokens: `bg-card border border-border rounded-lg` with `text-muted-foreground`
  - Show the type name in a small label like "clock", "app-links", etc.
  - Add a subtle icon or emoji-free visual indicator (e.g., a grid icon from @hugeicons/react) to make it feel designed
  - The card must fill its entire grid cell: `h-full w-full`
  - Add a `cursor-grab` class (becomes `cursor-grabbing` while dragging -- react-grid-layout handles this via its CSS classes)

  **components/widget-grid.tsx** -- Create a "use client" component that wraps react-grid-layout's `Responsive` (from `react-grid-layout`) with `WidthProvider`. This is the core grid component.
  - Accept props: `{ widgets: Array<{ id: string; type: string; x: number; y: number; w: number; h: number; [key: string]: unknown }>; boardId: string }`
  - Use `WidthProvider(Responsive)` to create a `ResponsiveGridLayout` component. Important: call `WidthProvider(Responsive)` OUTSIDE the component body or in a module-level const to avoid re-creating the component on every render.
  - Configure the grid with: `cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}`, `rowHeight: 64`, `breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }`
  - Set `draggableHandle=".widget-drag-handle"` so only a specific drag handle area initiates dragging (prevents drag on widget content)
  - Convert the widgets prop into react-grid-layout's `layouts` format. The layout for each widget is: `{ i: widget.id, x: widget.x, y: widget.y, w: widget.w, h: widget.h, minW: 1, minH: 1 }`
  - Build a single layout array and pass it as `layouts={{ lg: layout, md: layout, sm: layout, xs: layout, xxs: layout }}` -- the same layout for all breakpoints, letting react-grid-layout handle responsive reflow
  - Render each widget as a div with `key={widget.id}` containing a `WidgetPlaceholder` component
  - Add a drag handle element inside each widget wrapper div: a small bar or icon area at the top with `className="widget-drag-handle"`. Use a grip/dots icon from @hugeicons/react. Style it as a subtle top bar that appears on hover.
  - Handle `onLayoutChange` callback: store the updated layout in local React state for now. Persistence to the database will be added in Plan 03.
  - Import react-grid-layout's CSS: `import "react-grid-layout/css/styles.css"` and `import "react-resizable/css/styles.css"`

  **app/globals.css** -- Add styles to make react-grid-layout's resize handles and placeholders match the design system. Add these rules:
  - `.react-grid-item.react-grid-placeholder` -- style with `background: oklch(from var(--primary) l c h / 15%)`, `border: 2px dashed var(--primary)`, `border-radius: var(--radius-lg)`, no box-shadow
  - `.react-grid-item > .react-resizable-handle::after` -- style the resize corner handle to use `border-color: var(--muted-foreground)` so it's visible in both themes
  - `.react-grid-item.react-draggable-dragging` -- add `opacity: 0.8` and `box-shadow` using the design system

  Critical pattern -- WidthProvider must be created at module level:
  ```typescript
  import { Responsive, WidthProvider } from "react-grid-layout";
  const ResponsiveGridLayout = WidthProvider(Responsive);
  // Then use <ResponsiveGridLayout> inside the component
  ```
  </action>
  <verify>
  - Run `npx next build` to verify the full application builds
  - Start dev server and navigate to / -- should redirect to /board/{id}
  - The board page should render the grid area (even if empty with no widgets in the database)
  - If there are widgets in the DB (add some via API: `curl -X POST http://localhost:3000/api/widgets -H 'Content-Type: application/json' -d '{"boardId":"<id>","type":"clock","w":3,"h":2}'`), they should appear as draggable placeholder cards
  - Dragging a widget should snap to grid positions
  - Resizing a widget should snap to grid increments
  - The placeholder drop indicator should use the teal/cyan primary color
  - The resize handle should be visible in both light and dark mode
  </verify>
  <done>
  - Widget grid renders react-grid-layout with responsive breakpoints
  - Widgets from the database appear as placeholder cards showing their type name
  - Widgets can be dragged to new positions and they snap to the grid
  - Widgets can be resized by dragging edges/corners
  - Grid placeholder and resize handles match the teal/cyan design system
  - The empty state shows when a board has no widgets
  - The application builds without errors
  </done>
</task>

</tasks>

<verification>
1. `npm install` succeeds and react-grid-layout is in node_modules
2. `npx tsc --noEmit` passes with no type errors
3. `npx next build` completes successfully
4. Navigating to http://localhost:3000/ redirects to /board/{defaultBoardId}
5. The board page shows the sidebar with boards and the correct board name in the header breadcrumb
6. Adding widgets via the API makes them appear as draggable cards on the grid
7. Dragging widgets snaps them to grid positions
8. Resizing widgets works and snaps to grid increments
9. The grid placeholder uses teal/cyan primary color styling
10. Dark mode and light mode both render correctly
</verification>

<success_criteria>
- react-grid-layout is installed and functional
- Board-based URL routing works: / redirects to /board/{id}, /board/{id} renders the grid
- The widget grid renders database widgets as draggable, resizable placeholder cards
- Grid snapping works for both drag and resize
- The sidebar and header display correctly on the board page
- The application builds without TypeScript or build errors
</success_criteria>

<output>
After completion, create `.planning/phases/03-drag-and-drop-widget-grid/03-01-SUMMARY.md`
</output>
