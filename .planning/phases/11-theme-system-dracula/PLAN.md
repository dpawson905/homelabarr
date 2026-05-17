# Phase 11: Theme System Foundation + Dracula — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend homelabarr from 2 themes (light/dark) to 6 (+ dracula, lcars-stub, tron-legacy-stub, tron-classic-stub), ship Dracula as the new default with full color palette + component overrides + Fira Code mono font + 6-item theme switcher with palette swatches.

**Architecture:** Per-theme CSS files under `app/themes/`, registered via a single `lib/themes.ts` source-of-truth; ThemeProvider + theme toggle consume the registry. Each theme is a CSS-variable-set override; no shadcn component refactoring needed because they already consume `var(--*)`. Stub themes (lcars/tron-legacy/tron-classic) ship as empty CSS class shells for selection-flow testing; full content lands in Phases 12-14.

**Tech Stack:**
- Next.js 15 (App Router) + React 19
- Tailwind CSS v4 with `@theme inline` + `@custom-variant dark`
- shadcn/ui (`data-slot` selectors)
- next-themes (multi-value `themes` prop already supported)
- next/font/google (for Fira Code; existing JetBrains Mono stays for other themes)
- TypeScript strict mode
- pnpm-or-npm (existing `package.json` uses npm scripts)
- Docker for production builds (existing `docker-compose.yml`)

**Spec:** `/home/paschal/homelabarr/.planning/phases/11-theme-system-dracula/SPEC.md`

**Working directory:** `/home/paschal/homelabarr` on **neuron** (access via `ssh neuron 'cd /home/paschal/homelabarr && ...'`).

**No tests:** homelabarr has no vitest/jest/playwright setup. Verification is visual via `npm run dev` (Next.js dev server, port assigned at runtime — currently sees 20128). Each task includes a manual visual check in dev mode.

---

## File structure (locked in)

```
homelabarr/
├── app/
│   ├── layout.tsx              (MODIFY: ThemeProvider themes prop + defaultTheme=dracula + Fira Code font)
│   ├── globals.css             (MODIFY: thin to @imports of theme files)
│   └── themes/                 (NEW DIR)
│       ├── _shared.css         (NEW — common cross-theme vars: radius scale, transitions)
│       ├── light.css           (NEW — extracted from current globals.css :root)
│       ├── dark.css            (NEW — extracted from current globals.css .dark)
│       ├── dracula.css         (NEW — full Dracula: vars + overrides)
│       ├── lcars.css           (NEW — STUB class shell)
│       ├── tron-legacy.css     (NEW — STUB class shell)
│       └── tron-classic.css    (NEW — STUB class shell)
├── lib/
│   └── themes.ts               (NEW — registry: id, name, iconKey, swatches[])
└── components/
    ├── theme-toggle.tsx        (MODIFY: render 6 items from lib/themes.ts with icons + swatches)
    ├── theme-swatch.tsx        (NEW — small <ThemeSwatch swatches={[...]}/> component)
    └── icons/                  (NEW DIR, or use existing components/ if no icons subdir)
        ├── bat-icon.tsx        (NEW — inline SVG for Dracula)
        ├── delta-icon.tsx      (NEW — Starfleet delta for LCARS)
        ├── arc-icon.tsx        (NEW — Tron Legacy arc)
        └── grid-icon.tsx       (NEW — Tron Classic vector grid)
```

---

## Task 0: Branch + baseline

**Files:** none (git ops only)

- [ ] **Step 1: Stash any uncommitted work**

```bash
ssh neuron 'cd /home/paschal/homelabarr && git status -s && git stash push -m "pre-phase-11 stash" 2>&1 | tail -3'
```
Expected: either `No local changes to save` OR a stash entry. The `docker-compose.yml` modification we saw earlier should get stashed.

- [ ] **Step 2: Create + checkout feature branch**

```bash
ssh neuron 'cd /home/paschal/homelabarr && git checkout main && git pull --ff-only && git checkout -b phase/11-theme-system-dracula && git log --oneline -3'
```
Expected: clean checkout on new branch off latest main.

- [ ] **Step 3: Confirm dev server starts**

```bash
ssh neuron 'cd /home/paschal/homelabarr && (timeout 30 npm run dev &) ; sleep 15; curl -s -o /dev/null -w "%{http_code}\n" -m 5 http://localhost:3000/ 2>&1; pkill -f "next dev" 2>/dev/null; echo "done"'
```
Expected: HTTP 200 from `http://localhost:3000/` (Next.js dev default). If port differs, note actual port for later steps.

If dev server fails to start, abort + investigate `npm install` state.

---

## Task 1: Theme registry (`lib/themes.ts`)

**Files:**
- Create: `lib/themes.ts`

- [ ] **Step 1: Write `lib/themes.ts`**

Use the Write tool to save the file content locally on hammer, then `scp` to neuron:

