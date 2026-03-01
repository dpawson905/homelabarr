---
phase: 01-dashboard-shell-design-system
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/layout.tsx
  - components/theme-toggle.tsx
  - components/app-sidebar.tsx
  - app/page.tsx
autonomous: true

must_haves:
  truths:
    - User can toggle between dark and light mode and the theme persists across page reloads
    - Sidebar shows navigation items for boards and settings
    - Sidebar collapses to a sheet on mobile viewports
    - Dashboard layout has a header with sidebar trigger and theme toggle
    - The main content area fills available space next to the sidebar
  artifacts:
    - components/theme-toggle.tsx (theme toggle dropdown with light/dark/system options)
    - components/app-sidebar.tsx (application sidebar with nav groups)
    - app/layout.tsx (updated with ThemeProvider)
    - app/page.tsx (replaced placeholder with dashboard shell layout)
  key_links:
    - app/layout.tsx imports and wraps children with ThemeProvider from next-themes
    - app/page.tsx imports AppSidebar and ThemeToggle and assembles the dashboard shell
    - components/app-sidebar.tsx uses shadcn sidebar primitives from components/ui/sidebar.tsx
    - components/theme-toggle.tsx uses next-themes useTheme hook
---

<objective>
Build the core dashboard shell: wire up dark mode theming, create the application sidebar with navigation, and assemble the full layout with header, sidebar, and main content area.

Purpose: Establish the foundational layout and theming that every subsequent feature builds on. The user should see a polished, navigable dashboard shell on first load.
Output: A working dashboard with collapsible sidebar, dark/light/system theme toggle, and a clean main content area ready for widgets.
</objective>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md

Key existing files to understand:
- app/layout.tsx: Root layout with JetBrains Mono font, TooltipProvider. Metadata still says "Create Next App". The html tag does NOT have suppressHydrationWarning (needed for next-themes). No ThemeProvider yet.
- app/globals.css: Full oklch color theme with :root (light) and .dark selectors. Teal/cyan primary. Sidebar-specific variables defined. Uses @custom-variant dark (&:is(.dark *)) for Tailwind v4.
- components/ui/sidebar.tsx: Full shadcn sidebar component library (SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset, SidebarRail, SidebarGroup, SidebarGroupLabel, etc.). Uses HugeiconsIcon for the trigger icon. Uses useIsMobile hook. On mobile, renders as a Sheet.
- app/page.tsx: Currently renders a placeholder ComponentExample component.
- hooks/use-mobile.ts: Returns boolean for viewport < 768px.
- The project uses @hugeicons/react and @hugeicons/core-free-icons for icons.
- next-themes is installed (^0.4.6) but NOT wired into layout.
- The dashboard name is "Homelabarr".
</context>

<tasks>

