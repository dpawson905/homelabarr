---
phase: 02-database-configuration-layer
plan: 02
type: execute
wave: 2
depends_on:
  - 02-database-configuration-layer/01-PLAN.md
files_modified:
  - app/api/boards/route.ts
  - app/api/boards/[id]/route.ts
  - app/api/widgets/route.ts
  - app/api/widgets/[id]/route.ts
  - app/api/settings/route.ts
  - app/api/settings/[key]/route.ts
  - app/api/apps/route.ts
  - app/api/apps/[id]/route.ts
autonomous: true

must_haves:
  truths:
    - API routes exist for CRUD on boards (list, create, get, update, delete)
    - API routes exist for CRUD on widgets (list by board, create, get, update, delete)
    - API routes exist for CRUD on settings (get all, get by key, upsert)
    - API routes exist for CRUD on apps (list, create, get, update, delete)
    - All API routes return proper JSON responses with appropriate HTTP status codes
    - Deleting a board cascades to delete its widgets (via DB foreign key)
  artifacts:
    - app/api/boards/route.ts (GET list, POST create)
    - app/api/boards/[id]/route.ts (GET one, PATCH update, DELETE)
    - app/api/widgets/route.ts (GET list with boardId filter, POST create)
    - app/api/widgets/[id]/route.ts (GET one, PATCH update, DELETE)
    - app/api/settings/route.ts (GET all settings)
    - app/api/settings/[key]/route.ts (GET one, PUT upsert)
    - app/api/apps/route.ts (GET list, POST create)
    - app/api/apps/[id]/route.ts (GET one, PATCH update, DELETE)
  key_links:
    - All route files import `db` from `@/lib/db`
    - All route files import table definitions from `@/lib/db/schema`
    - Widgets route GET filters by boardId query parameter
    - Widget create (POST) validates that boardId references an existing board
---

<objective>
Build Next.js API routes for full CRUD operations on boards, widgets, apps, and settings. These routes form the data access layer that the UI will consume.

Purpose: Provide a complete server-side API so the dashboard can read and write persistent data. The sidebar needs to list boards dynamically, the widget grid needs to load/save widget positions, and settings need to be stored.
Output: Eight route files covering all four resources with proper error handling and JSON responses.
</objective>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/02-database-configuration-layer/01-PLAN.md

After Plan 01 completes, we have:
- lib/db/index.ts: Database connection singleton exporting `db`
- lib/db/schema.ts: Table definitions (boards, widgets, widgetConfigs, apps, settings) with TypeScript types (Board, NewBoard, Widget, NewWidget, etc.)
- Drizzle ORM configured with SQLite, migrations applied, default board seeded
- The database is at data/homelabarr.db with WAL mode

API design principles:
- Use Next.js App Router route handlers (export async function GET/POST/PATCH/PUT/DELETE)
- Return `NextResponse.json()` for all responses
- Use proper HTTP status codes: 200 (ok), 201 (created), 400 (bad request), 404 (not found), 500 (server error)
- Keep route handlers thin -- they validate input, call Drizzle queries, return results
- Use Drizzle's `eq()` for where clauses, `desc()`/`asc()` for ordering
- For PATCH updates, only update fields that are present in the request body
- For widget creation, also create an empty widgetConfigs row so every widget always has a config entry
- The widgets GET route should accept an optional `boardId` query parameter to filter widgets by board
- Settings use a PUT (upsert) pattern since settings are idempotent key-value pairs

Error handling pattern:
- Wrap each handler in try/catch
- Return `{ error: string }` on failure with appropriate status code
- Validate required fields before attempting DB operations
</context>

<tasks>