```typescript
/**
 * Theme registry — single source of truth for all themes.
 * Consumed by:
 *   - app/layout.tsx (ThemeProvider themes prop)
 *   - components/theme-toggle.tsx (dropdown items)
 *   - any future theme-aware component
 *
 * Adding a theme:
 *   1. Add entry below
 *   2. Add corresponding app/themes/<id>.css file with `.<id> { ... }` selector
 *   3. Import the CSS file in app/globals.css
 */

export const THEMES = [
  {
    id: "light",
    name: "Light",
    iconKey: "sun",
    swatches: ["#ffffff", "#e2e2e2", "#0a0a0a"],
  },
  {
    id: "dark",
    name: "Dark",
    iconKey: "moon",
    swatches: ["#0a0a0a", "#262626", "#fafafa"],
  },
  {
    id: "dracula",
    name: "Dracula",
    iconKey: "bat",
    swatches: ["#BD93F9", "#FF79C6", "#8BE9FD", "#50FA7B"],
  },
  {
    id: "lcars",
    name: "LCARS",
    iconKey: "delta",
    swatches: ["#FF9966", "#CC99CC", "#99CCFF", "#FFCC66"],
  },
  {
    id: "tron-legacy",
    name: "Tron Legacy",
    iconKey: "arc",
    swatches: ["#0DBFE9", "#FFFFFF", "#000000"],
  },
  {
    id: "tron-classic",
    name: "Tron Classic",
    iconKey: "grid",
    swatches: ["#00FFFF", "#FF6900", "#000000"],
  },
] as const;

export type ThemeId = typeof THEMES[number]["id"];
export type IconKey = typeof THEMES[number]["iconKey"];
```

```bash
scp /tmp/themes.ts neuron:/home/paschal/homelabarr/lib/themes.ts
```

- [ ] **Step 2: Verify it type-checks**

```bash
ssh neuron 'cd /home/paschal/homelabarr && npx tsc --noEmit 2>&1 | tail -5'
```
Expected: no errors (or only pre-existing errors unrelated to the new file).

- [ ] **Step 3: Commit**

```bash
ssh neuron 'cd /home/paschal/homelabarr && git add lib/themes.ts && git commit -m "phase 11: add theme registry (lib/themes.ts) — single source of truth for 6 themes"'
```

---

## Task 2: Extract `light.css` + `dark.css` + create `_shared.css`

**Files:**
- Create: `app/themes/_shared.css`
- Create: `app/themes/light.css`
- Create: `app/themes/dark.css`
- Modify: `app/globals.css` (extract :root and .dark blocks; replace with @imports)

- [ ] **Step 1: Capture the current `app/globals.css`**

```bash
ssh neuron 'cat /home/paschal/homelabarr/app/globals.css' > /tmp/globals.css.original
wc -l /tmp/globals.css.original
```
Save this locally as the source of truth for extraction. Should be ~80-120 lines based on what we saw earlier.

- [ ] **Step 2: Write `app/themes/_shared.css`**