<task type="auto">
  <name>Task 1: Wire up ThemeProvider and build theme toggle component</name>
  <files>
    app/layout.tsx
    components/theme-toggle.tsx
  </files>
  <action>
  **app/layout.tsx changes:**
  - Add `suppressHydrationWarning` to the `<html>` tag (required by next-themes to avoid hydration mismatch)
  - Import `ThemeProvider` from `next-themes`
  - Wrap the existing `<TooltipProvider>{children}</TooltipProvider>` with `<ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>` -- attribute must be "class" because globals.css uses `.dark` class selector, and the Tailwind v4 config uses `@custom-variant dark (&:is(.dark *))`.
  - Update the metadata: title to "Homelabarr" and description to "Self-hosted homelab dashboard"

  **components/theme-toggle.tsx:**
  Create a polished theme toggle dropdown component:
  - "use client" directive at top
  - Import `useTheme` from `next-themes` and `useState`, `useEffect` from React
  - Import Button from `@/components/ui/button`
  - Import DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger from `@/components/ui/dropdown-menu`
  - Import HugeiconsIcon from `@hugeicons/react`
  - Import Sun02Icon, Moon02Icon, ComputerIcon from `@hugeicons/core-free-icons` (use the 02 variants for visual polish -- if they don't exist, fall back to SunIcon, MoonIcon, ComputerIcon)
  - The component renders a ghost variant Button (size "icon") that shows a sun icon in light mode and moon icon in dark mode, with a smooth CSS transition between them (use opacity and rotate transforms triggered by the dark class). The button opens a DropdownMenu.
  - The dropdown contains a RadioGroup with three options: Light (sun icon), Dark (moon icon), System (computer icon). Each is a DropdownMenuRadioItem.
  - Use `useTheme()` to get `theme` and `setTheme`.
  - Handle mounted state with useEffect to avoid hydration mismatch (common next-themes pattern: don't render the icon until mounted).
  - Export as named export `ThemeToggle`.
  </action>
  <verify>
  - Run `npx next build` or `npx tsc --noEmit` to verify no TypeScript errors
  - Confirm app/layout.tsx has ThemeProvider wrapping children with attribute="class"
  - Confirm app/layout.tsx html tag has suppressHydrationWarning
  - Confirm components/theme-toggle.tsx exports ThemeToggle component
  - Confirm metadata title is "Homelabarr"
  </verify>
  <done>
  - ThemeProvider is wired in layout.tsx with attribute="class", defaultTheme="dark", enableSystem
  - html tag has suppressHydrationWarning
  - ThemeToggle component exists and exports correctly
  - TypeScript compiles without errors
  - Metadata shows "Homelabarr" as title
  </done>
</task>

<task type="auto">
  <name>Task 2: Build the application sidebar with navigation</name>
  <files>
    components/app-sidebar.tsx
  </files>
  <action>
  Create the main application sidebar component that will live in the dashboard layout.

  **components/app-sidebar.tsx:**
  - "use client" directive
  - Import sidebar primitives from `@/components/ui/sidebar`: Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarSeparator, SidebarRail
  - Import HugeiconsIcon from `@hugeicons/react`
  - Import relevant icons from `@hugeicons/core-free-icons`: DashboardSquare01Icon (or LayoutIcon) for boards, SettingsIcon for settings, PlusSignIcon for add board, Home01Icon for home/default board. Pick visually clean icons -- if exact names don't exist, use close alternatives.
  - Import Link from `next/link`

  **Sidebar structure (top to bottom):**

  1. **SidebarHeader**: Contains the app branding.
     - A flex row with the Homelabarr logo/name. Use a styled div or span with "Homelabarr" in the primary color (`text-primary`), bold, tracking-tight. Use text-sm or text-base size. Could optionally include a small teal dot or icon as a logo mark. Keep it elegant and minimal.
     - Below the name, a subtle muted text "Homelab Dashboard" in text-xs text-muted-foreground.

  2. **SidebarSeparator**

  3. **SidebarContent** (scrollable middle):
     - **SidebarGroup** with label "Boards":
       - SidebarMenu with SidebarMenuItems:
         - "Default Board" with a home/dashboard icon, marked as `isActive={true}` (this is placeholder -- active state will be dynamic later with routing)
       - A SidebarGroupAction (the + button) in the group header area to "add board" (non-functional for now, just the UI affordance). Use PlusSignIcon.
     - **SidebarGroup** with label "System":
       - SidebarMenu with SidebarMenuItems:
         - "Settings" with SettingsIcon

  4. **SidebarFooter**:
     - A subtle footer area. Could show a version string like "v0.1.0" in text-xs text-muted-foreground, or remain empty for now. Keep it minimal.

  5. **SidebarRail**: Include the SidebarRail component for the drag-to-resize rail.

  - The Sidebar component should use `collapsible="icon"` variant so it collapses to icon-only mode on desktop (not fully hidden). This gives the best UX -- users see icons in collapsed state.
  - Use `variant="sidebar"` (default).
  - Pass `{...props}` through so it accepts React.ComponentProps<typeof Sidebar>.
  - Export as named export `AppSidebar`.

  **Design notes:**
  - Navigation items should use SidebarMenuButton with `asChild` wrapping a Link component for future routing, OR just use SidebarMenuButton directly for now since routing isn't set up. Use direct SidebarMenuButton (no Link) for now, as pages don't exist yet.
  - Each menu button should have a `tooltip` prop matching its label, so tooltips show when sidebar is collapsed to icon mode.
  - Keep the design clean and minimal. The teal/cyan theme will come through via the CSS variables already defined.
  </action>
  <verify>
  - Run `npx tsc --noEmit` to verify no TypeScript errors
  - Confirm components/app-sidebar.tsx exports AppSidebar
  - Confirm it imports and uses sidebar primitives from components/ui/sidebar.tsx
  - Confirm it has nav items for "Default Board" and "Settings" at minimum
  - Confirm sidebar uses collapsible="icon"
  </verify>
  <done>
  - AppSidebar component exists with proper sidebar structure
  - Header shows "Homelabarr" branding
  - Navigation has "Boards" group with "Default Board" item and "System" group with "Settings" item
  - Sidebar uses collapsible="icon" mode
  - Tooltips are configured on menu buttons
  - SidebarRail is included
  - TypeScript compiles without errors
  </done>
</task>

<task type="auto">
  <name>Task 3: Assemble the dashboard layout shell</name>
  <files>
    app/page.tsx
  </files>
  <action>
  Replace the placeholder ComponentExample page with the full dashboard shell layout.

  **app/page.tsx:**
  - Remove the import of ComponentExample
  - Import SidebarProvider, SidebarInset, SidebarTrigger from `@/components/ui/sidebar`
  - Import AppSidebar from `@/components/app-sidebar`
  - Import ThemeToggle from `@/components/theme-toggle`
  - Import Separator from `@/components/ui/separator`
  - Import Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage from `@/components/ui/breadcrumb` (for the header breadcrumb showing current location)

  **Layout structure:**
  ```
  SidebarProvider (defaultOpen={true})
    AppSidebar
    SidebarInset
      header (sticky top-0, with backdrop blur)
        - Left side: SidebarTrigger + Separator (vertical) + Breadcrumb showing "Default Board"
        - Right side: ThemeToggle
      main content area
        - For now, render a clean empty state. Use a centered div with subtle text like "Your widgets will appear here" in text-muted-foreground. This can be a simple placeholder -- the grid system comes in Phase 3. Make it feel intentional, not broken. Could use a dashed border container or a subtle icon.
  ```

  **Header design details:**
  - The header should be a `<header>` element with classes: `flex h-12 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear`
  - Add `sticky top-0 z-10 bg-background/80 backdrop-blur-sm` for the sticky blur effect
  - Left section: flex items-center gap-2 containing SidebarTrigger, a vertical Separator (orientation="vertical", className="mr-2 h-4 data-[orientation=vertical]:h-4"), then the Breadcrumb
  - Right section: ml-auto containing ThemeToggle
  - The breadcrumb should show "Default Board" as a BreadcrumbPage inside BreadcrumbItem inside BreadcrumbList

  **Main content area:**
  - Below the header, a `<div className="flex flex-1 flex-col items-center justify-center p-6">` containing:
    - A dashed-border container: `<div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/25 p-12 text-center">`
    - Inside: a muted icon (could use LayoutIcon from hugeicons, size-10, text-muted-foreground/50), then "No widgets yet" in text-lg font-medium text-muted-foreground, then "Widgets will appear here once you start adding them." in text-sm text-muted-foreground/70
  - This gives a polished empty state that communicates "this is intentionally empty, not broken"

  **Important:** This is NOT a layout.tsx file -- it's page.tsx. The SidebarProvider wraps the entire page content. In a future phase, this structure may move to a layout.tsx with nested routes, but for now keep it in page.tsx since there's only one page.
  </action>
  <verify>
  - Run `npx next build` to verify the full application builds successfully
  - Run `npx tsc --noEmit` for type checking
  - Confirm app/page.tsx no longer imports ComponentExample
  - Confirm app/page.tsx imports and renders AppSidebar, ThemeToggle, SidebarProvider, SidebarInset
  - Confirm the header has SidebarTrigger, breadcrumb, and ThemeToggle
  - Confirm there is an empty state placeholder in the main content area
  </verify>
  <done>
  - Dashboard shell renders with sidebar on the left and main content on the right
  - Header is sticky with backdrop blur, contains sidebar trigger, breadcrumb ("Default Board"), and theme toggle
  - Main content area shows a polished empty state placeholder
  - No references to ComponentExample remain in page.tsx
  - Full application builds without errors
  </done>
</task>

</tasks>

<verification>
1. `npx next build` completes without errors
2. Opening the app in a browser shows the full dashboard shell with sidebar, header, and empty main area
3. Clicking the theme toggle switches between light, dark, and system modes -- the teal/cyan oklch colors apply correctly in both modes
4. The sidebar shows "Homelabarr" branding, "Boards" group with "Default Board", and "System" group with "Settings"
5. Pressing Ctrl+B (or Cmd+B) toggles the sidebar between expanded and icon-only collapsed modes
6. On mobile viewport (< 768px), the sidebar appears as a slide-out sheet when triggered
7. The header breadcrumb shows "Default Board"
8. Theme preference persists across page reloads (next-themes stores in localStorage)
</verification>

<success_criteria>
- The dashboard shell is fully assembled: sidebar + header + main content area
- Dark/light/system theme toggle works and persists
- Sidebar collapses to icon-only on desktop, sheet on mobile
- All navigation items (Default Board, Settings) render with icons and tooltips
- The app builds without TypeScript or build errors
- The layout uses the existing oklch teal/cyan color variables throughout
</success_criteria>

<output>
After completion, create `.planning/phases/01-dashboard-shell-design-system/01-01-SUMMARY.md`
</output>
