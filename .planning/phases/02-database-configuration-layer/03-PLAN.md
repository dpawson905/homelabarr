---
phase: 02-database-configuration-layer
plan: 03
type: execute
wave: 3
depends_on:
  - 02-database-configuration-layer/01-PLAN.md
  - 02-database-configuration-layer/02-PLAN.md
files_modified:
  - app/page.tsx
  - components/app-sidebar.tsx
  - lib/db/queries.ts
autonomous: true

must_haves:
  truths:
    - The sidebar dynamically lists boards from the database instead of a hardcoded "Default Board"
    - The header breadcrumb shows the name of the currently active board from the database
    - Dashboard configuration survives server restarts (boards persist in SQLite)
    - The page loads boards via a server-side database query, not a client-side API fetch
  artifacts:
    - lib/db/queries.ts (reusable server-side query functions)
    - components/app-sidebar.tsx (updated to accept dynamic board data)
    - app/page.tsx (updated to query boards and pass to sidebar)
  key_links:
    - lib/db/queries.ts imports `db` from `@/lib/db` and schema from `@/lib/db/schema`
    - app/page.tsx imports query functions from `@/lib/db/queries` (server component, direct DB access)
    - app/page.tsx passes board data to AppSidebar as props
    - components/app-sidebar.tsx renders boards from props instead of hardcoded data
---

<objective>
Wire the database into the existing dashboard UI so the sidebar displays boards dynamically from SQLite and the header shows the active board name. Create a reusable query layer for server-side data access.

Purpose: This is the integration point where the database layer meets the UI. After this plan, the dashboard actually reads from persistent storage, completing the Phase 2 success criteria that "configuration survives server restarts."
Output: A sidebar that renders boards from the database, a header that shows the active board name, and a reusable query module for future use.
</objective>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/02-database-configuration-layer/01-PLAN.md
@.planning/phases/02-database-configuration-layer/02-PLAN.md

After Plans 01 and 02 complete:
- Database is set up with Drizzle ORM, migrations applied, default board seeded
- API routes exist for CRUD on boards, widgets, apps, settings
- lib/db/index.ts exports `db`, lib/db/schema.ts exports tables and types

Current UI state:
- app/page.tsx: Server component (no "use client"). Renders SidebarProvider > AppSidebar + SidebarInset with header and empty state. The breadcrumb shows hardcoded "Default Board".
- components/app-sidebar.tsx: Client component ("use client"). Has hardcoded "Default Board" in a SidebarMenuItem. The "Add Board" button is non-functional.