This file holds common stuff used across all themes — radius scale, font defaults, transitions. Today, the radius scale is defined inside `@theme inline { ... }` in globals.css. Keep `@theme inline` in globals.css (it must stay there because it's Tailwind v4 syntax). `_shared.css` is reserved for future cross-theme additions (animation timing, easing curves, common @font-face declarations).

For Phase 11, content is minimal:

```css
/* app/themes/_shared.css
 * Common CSS variables used across all themes (currently minimal; LCARS/Tron will add glow scales, etc.)
 */

/* Reserved for future cross-theme additions */
```

Save via Write+scp.

- [ ] **Step 3: Write `app/themes/light.css`**

Extract the `:root { ... }` block from the original globals.css. The whole `:root` block — every `--background`, `--foreground`, `--primary`, etc. line — moves verbatim into `light.css`. The first line of the block in the original globals was `--background: oklch(1 0 0);` (from our earlier read).

```css
/* app/themes/light.css
 * Default Light theme (was the :root block in the original globals.css)
 */
:root,
.light {
  --background: oklch(1 0 0);
  --foreground: oklch(0.13 0.028 261.692);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.13 0.028 261.692);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.13 0.028 261.692);
  --primary: oklch(0.60 0.10 185);
  --primary-foreground: oklch(0.98 0.01 181);
  --secondary: oklch(0.967 0.001 286.375);
  --secondary-foreground: oklch(0.21 0.006 285.885);
  --muted: oklch(0.967 0.003 264.542);
  --muted-foreground: oklch(0.551 0.027 264.364);
  --accent: oklch(0.967 0.003 264.542);
  --accent-foreground: oklch(0.21 0.034 264.665);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.928 0.006 264.531);
  --input: oklch(0.928 0.006 264.531);
  --ring: oklch(0.707 0.022 261.325);
  --chart-1: oklch(0.85 0.13 181);
  --chart-2: oklch(0.78 0.13 182);
  --chart-3: oklch(0.70 0.12 183);
  --chart-4: oklch(0.60 0.10 185);
  --chart-5: oklch(0.51 0.09 186);
  --radius: 0.625rem;
  --sidebar: oklch(0.985 0.002 247.839);
  --sidebar-foreground: oklch(0.13 0.028 261.692);
  --sidebar-primary: oklch(0.60 0.10 185);
  --sidebar-primary-foreground: oklch(0.98 0.01 181);
  --sidebar-accent: oklch(0.967 0.003 264.542);
  --sidebar-accent-foreground: oklch(0.21 0.034 264.665);
  /* ... any additional sidebar-* vars from original (sidebar-border, sidebar-ring) ... */
}
```

**Important:** the selector is `:root, .light` so the theme remains the system default AND can be explicitly named. Verify against the actual original by re-reading `/tmp/globals.css.original`. Include ALL `--*` lines from the original `:root` block — do not omit any (sidebar-border, sidebar-ring, etc. that I didn't show in the preview).

Save via Write+scp.

- [ ] **Step 4: Write `app/themes/dark.css`**

Extract the `.dark { ... }` block from the original globals.css verbatim:

```css
/* app/themes/dark.css
 * Dark theme (was the .dark block in the original globals.css)
 */
.dark {
  --background: oklch(0.13 0.028 261.692);
  --foreground: oklch(0.985 0.002 247.839);
  /* ... all .dark vars from the original ... */
}
```

Read the actual `.dark { ... }` block from `/tmp/globals.css.original` and copy in full.

- [ ] **Step 5: Rewrite `app/globals.css` (thin version)**

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@import "./themes/_shared.css";
@import "./themes/light.css";
@import "./themes/dark.css";
@import "./themes/dracula.css";
@import "./themes/lcars.css";
@import "./themes/tron-legacy.css";
@import "./themes/tron-classic.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  /* Keep the @theme inline block exactly as it was in the original globals.css */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  /* ... all the var(--*) mappings from the original ... */
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);
  --radius-3xl: calc(var(--radius) + 12px);
  --radius-4xl: calc(var(--radius) + 16px);
}
```

(The `@theme inline` block must stay in globals.css because Tailwind v4 processes it at the entry-point CSS level. Theme files only provide the `var(--*)` definitions consumed by `@theme inline`.)

Save via Write+scp.

- [ ] **Step 6: Run dev server, verify light + dark render identically to before refactor**

```bash
ssh neuron 'cd /home/paschal/homelabarr && (timeout 60 npm run dev > /tmp/dev.log 2>&1 &) ; sleep 20'
```

Then in a browser (you need to tunnel or run locally), check `http://localhost:3000`:
- Page renders (no CSS load errors)
- Default theme = Dark (unchanged for now — defaultTheme="dark" still in layout.tsx)
- Switching to Light via existing toggle works visually identical to before
- Console shows no CSS @import errors

```bash
ssh neuron 'tail -20 /tmp/dev.log; pkill -f "next dev" 2>/dev/null'
```
Expected: no errors in dev.log, especially no "Cannot resolve" for the new theme files.

If anything breaks, common causes:
- Missed `--*` variable from original `:root` or `.dark` (e.g. `--sidebar-border`)
- `@import` path wrong (relative to globals.css)
- `@theme inline` block accidentally moved out of globals.css

- [ ] **Step 7: Commit**

```bash
ssh neuron 'cd /home/paschal/homelabarr && git add app/globals.css app/themes/ && git commit -m "phase 11: extract light + dark to app/themes/; thin globals.css to imports; no visual changes"'
```

---

## Task 3: Author Dracula theme — colors + component overrides

**Files:**
- Create: `app/themes/dracula.css`

- [ ] **Step 1: Write the full `app/themes/dracula.css`**

