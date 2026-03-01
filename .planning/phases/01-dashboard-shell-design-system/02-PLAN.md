---
phase: 01-dashboard-shell-design-system
plan: 02
type: execute
wave: 2
depends_on:
  - 01-dashboard-shell-design-system/01-PLAN.md
files_modified:
  - app/page.tsx
  - app/globals.css
  - components/app-sidebar.tsx
autonomous: true

must_haves:
  truths:
    - The layout looks polished and native on desktop (1080p+), tablet (768px-1024px), and mobile (< 768px) viewports
    - The design system (typography, spacing, transitions) feels consistent and intentional
    - Visual polish details like hover states, transitions, and focus rings are present
    - The sidebar header branding has a distinctive visual identity
  artifacts:
    - app/page.tsx (responsive refinements and polish)
    - app/globals.css (any additional base styles for typography and scrollbar polish)
    - components/app-sidebar.tsx (visual refinements and hover/active state polish)
  key_links:
    - app/page.tsx uses the dashboard shell structure from Plan 01
    - app/globals.css provides base styles consumed by all components
    - components/app-sidebar.tsx refines the sidebar created in Plan 01
---

<objective>
Polish the dashboard shell for visual refinement across all viewports. Add smooth transitions, refined typography, subtle visual details, and ensure the layout feels intentional and polished at every breakpoint.

Purpose: The dashboard must look and feel like a premium native application, not a dev prototype. This plan transforms the functional shell from Plan 01 into a visually polished product.
Output: A refined dashboard that looks great on desktop, tablet, and mobile with consistent design language.
</objective>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/01-dashboard-shell-design-system/01-PLAN.md

After Plan 01 completes, we have:
- app/layout.tsx: ThemeProvider wired, metadata updated to "Homelabarr"
- components/theme-toggle.tsx: Working theme toggle with light/dark/system
- components/app-sidebar.tsx: Sidebar with Homelabarr branding, Boards group (Default Board), System group (Settings), collapsible="icon", SidebarRail
- app/page.tsx: Dashboard shell with SidebarProvider, AppSidebar, sticky header (SidebarTrigger + Breadcrumb + ThemeToggle), empty state placeholder

Existing design system:
- Colors: oklch teal/cyan primary, full dark mode palette in globals.css
- Font: JetBrains Mono as --font-sans
- Components: Full shadcn/ui library with consistent styling
- Icons: HugeiconsIcon with core-free-icons
- Radius: 0.625rem base radius with sm/md/lg/xl variants

The priority is VISUAL POLISH. Every detail matters.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Refine global styles and typography foundation</name>
  <files>
    app/globals.css
  </files>
  <action>
  Add polish-oriented global styles to globals.css. These should enhance the base design system without conflicting with existing shadcn/ui component styles.

  **Add to the @layer base block (alongside existing * and body rules):**

  1. **Scrollbar styling** (for webkit browsers and Firefox):
     - Custom scrollbar that matches the theme. In light mode, use a subtle gray track with a slightly darker thumb. In dark mode, use dark track with a lighter thumb. Both should use the muted/border color variables.
     - Scrollbar width should be "thin" (Firefox) or ~6px (webkit).
     - Scrollbar thumb should have a rounded shape.
     - Example approach:
       ```
       * {
         scrollbar-width: thin;
         scrollbar-color: var(--muted-foreground) transparent;
       }
       *::-webkit-scrollbar { width: 6px; height: 6px; }
       *::-webkit-scrollbar-track { background: transparent; }
       *::-webkit-scrollbar-thumb { background: oklch(from var(--muted-foreground) l c h / 0.3); border-radius: 3px; }
       *::-webkit-scrollbar-thumb:hover { background: oklch(from var(--muted-foreground) l c h / 0.5); }
       ```
     - Merge this into the existing `*` rule or add as separate rules in @layer base.

  2. **Selection styling**:
     - `::selection` with `background: oklch(from var(--primary) l c h / 0.2)` and `color: var(--foreground)` -- gives a teal-tinted text selection.

  3. **Smooth focus transitions**:
     - Add a subtle transition to all focusable elements: `*:focus-visible { transition: box-shadow 0.15s ease; }`

  4. **No-scrollbar utility** -- the shadcn sidebar already uses `no-scrollbar` class. Verify it exists in the CSS or add it:
     ```
     .no-scrollbar::-webkit-scrollbar { display: none; }
     .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
     ```

  **Important:** Do NOT modify the existing :root or .dark CSS variable blocks. Do NOT modify the @theme inline block. Only add new rules in @layer base or as standalone utility classes.
  </action>
  <verify>
  - Run `npx next build` to verify no CSS compilation errors
  - Confirm globals.css still has all existing :root and .dark variables unchanged
  - Confirm new scrollbar, selection, and focus rules exist in @layer base
  - Confirm the no-scrollbar utility class is defined
  </verify>
  <done>
  - Custom scrollbar styling matches the theme in both light and dark modes
  - Text selection uses a teal-tinted highlight
  - Focus transitions are smooth
  - no-scrollbar utility is available
  - No existing CSS variables or theme blocks were modified
  </done>
</task>