<task type="auto">
  <name>Task 1: Build board and settings API routes</name>
  <files>
    app/api/boards/route.ts
    app/api/boards/[id]/route.ts
    app/api/settings/route.ts
    app/api/settings/[key]/route.ts
  </files>
  <action>
  Create API routes for boards and settings. These are the two resources the UI needs immediately (sidebar reads boards, app reads settings).

  **app/api/boards/route.ts:**
  - GET: Return all boards ordered by `position` ascending. Response: `{ boards: Board[] }`
  - POST: Create a new board. Required body: `{ name: string }`. Optional: `{ icon?: string, position?: number }`. If position is not provided, set it to the current max position + 1 (query for max position first). Generate a UUID for the id. Return the created board with status 201.

  **app/api/boards/[id]/route.ts:**
  - GET: Return a single board by ID. 404 if not found.
  - PATCH: Update a board. Accept any subset of `{ name, icon, position }`. Only update provided fields. Use Drizzle's `set()` with the partial update object. Update the `updatedAt` timestamp. Return the updated board.
  - DELETE: Delete a board by ID. The cascade foreign key on widgets should auto-delete associated widgets and their configs. Return `{ success: true }` with status 200. Prevent deleting the last remaining board -- check count first and return 400 if only one board exists.

  **app/api/settings/route.ts:**
  - GET: Return all settings as an object `{ settings: { [key]: value } }` (transform the array of rows into a key-value object for easy consumption).

  **app/api/settings/[key]/route.ts:**
  - GET: Return a single setting by key. Response: `{ key, value }`. 404 if not found.
  - PUT: Upsert a setting. Body: `{ value: string }`. If the key exists, update it. If not, insert it. Use Drizzle's `onConflictDoUpdate` for a clean upsert. Return the setting with status 200.

  For the dynamic route parameter in Next.js App Router, the route handler receives the params as a Promise in Next.js 15+. Use this pattern:
  ```typescript
  export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
    // ...
  }
  ```
  </action>
  <verify>
  - Run `npx tsc --noEmit` to verify no TypeScript errors
  - Run `npm run build` (or `npx next build`) to verify route handlers compile correctly
  - Confirm all four route files exist with the correct exports (GET, POST, PATCH, DELETE, PUT as appropriate)
  - Verify the boards route orders by position ascending
  - Verify the settings GET returns a key-value object, not a raw array
  - Verify the delete-board handler prevents deleting the last board
  </verify>
  <done>
  - app/api/boards/route.ts handles GET (list) and POST (create) for boards
  - app/api/boards/[id]/route.ts handles GET (one), PATCH (update), DELETE with last-board protection
  - app/api/settings/route.ts handles GET (all as key-value object)
  - app/api/settings/[key]/route.ts handles GET (one) and PUT (upsert)
  - All routes return proper JSON with correct HTTP status codes
  - TypeScript compiles without errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Build widget and app API routes</name>
  <files>
    app/api/widgets/route.ts
    app/api/widgets/[id]/route.ts
    app/api/apps/route.ts
    app/api/apps/[id]/route.ts
  </files>
  <action>
  Create API routes for widgets and apps. Widgets are the core data model for the dashboard grid; apps are standalone entities referenced by app-bookmark widgets.

  **app/api/widgets/route.ts:**
  - GET: Return widgets, optionally filtered by boardId query parameter. Use `request.nextUrl.searchParams.get("boardId")` to read the filter. If boardId is provided, return only widgets for that board. If not, return all widgets. Include the widget's config in each response by joining with widgetConfigs (use Drizzle's relational query with `with: { config: true }` or a manual join). Order by y ascending, then x ascending (top-to-bottom, left-to-right). Response: `{ widgets: WidgetWithConfig[] }`
  - POST: Create a new widget. Required body: `{ boardId: string, type: string }`. Optional: `{ x, y, w, h, config }`. Validate that boardId references an existing board (query boards table, return 400 if not found). Generate UUID for the widget id. Create the widget row AND a widgetConfigs row in the same operation (use a transaction via `db.transaction()`). If `config` is provided in the body, store it in widgetConfigs.config as a JSON string. Return the created widget with its config, status 201.

  **app/api/widgets/[id]/route.ts:**
  - GET: Return a single widget by ID with its config. 404 if not found.
  - PATCH: Update a widget. Accept any subset of `{ type, x, y, w, h, boardId, config }`. If positional fields (x, y, w, h) or type/boardId are provided, update the widgets table. If `config` is provided, update the widgetConfigs table. Use a transaction if both need updating. Update `updatedAt` timestamps on affected tables. Return the updated widget with config.
  - DELETE: Delete a widget by ID. Cascade will handle widgetConfigs cleanup. Return `{ success: true }`.

  **app/api/apps/route.ts:**
  - GET: Return all apps ordered by name ascending. Response: `{ apps: App[] }`
  - POST: Create a new app. Required body: `{ name: string, url: string }`. Optional: `{ icon, description, statusCheckEnabled, statusCheckInterval }`. Return the created app with status 201.

  **app/api/apps/[id]/route.ts:**
  - GET: Return a single app by ID. 404 if not found.
  - PATCH: Update an app. Accept any subset of updateable fields. Return the updated app.
  - DELETE: Delete an app by ID. Return `{ success: true }`.

  Same params pattern as Task 1 for Next.js 15+ dynamic routes (params is a Promise).

  **Widget config handling note:** The config field is stored as a JSON string in the database but should be parsed to an object in API responses. When receiving config in POST/PATCH, accept it as an object and JSON.stringify it for storage. When returning, JSON.parse it. Handle parse errors gracefully (return the raw string if parsing fails).
  </action>
  <verify>
  - Run `npx tsc --noEmit` to verify no TypeScript errors
  - Run `npx next build` to verify all route handlers compile
  - Confirm all four route files exist with correct exports
  - Verify widgets GET supports boardId query parameter filtering
  - Verify widget POST creates both widget and widgetConfigs rows in a transaction
  - Verify widget PATCH can update both position fields and config in one request
  - Verify config is returned as parsed JSON object, not a string
  - Verify apps routes handle all CRUD operations
  </verify>
  <done>
  - app/api/widgets/route.ts handles GET (list with boardId filter) and POST (create with config in transaction)
  - app/api/widgets/[id]/route.ts handles GET (with config), PATCH (position + config), DELETE
  - app/api/apps/route.ts handles GET (list) and POST (create)
  - app/api/apps/[id]/route.ts handles GET (one), PATCH (update), DELETE
  - Widget configs are stored as JSON strings but returned as parsed objects
  - Widget creation uses a transaction to create both widget and config atomically
  - All routes return proper JSON with correct HTTP status codes
  - TypeScript compiles and the application builds without errors
  </done>
</task>

</tasks>

<verification>
1. `npx next build` completes without errors
2. All eight route files exist under app/api/ with correct HTTP method exports
3. Boards API: GET /api/boards returns the seeded default board; POST creates a new board
4. Boards API: DELETE /api/boards/{id} prevents deleting the last board
5. Widgets API: GET /api/widgets?boardId={id} returns widgets for a specific board
6. Widgets API: POST /api/widgets creates both widget and config rows atomically
7. Settings API: GET /api/settings returns a key-value object; PUT /api/settings/{key} upserts
8. Apps API: Full CRUD works for apps
9. All error cases return appropriate HTTP status codes (400, 404, 500) with error messages
</verification>

<success_criteria>
- Complete CRUD API exists for boards, widgets, apps, and settings
- All routes use proper HTTP methods and status codes
- Widget creation is transactional (widget + config created together)
- Widgets can be filtered by board
- Settings support upsert semantics
- Board deletion is protected (cannot delete last board)
- Config fields are stored as JSON strings but returned as parsed objects
- The application builds without TypeScript or build errors
</success_criteria>

<output>
After completion, create `.planning/phases/02-database-configuration-layer/02-02-SUMMARY.md`
</output>