```css
/* app/themes/dracula.css
 * Dracula theme — faithful to draculatheme.com spec (11 published colors).
 * Internal theme-named vars (--dracula-*) used by component overrides; shadcn
 * vars (--background, --primary, etc.) mapped from the canonical palette per SPEC §2.
 */

.dracula {
  /* Canonical 11-color palette (oklch translations of #282A36, #44475A, etc.) */
  --dracula-bg:           oklch(0.21 0.02 264);   /* #282A36 background */
  --dracula-current-line: oklch(0.32 0.02 264);   /* #44475A */
  --dracula-fg:           oklch(0.96 0.005 95);   /* #F8F8F2 foreground */
  --dracula-comment:      oklch(0.51 0.07 264);   /* #6272A4 */
  --dracula-cyan:         oklch(0.87 0.13 213);   /* #8BE9FD */
  --dracula-green:        oklch(0.85 0.21 142);   /* #50FA7B */
  --dracula-orange:       oklch(0.81 0.14 70);    /* #FFB86C */
  --dracula-pink:         oklch(0.72 0.27 350);   /* #FF79C6 */
  --dracula-purple:       oklch(0.71 0.18 296);   /* #BD93F9 */
  --dracula-red:          oklch(0.66 0.24 25);    /* #FF5555 */
  --dracula-yellow:       oklch(0.95 0.15 105);   /* #F1FA8C */

  /* shadcn variable mapping per SPEC §2 */
  --background:           var(--dracula-bg);
  --foreground:           var(--dracula-fg);
  --card:                 var(--dracula-current-line);
  --card-foreground:      var(--dracula-fg);
  --popover:              var(--dracula-current-line);
  --popover-foreground:   var(--dracula-fg);
  --primary:              var(--dracula-purple);
  --primary-foreground:   var(--dracula-bg);
  --secondary:            var(--dracula-current-line);
  --secondary-foreground: var(--dracula-fg);
  --muted:                var(--dracula-current-line);
  --muted-foreground:     var(--dracula-comment);
  --accent:               var(--dracula-pink);
  --accent-foreground:    var(--dracula-bg);
  --destructive:          var(--dracula-red);
  --border:               var(--dracula-current-line);
  --input:                var(--dracula-current-line);
  --ring:                 var(--dracula-purple);
  --chart-1:              var(--dracula-cyan);
  --chart-2:              var(--dracula-green);
  --chart-3:              var(--dracula-orange);
  --chart-4:              var(--dracula-pink);
  --chart-5:              var(--dracula-yellow);
  --sidebar:              oklch(0.18 0.02 264);   /* slightly darker than bg */
  --sidebar-foreground:   var(--dracula-fg);
  --sidebar-primary:      var(--dracula-purple);
  --sidebar-primary-foreground: var(--dracula-bg);
  --sidebar-accent:       var(--dracula-current-line);
  --sidebar-accent-foreground: var(--dracula-fg);
  --sidebar-border:       var(--dracula-current-line);
  --sidebar-ring:         var(--dracula-purple);

  /* Theme-specific font (Fira Code wired in Task 6) */
  --font-mono: var(--font-fira-code, 'Fira Code', 'JetBrains Mono', monospace);

  /* Keep existing radius scale */
  --radius: 0.625rem;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Component overrides (SPEC §5)
 * ──────────────────────────────────────────────────────────────────────────── */

/* Iconic Dracula text-selection */
.dracula ::selection {
  background: var(--dracula-pink);
  color: var(--dracula-bg);
}

/* Scrollbar (webkit/blink browsers; Firefox uses scrollbar-color which we set on .dracula html below) */
.dracula ::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.dracula ::-webkit-scrollbar-track {
  background: var(--dracula-current-line);
}
.dracula ::-webkit-scrollbar-thumb {
  background: var(--dracula-purple);
  border-radius: 5px;
}
.dracula ::-webkit-scrollbar-thumb:hover {
  background: var(--dracula-pink);
}

.dracula {
  scrollbar-color: var(--dracula-purple) var(--dracula-current-line);
  scrollbar-width: thin;
}

/* Code blocks — Fira Code with ligatures, current-line background */
.dracula pre,
.dracula code {
  font-family: var(--font-mono);
  font-feature-settings: 'liga' 1, 'calt' 1;  /* enable Fira Code ligatures */
}
.dracula pre {
  background: var(--dracula-current-line);
  color: var(--dracula-fg);
  padding: 1rem;
  border-radius: var(--radius);
  overflow-x: auto;
}
.dracula :not(pre) > code {
  background: var(--dracula-current-line);
  color: var(--dracula-cyan);
  padding: 0.125rem 0.375rem;
  border-radius: calc(var(--radius) / 2);
  font-size: 0.875em;
}

/* Keyboard input */
.dracula kbd {
  background: var(--dracula-current-line);
  color: var(--dracula-cyan);
  border: 1px solid var(--dracula-purple);
  border-radius: 0.25rem;
  padding: 0.125rem 0.375rem;
  font-family: var(--font-mono);
  font-size: 0.875em;
  box-shadow: 0 1px 0 var(--dracula-purple);
}

/* Data table row hover */
.dracula table tr:hover {
  background: color-mix(in oklch, var(--dracula-current-line) 50%, transparent);
}

/* Skeleton loader tint (keep shadcn animation, just retinted) */
.dracula [data-slot="skeleton"] {
  background: color-mix(in oklch, var(--dracula-current-line) 70%, var(--dracula-comment) 30%);
}
```

Save via Write+scp.

- [ ] **Step 2: Dev-server smoke check**

Restart dev server. The Dracula theme file is now imported in globals.css (Task 2 already added the import). The `.dracula` class isn't selectable yet (Task 4 adds it to ThemeProvider), but the CSS must parse without errors.

```bash
ssh neuron 'cd /home/paschal/homelabarr && (timeout 60 npm run dev > /tmp/dev.log 2>&1 &) ; sleep 20; grep -iE "error|fail|cannot" /tmp/dev.log | head -10; pkill -f "next dev" 2>/dev/null'
```
Expected: no CSS parse errors. If there are errors, common causes are syntax typos (missing semicolons after `var(--*)`), missing OKLCH parens, or `color-mix` browser support warnings (those are warnings, not errors).