<task type="auto">
  <name>Task 2: Polish the sidebar and dashboard shell visuals</name>
  <files>
    components/app-sidebar.tsx
    app/page.tsx
  </files>
  <action>
  Refine the sidebar and page layout for visual polish. The goal is to make every element feel intentional, with proper spacing, hover states, and visual hierarchy.

  **components/app-sidebar.tsx refinements:**

  1. **Branding in SidebarHeader**:
     - The "Homelabarr" text should have a small visual accent -- consider adding a tiny colored dot (w-2 h-2 rounded-full bg-primary) or a small teal bar before the name to give it brand identity. The dot could subtly pulse with an animation (animate-pulse but very slow, like a server heartbeat indicator). Use `animate-pulse` with a custom slower timing if desired, or just a static accent.
     - Ensure the header has enough vertical padding to breathe (p-4 for the header, not the default p-2).
     - When sidebar is in collapsed (icon) mode, the header should show just the dot/accent as the logo mark, hiding the text. Use `group-data-[collapsible=icon]:...` classes to handle this.

  2. **Menu button refinements**:
     - Ensure each SidebarMenuButton has clean hover transitions. The shadcn defaults are good, but verify they work with the teal/cyan palette.
     - The active state ("Default Board" with isActive) should have a visible accent -- either a left border indicator or a subtle primary-tinted background. Check if `data-active:bg-sidebar-accent` already provides this through the CSS variables. If the active state is too subtle, add `data-active:bg-primary/10 data-active:text-primary` or similar to make the active nav item clearly distinguishable.
     - Icons in menu buttons should use a slightly muted color by default (`text-muted-foreground`) and become full color on hover and when active. Apply this via className on the HugeiconsIcon wrapper or the SidebarMenuButton.

  3. **Group labels**:
     - Ensure "Boards" and "System" group labels use uppercase tracking-widest text-[0.65rem] font-semibold for a clean section divider feel. The shadcn SidebarGroupLabel may already handle this -- if so, just verify. If not, add appropriate className overrides.

  4. **Footer polish**:
     - If there's a version string in the footer, style it with text-[0.6rem] text-muted-foreground/50 to be very subtle.

  **app/page.tsx refinements:**

  1. **Header polish**:
     - Ensure the header border-b uses `border-sidebar-border` or `border-border` consistently.
     - The backdrop blur should be `backdrop-blur-md` (medium) for a nicer glass effect, with `bg-background/80` for the translucent background.
     - Add a subtle transition to the header: `transition-[width,height] ease-linear group-has-data-[variant=sidebar]:h-12` to respect sidebar variant changes.
     - The SidebarTrigger should have `text-muted-foreground hover:text-foreground` for a subtle-to-prominent interaction pattern.

  2. **Empty state refinement**:
     - The empty state should feel premium. Refine the dashed border container:
       - Use `border-muted-foreground/20` (slightly more subtle than /25)
       - Add a subtle gradient background: `bg-gradient-to-b from-muted/30 to-transparent` or similar
       - The icon should be large but very subtle (text-muted-foreground/30, size-12 or size-16)
       - "No widgets yet" heading: text-base font-medium text-muted-foreground
       - Subtext: text-sm text-muted-foreground/60
       - Add a "Get started" hint below: text-xs text-muted-foreground/40 saying something like "Drag and drop widgets to build your dashboard" (aspirational -- matches Phase 3)
     - The empty state container should have a max-width (max-w-md) so it doesn't stretch too wide on desktop.

  3. **Main content area**:
     - The main content wrapper should have `min-h-[calc(100svh-3rem)]` (subtracting header height) to ensure the empty state is vertically centered in the visible area, not the full scroll height.
     - Add `overflow-auto` to the main content area for future scrollability.

  **Responsive verification points (not code changes, but things the executor should check):**
  - At 1920px wide: sidebar expanded, header and content well-proportioned, empty state centered
  - At 1024px wide: sidebar still expanded by default, everything proportional
  - At 768px wide (tablet): sidebar collapsed by default or still accessible, layout still clean
  - At 375px wide (mobile): sidebar hidden, only accessible via trigger, header compact, empty state fills nicely
  - Theme toggle functional in all viewports
  - Sidebar toggle (Ctrl/Cmd+B) works at all viewports
  </action>
  <verify>
  - Run `npx next build` to verify the full application builds
  - Visually inspect (or describe the expected rendering of) the sidebar at both expanded and collapsed states
  - Confirm the branding has a visual accent (dot or bar)
  - Confirm the empty state has gradient/polish elements described above
  - Confirm the header uses backdrop-blur-md
  - Confirm active nav item has visible differentiation from inactive items
  </verify>
  <done>
  - Sidebar header shows "Homelabarr" with a distinctive visual accent that works in both expanded and collapsed modes
  - Active navigation item is clearly distinguishable from inactive items
  - Group labels have a clean uppercase section-divider style
  - Header has a polished glass/blur effect
  - Empty state looks premium with subtle gradient, large muted icon, and layered text hierarchy
  - The layout renders cleanly at desktop (1080p+), tablet (~768px), and mobile (~375px) viewports
  - All hover states and transitions feel smooth and intentional
  - Application builds without errors
  </done>
</task>

</tasks>

<verification>
1. `npx next build` completes without errors
2. The dashboard shell looks visually polished at 1920px, 1024px, 768px, and 375px viewport widths
3. Custom scrollbars render in both light and dark modes
4. Text selection has a teal tint
5. The sidebar branding has a visual accent (dot/bar) that adapts to collapsed state
6. The active navigation item stands out clearly
7. The empty state feels intentional and premium, not like a broken page
8. The header glass effect (backdrop blur + translucent background) is visible when content scrolls behind it
9. All transitions (sidebar collapse, theme switch, hover states) are smooth
</verification>

<success_criteria>
- The dashboard looks and feels like a polished, native application at every viewport size
- Design details (scrollbars, selection color, hover states, transitions) are consistent with the teal/cyan theme
- The empty state communicates "ready for content" not "something is broken"
- The sidebar branding gives Homelabarr a recognizable visual identity
- The application builds without errors
</success_criteria>

<output>
After completion, create `.planning/phases/01-dashboard-shell-design-system/01-02-SUMMARY.md`
</output>