Integration approach:
- Since app/page.tsx is a Server Component, it can directly import and call database queries -- no need to go through API routes. This is the idiomatic Next.js App Router pattern for initial page loads.
- Create lib/db/queries.ts with reusable query functions (getBoards, getBoardById, etc.) that both Server Components and API routes can share.
- AppSidebar is a client component, so it receives board data as serialized props from the server component parent.
- For now, the "active board" is simply the first board (or the one matching the defaultBoardId setting). Active board selection via routing comes in Phase 3 when we add multi-board navigation. Keep it simple here -- just pass the boards and activeId.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create the server-side query layer</name>
  <files>
    lib/db/queries.ts
  </files>
  <action>
  Create a module of reusable server-side query functions that both Server Components and API routes can use. This reduces code duplication and creates a single source of truth for data access patterns.

  **lib/db/queries.ts:**
  Export the following functions:

  1. `getBoards()`: Return all boards ordered by position ascending. Use `db.query.boards.findMany({ orderBy: (boards, { asc }) => [asc(boards.position)] })` or the equivalent select-based query.

  2. `getBoardById(id: string)`: Return a single board by ID, or null if not found.

  3. `getDefaultBoardId()`: Query the settings table for key "defaultBoardId" and return its value, or return the ID of the first board (by position) as fallback. This handles the case where the setting doesn't exist.

  4. `getWidgetsByBoardId(boardId: string)`: Return all widgets for a given board with their configs, ordered by y then x. Use Drizzle's relational query `with: { config: true }` or a join. Parse the config JSON string into an object for each widget before returning.

  5. `getSettings()`: Return all settings as a `Record<string, string>` (key-value object).

  6. `getApps()`: Return all apps ordered by name ascending.

  All functions should be `async` and use the `db` import from `@/lib/db`. They should NOT be wrapped in try/catch -- let errors propagate to the caller (the route handler or Server Component can handle errors at its level).

  Mark the file with `"use server"` at the top since these functions run on the server and may be used as Server Actions in the future. Actually, do NOT use "use server" -- these are plain utility functions, not Server Actions. Just export them normally. They'll only be imported in server-side code.
  </action>
  <verify>
  - Run `npx tsc --noEmit` to verify no TypeScript errors
  - Confirm lib/db/queries.ts exports getBoards, getBoardById, getDefaultBoardId, getWidgetsByBoardId, getSettings, getApps
  - Confirm functions use Drizzle query API correctly
  - Confirm getWidgetsByBoardId parses config JSON
  </verify>
  <done>
  - lib/db/queries.ts exists with six query functions
  - All functions use Drizzle ORM for database access
  - getDefaultBoardId has a fallback to first board if setting is missing
  - getWidgetsByBoardId parses config JSON strings into objects
  - TypeScript compiles without errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire dynamic boards into sidebar and page</name>
  <files>
    app/page.tsx
    components/app-sidebar.tsx
  </files>
  <action>
  Update the dashboard page to load boards from the database and pass them to the sidebar. Update the sidebar to render dynamic board data instead of hardcoded content.

  **components/app-sidebar.tsx changes:**
  - Add a props interface: `{ boards: { id: string; name: string; icon: string | null; position: number }[]; activeBoardId: string }`
  - Accept these props in the component function signature (alongside the existing `...props` spread for Sidebar component props). Use an intersection type or a wrapper type.
  - Replace the hardcoded "Default Board" SidebarMenuItem with a `.map()` over the boards array. Each board renders a SidebarMenuItem with:
    - SidebarMenuButton with `isActive={board.id === activeBoardId}`
    - The board's name as the label
    - Home01Icon for the first/default board, a generic icon (like DashboardSquare02Icon or GridIcon) for others -- or just use Home01Icon for all boards for now. Keep it simple.
    - `tooltip={board.name}` for collapsed sidebar mode
    - The same active styling that currently exists: `data-[active=true]:bg-primary/10 data-[active=true]:text-primary`
  - Keep everything else the same: the header branding, System group, footer, SidebarRail.
  - The "Add Board" SidebarGroupAction remains non-functional for now -- it will be wired in Phase 3 when we add board management UI.

  **app/page.tsx changes:**
  - Import `getBoards` and `getDefaultBoardId` from `@/lib/db/queries`
  - Make the default export an async Server Component (it already is a server component since it has no "use client")
  - At the top of the function body, call `const boards = await getBoards()` and `const activeBoardId = await getDefaultBoardId()`
  - Find the active board: `const activeBoard = boards.find(b => b.id === activeBoardId) ?? boards[0]`
  - Pass boards and activeBoardId to AppSidebar: `<AppSidebar boards={boards} activeBoardId={activeBoardId} />`
  - Update the breadcrumb to show `activeBoard?.name ?? "Dashboard"` instead of hardcoded "Default Board"
  - Keep all other structure (header, empty state) the same

  **Important:** Since AppSidebar is a "use client" component, the boards data passed as props must be plain serializable objects (no Date objects, no class instances). The Drizzle query returns plain objects with string dates, so this should work naturally. Just make sure not to pass the full Drizzle row type if it contains non-serializable fields -- map to a plain object if needed.
  </action>
  <verify>
  - Run `npx next build` to verify the full application builds
  - Run `npm run db:setup` first to ensure the database has a default board
  - Start the dev server with `npx next dev` and verify:
    - The sidebar shows "Default Board" (loaded from database, not hardcoded)
    - The header breadcrumb shows "Default Board" (loaded from database)
  - Stop the dev server, restart it, and verify the board still appears (data persists)
  - Run `npx tsc --noEmit` for type checking
  - Confirm app/page.tsx imports from `@/lib/db/queries`
  - Confirm components/app-sidebar.tsx accepts boards and activeBoardId props
  - Confirm no hardcoded "Default Board" text remains in either file (it should come from the database)
  </verify>
  <done>
  - The sidebar dynamically renders boards from the SQLite database
  - The header breadcrumb shows the active board name from the database
  - AppSidebar accepts boards and activeBoardId as props
  - app/page.tsx is an async Server Component that queries the database directly
  - No hardcoded board names remain in the UI components
  - Data persists across server restarts (verified by stop/start cycle)
  - The application builds without errors
  </done>
</task>

</tasks>

<verification>
1. `npx next build` completes without errors
2. `npm run db:setup` seeds the database successfully
3. Starting the dev server shows "Default Board" in the sidebar (from database)
4. The header breadcrumb shows "Default Board" (from database)
5. Stopping and restarting the dev server still shows the board (persistence works)
6. `npx tsc --noEmit` passes with no type errors
7. No hardcoded board names exist in app/page.tsx or components/app-sidebar.tsx
8. The sidebar correctly marks the default board as active
</verification>

<success_criteria>
- Dashboard configuration survives server restarts -- the sidebar shows boards from SQLite
- The UI reads from the database via server-side queries, not hardcoded data
- A reusable query layer (lib/db/queries.ts) exists for all common data access patterns
- The sidebar and breadcrumb dynamically reflect database content
- The application builds and runs without errors
- Phase 2 success criteria are met: persistence works, API routes exist, schema supports all needed data, migrations are handled
</success_criteria>

<output>
After completion, create `.planning/phases/02-database-configuration-layer/02-03-SUMMARY.md`
</output>