- [ ] **Step 3: Commit**

```bash
ssh neuron 'cd /home/paschal/homelabarr && git add app/themes/dracula.css && git commit -m "phase 11: author Dracula theme — full 11-color palette + component overrides (selection, scrollbar, code, kbd, table)"'
```

---

## Task 4: Stub themes (lcars, tron-legacy, tron-classic)

**Files:**
- Create: `app/themes/lcars.css`
- Create: `app/themes/tron-legacy.css`
- Create: `app/themes/tron-classic.css`

- [ ] **Step 1: Write all 3 stubs**

Each stub is just a class shell that inherits from `.dark` for now (so selecting them produces a valid usable appearance, not a broken page). Full theme content comes in Phases 12-14.

```css
/* app/themes/lcars.css
 * STUB — full theme in Phase 12. Currently inherits dark-theme vars so the
 * theme is selectable + produces a usable rendering.
 */
.lcars {
  --background: oklch(0.13 0.028 261.692);
  --foreground: oklch(0.985 0.002 247.839);
  /* ... all other vars from .dark, copied so the class is self-contained ... */
  /* TEMPORARY: ship the dark palette under this class until Phase 12. */
}
```

(Copy ALL `--*` lines from `dark.css` into each stub; substitute `.dark` selector for `.lcars`, `.tron-legacy`, `.tron-classic`. The stubs are intentionally identical to dark — they're placeholders so the theme switcher has all 6 options selectable end-to-end.)

Repeat for `tron-legacy.css` and `tron-classic.css` with their respective selectors.

- [ ] **Step 2: Dev-server smoke**

```bash
ssh neuron 'cd /home/paschal/homelabarr && (timeout 60 npm run dev > /tmp/dev.log 2>&1 &) ; sleep 20; grep -iE "error|fail" /tmp/dev.log | head; pkill -f "next dev" 2>/dev/null'
```

- [ ] **Step 3: Commit**

```bash
ssh neuron 'cd /home/paschal/homelabarr && git add app/themes/lcars.css app/themes/tron-legacy.css app/themes/tron-classic.css && git commit -m "phase 11: add stub theme CSS files (lcars, tron-legacy, tron-classic) that inherit dark vars — real content in phases 12-14"'
```

---

## Task 5: Add Fira Code font + wire `--font-fira-code`

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Read current `app/layout.tsx`**

```bash
ssh neuron 'cat /home/paschal/homelabarr/app/layout.tsx'
```
Note the existing `JetBrains_Mono` import + how it's applied (likely as a className on `<body>` or via CSS variable).

- [ ] **Step 2: Add Fira Code import alongside JetBrains_Mono**

In `app/layout.tsx`, add:

```typescript
import { JetBrains_Mono, Fira_Code } from "next/font/google";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
  display: "swap",
});

// In the JSX:
<body className={`${jetbrainsMono.variable} ${firaCode.variable} ...`}>
```

The exact JSX changes depend on the existing structure; preserve other className additions. Both fonts load; theme CSS files pick which to use via `--font-mono: var(--font-fira-code)` (Dracula) or `var(--font-jetbrains-mono)` (others).

- [ ] **Step 3: Dev-server smoke**

```bash
ssh neuron 'cd /home/paschal/homelabarr && (timeout 60 npm run dev > /tmp/dev.log 2>&1 &) ; sleep 25; grep -iE "error|fail" /tmp/dev.log | head; curl -s http://localhost:3000/ | grep -o "font-fira-code\|font-jetbrains" | head; pkill -f "next dev" 2>/dev/null'
```
Expected: HTML output contains both `--font-fira-code` and `--font-jetbrains-mono` CSS class names.

- [ ] **Step 4: Commit**

```bash
ssh neuron 'cd /home/paschal/homelabarr && git add app/layout.tsx && git commit -m "phase 11: load Fira Code (Dracula mono font) alongside existing JetBrains Mono"'
```

---

## Task 6: Custom SVG icons (bat, delta, arc, grid)

**Files:**
- Create: `components/icons/bat-icon.tsx`
- Create: `components/icons/delta-icon.tsx`
- Create: `components/icons/arc-icon.tsx`
- Create: `components/icons/grid-icon.tsx`

- [ ] **Step 1: Decide icon location**

```bash
ssh neuron 'ls /home/paschal/homelabarr/components/icons/ 2>/dev/null || echo "(no icons subdir yet)"'
```
If no `icons/` subdir exists, create it (`mkdir -p components/icons/` happens implicitly when we scp files).

- [ ] **Step 2: Write `bat-icon.tsx`**

Simple inline-SVG React component. Use a public-domain Dracula-bat silhouette (24×24, single-color, currentColor for theme adaptation):

```tsx
// components/icons/bat-icon.tsx
import { type SVGProps } from "react";

export function BatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Simplified bat silhouette — pointed wings, small body. Public-domain shape. */}
      <path d="M12 6c-1 0-1.5 1-1.5 1.5L9 6 6 7l1 2c-1.5.5-3 1.5-4 3l1 1c1-.5 2-.5 3 0l-1 2 2-.5L9 14c.5 0 1 .5 1 1l1-1h2l1 1c0-.5.5-1 1-1l1 .5L17 14l-1-2c1-.5 2-.5 3 0l1-1c-1-1.5-2.5-2.5-4-3l1-2-3-1-1.5 1.5C13.5 7 13 6 12 6z" />
    </svg>
  );
}
```

- [ ] **Step 3: Write `delta-icon.tsx`** (Starfleet delta — open triangle with curved bottom)

```tsx
// components/icons/delta-icon.tsx
import { type SVGProps } from "react";

export function DeltaIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Starfleet delta: angled triangle with curved swoop at the bottom */}
      <path d="M12 3 L21 19 C18 17 15 16 12 16 C9 16 6 17 3 19 Z" />
    </svg>
  );
}
```

- [ ] **Step 4: Write `arc-icon.tsx`** (Tron Legacy — quarter-circle arc)

```tsx
// components/icons/arc-icon.tsx
import { type SVGProps } from "react";

export function ArcIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Tron Legacy arc: glowing quarter-circle accent */}
      <path d="M4 20 A 16 16 0 0 1 20 4" />
      <circle cx={12} cy={12} r={1.5} fill="currentColor" />
    </svg>
  );
}
```

- [ ] **Step 5: Write `grid-icon.tsx`** (Tron Classic — vector grid)

```tsx
// components/icons/grid-icon.tsx
import { type SVGProps } from "react";

export function GridIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Tron Classic vector grid: perspective lines converging */}
      <path d="M2 20 L12 6 L22 20 M2 20 L22 20 M5 18 L19 18 M8 15 L16 15 M10 12 L14 12" />
    </svg>
  );
}
```

- [ ] **Step 6: Verify all 4 type-check**

```bash
ssh neuron 'cd /home/paschal/homelabarr && npx tsc --noEmit 2>&1 | tail -5'
```

- [ ] **Step 7: Commit**

```bash
ssh neuron 'cd /home/paschal/homelabarr && git add components/icons/ && git commit -m "phase 11: custom SVG icons (bat, delta, arc, grid) for theme switcher"'
```

---

## Task 7: `<ThemeSwatch>` component

**Files:**
- Create: `components/theme-swatch.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/theme-swatch.tsx
/**
 * Renders a row of small colored circles representing a theme's palette identity.
 * Used in the theme switcher dropdown to give each theme a recognizable preview
 * without a full screenshot.
 */
interface ThemeSwatchProps {
  swatches: readonly string[];
  size?: number;  // pixel diameter per dot
}

export function ThemeSwatch({ swatches, size = 8 }: ThemeSwatchProps) {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      {swatches.map((color, i) => (
        <span
          key={i}
          className="inline-block rounded-full border border-border/20"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            backgroundColor: color,
          }}
        />
      ))}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
ssh neuron 'cd /home/paschal/homelabarr && git add components/theme-swatch.tsx && git commit -m "phase 11: <ThemeSwatch> renders palette preview dots in theme switcher"'
```

---

## Task 8: Rewrite `components/theme-toggle.tsx` (6 items + icons + swatches)

**Files:**
- Modify: `components/theme-toggle.tsx`

- [ ] **Step 1: Read the existing component**

```bash
ssh neuron 'cat /home/paschal/homelabarr/components/theme-toggle.tsx'
```
Note the current import structure, the trigger button shape, and the DropdownMenuRadioItem pattern.

- [ ] **Step 2: Rewrite to consume the registry**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HugeiconsIcon } from "@hugeicons/react";
import { Sun02Icon, Moon02Icon, ComputerIcon } from "@hugeicons/core-free-icons";

import { THEMES, type ThemeId, type IconKey } from "@/lib/themes";
import { ThemeSwatch } from "@/components/theme-swatch";
import { BatIcon } from "@/components/icons/bat-icon";
import { DeltaIcon } from "@/components/icons/delta-icon";
import { ArcIcon } from "@/components/icons/arc-icon";
import { GridIcon } from "@/components/icons/grid-icon";

function getIconForKey(key: IconKey, className = "size-4") {
  switch (key) {
    case "sun":  return <HugeiconsIcon icon={Sun02Icon}  strokeWidth={2} className={className} />;
    case "moon": return <HugeiconsIcon icon={Moon02Icon} strokeWidth={2} className={className} />;
    case "bat":  return <BatIcon className={className} />;
    case "delta":return <DeltaIcon className={className} />;
    case "arc":  return <ArcIcon className={className} />;
    case "grid": return <GridIcon className={className} />;
  }
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Select theme">
          {/* Trigger icon: show current theme's icon if mounted; otherwise sun/moon transition placeholder */}
          {mounted ? (
            (() => {
              const current = THEMES.find((t) => t.id === theme) ?? THEMES[1]; // fallback to dark
              return getIconForKey(current.iconKey);
            })()
          ) : (
            <>
              <HugeiconsIcon
                icon={Sun02Icon}
                strokeWidth={2}
                className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
              />
              <HugeiconsIcon
                icon={Moon02Icon}
                strokeWidth={2}
                className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
              />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={(v) => setTheme(v)}>
          {THEMES.map((t) => (
            <DropdownMenuRadioItem
              key={t.id}
              value={t.id}
              className="flex items-center justify-between gap-3"
            >
              <span className="flex items-center gap-2">
                {getIconForKey(t.iconKey)}
                <span>{t.name}</span>
              </span>
              <ThemeSwatch swatches={t.swatches} />
            </DropdownMenuRadioItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuRadioItem value="system" className="flex items-center gap-2">
            <HugeiconsIcon icon={ComputerIcon} strokeWidth={2} className="size-4" />
            <span>Match system</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 3: Verify type-check + dev-server**

```bash
ssh neuron 'cd /home/paschal/homelabarr && npx tsc --noEmit 2>&1 | tail -5'
ssh neuron 'cd /home/paschal/homelabarr && (timeout 60 npm run dev > /tmp/dev.log 2>&1 &) ; sleep 25; grep -iE "error|fail" /tmp/dev.log | head; pkill -f "next dev" 2>/dev/null'
```

- [ ] **Step 4: Commit**

```bash
ssh neuron 'cd /home/paschal/homelabarr && git add components/theme-toggle.tsx && git commit -m "phase 11: rewrite theme toggle to consume lib/themes.ts registry — 6 items + icons + palette swatches"'
```

---

## Task 9: Modify `app/layout.tsx` — extend ThemeProvider

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Read existing ThemeProvider usage**

(Already inspected during plan writing — current is `attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange`.)

- [ ] **Step 2: Modify to expose all 6 themes + default to Dracula**

In `app/layout.tsx`, replace the existing ThemeProvider line with:

```tsx
import { THEMES } from "@/lib/themes";

// ...

<ThemeProvider
  attribute="class"
  defaultTheme="dracula"
  themes={[...THEMES.map((t) => t.id), "system"]}
  enableSystem
  disableTransitionOnChange
>
```

(Spread the THEMES IDs + add "system" since `enableSystem` is still wanted as a fallback. `next-themes` requires "system" to be in the `themes` list when `enableSystem` is true.)

- [ ] **Step 3: Dev-server smoke + manual check**

```bash
ssh neuron 'cd /home/paschal/homelabarr && (timeout 60 npm run dev > /tmp/dev.log 2>&1 &) ; sleep 25; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/; pkill -f "next dev" 2>/dev/null'
```
Expected: HTTP 200.

If the user can view the dev server (e.g. tunneled via SSH port forward `ssh -L 3000:localhost:3000 neuron`), they should:
1. Load `http://localhost:3000/` — page renders in Dracula (the new default) since localStorage doesn't yet have a preference set
2. Open theme toggle — see all 6 themes + system, with icons + swatches
3. Click through Light/Dark/Dracula/LCARS/Tron Legacy/Tron Classic and confirm visual changes (Dracula's purple+pink is most distinctive; others currently appear identical to Dark since they're stubs)

- [ ] **Step 4: Commit**

```bash
ssh neuron 'cd /home/paschal/homelabarr && git add app/layout.tsx && git commit -m "phase 11: ThemeProvider exposes 6 themes; defaultTheme=dracula (new default replaces dark)"'
```

---

## Task 10: Visual QA pass + screenshot evidence

**Files:** none (testing only)

- [ ] **Step 1: Set up SSH tunnel to view dev server**

From your local laptop (not via Claude):
```bash
ssh -L 3000:localhost:3000 neuron 'cd /home/paschal/homelabarr && npm run dev'
```

Open browser to `http://localhost:3000/`.

- [ ] **Step 2: Walk through each theme + verify key UI surfaces**

For each of [Light, Dark, Dracula, LCARS, Tron Legacy, Tron Classic, Match system]:

1. Open theme toggle, select theme
2. Verify these render correctly (no broken layouts, contrast acceptable):
   - Sidebar (background, text, icon color, active item highlight)
   - Header (text, theme toggle icon)
   - Main canvas (empty-state placeholder)
   - Any visible card or button
3. For Dracula specifically:
   - Try text selection on any paragraph — should show pink-on-dark-bg
   - Check scrollbar (scroll a long page) — should be purple-on-current-line
   - If any `<kbd>` or `<code>` is visible — should use Fira Code + Dracula color treatment
4. Refresh page — selected theme persists (next-themes uses localStorage)

- [ ] **Step 3: If anything broken, fix inline**

Common issues + fixes:
- Sidebar background looks wrong → missing `--sidebar` var in the new theme file
- Text unreadable → check `--foreground` is set in the theme block
- Icon doesn't show → check Task 6 SVG renders + check `currentColor` inherits theme `--foreground`

- [ ] **Step 4: Commit any inline fixes**

```bash
ssh neuron 'cd /home/paschal/homelabarr && git add -A && git commit -m "phase 11 QA: fix <specific issue>"'
```

---

## Task 11: Production Docker build + verify

**Files:** none (build + deploy)

- [ ] **Step 1: Build production image**

```bash
ssh neuron 'cd /home/paschal/homelabarr && docker compose build 2>&1 | tail -10'
```
Expected: build succeeds with "Successfully tagged" or equivalent.

- [ ] **Step 2: Stop existing container + start new one**

The current production container has been running for 7 days. Recreating it:

```bash
ssh neuron 'cd /home/paschal/homelabarr && docker compose down && docker compose up -d 2>&1 | tail -5'
```

- [ ] **Step 3: Verify container is up + serving**

```bash
ssh neuron 'sleep 10; sudo docker ps --filter "name=homelabarr" --format "{{.Status}}"; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3575/'
```
Expected: container `Up`, port 3575 returns 200.

- [ ] **Step 4: Smoke check production rendering**

Visit `http://neuron:3575/` from your laptop. Verify:
1. Page loads
2. Default theme is now Dracula (purple/pink palette)
3. Theme toggle shows 6 items
4. Selecting Light, Dark, etc. all work

- [ ] **Step 5: Commit any production-only fixes**

If something works in dev but not prod (rare — usually Tailwind purge issues), fix + rebuild.

```bash
ssh neuron 'cd /home/paschal/homelabarr && git add -A && git commit -m "phase 11 prod: <fix>"'
```

---

## Task 12: Open PR (or merge to main)

**Files:** none (git ops)

- [ ] **Step 1: Push branch**

```bash
ssh neuron 'cd /home/paschal/homelabarr && git push -u origin phase/11-theme-system-dracula 2>&1 | tail -5'
```

- [ ] **Step 2: Open PR**

```bash
ssh neuron 'cd /home/paschal/homelabarr && gh pr create --title "Phase 11: Theme system + Dracula" --body "Implements .planning/phases/11-theme-system-dracula/SPEC.md.

## Changes
- New theme registry at \`lib/themes.ts\`
- Extracted light/dark to \`app/themes/\`
- Added Dracula (faithful to draculatheme.com spec: 11 colors + Fira Code + ::selection/scrollbar/kbd/code overrides)
- Added stubs for LCARS, Tron Legacy, Tron Classic (inherit dark vars; real content in Phases 12-14)
- Theme toggle rewritten: 6 items + custom icons + palette swatches
- ThemeProvider exposes all 6 + system; **default now Dracula** (was dark)

## Test plan
- [x] Dev server renders all 6 themes
- [x] Production Docker build succeeds
- [x] All 6 themes selectable + persist across refresh
- [x] Dracula component overrides visible (::selection, scrollbar)

## Out of scope (own phases)
- LCARS visuals (Phase 12)
- Tron Legacy visuals (Phase 13)
- Tron Classic visuals (Phase 14)
- Hermes widget (L3.a)
- k8s-autoupdater widget (L3.b)" 2>&1 | tail -5'
```

- [ ] **Step 3: If you self-merge after CI passes**

```bash
ssh neuron 'cd /home/paschal/homelabarr && gh pr merge --squash --delete-branch 2>&1 | tail -3'
```

- [ ] **Step 4: Final status**

```bash
ssh neuron 'cd /home/paschal/homelabarr && git checkout main && git pull --ff-only && git log --oneline -5'
```

---

## Out of scope for this plan (per SPEC §6)

- **LCARS / Tron themes** — own plans in Phases 12-14
- **Hermes widget** — sub-project L3.a, own plan
- **k8s-autoupdater widget** — sub-project L3.b, own plan
- **Custom user themes / theme editor**
- **Per-board theme override**
- **Animated theme transitions**
- **i18n of theme names**

---

## Spec traceability

| SPEC section | Plan task(s) |
|---|---|
| §1 Architecture (file structure, ThemeProvider config, per-theme CSS pattern) | Tasks 2, 9 |
| §2 Dracula visual identity (11 colors, shadcn var mapping, Fira Code) | Tasks 3, 5 |
| §3 Theme switcher UI (6 items, registry, swatches) | Tasks 1, 6, 7, 8 |
| §4 Reference impls (dracula/dracula-ui crib) | Task 3 Step 1 (oklch values derived from canonical hex) |
| §5 Component-shape overrides (selection, scrollbar, kbd, code, table) | Task 3 |
| §6 Out of scope | Mirrored above |
