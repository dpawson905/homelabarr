# Plan 05-03: Login Page + Middleware — Summary

## Completed Tasks

### Task 1: Auth API Endpoints
**Files created:**
- `app/api/auth/login/route.ts`
- `app/api/auth/setup/route.ts`
- `app/api/auth/logout/route.ts`

**Details:**
- **POST /api/auth/login** — Accepts `{ password, rememberMe? }`. Validates password is set, verifies against stored hash with `verifyPassword()`, creates session with `createSession()`, and sets HTTP-only cookie via `setSessionCookie()`. Returns 400 if no password configured, 401 for invalid password.
- **POST /api/auth/setup** — Accepts `{ password, confirmPassword }`. Only works when no password exists (`isPasswordSet()` returns false). Validates minimum 8 characters and matching passwords. Hashes with bcrypt and stores in settings table. Auto-logins after setup by creating a session.
- **POST /api/auth/logout** — Retrieves current session from cookies, deletes it from the database, and clears the session cookie. Works even if no session exists.

All endpoints follow the existing error handling pattern (try/catch, structured JSON responses).

### Task 2: Login Page + Middleware
**Files created:**
- `middleware.ts` (project root)
- `app/login/page.tsx`

**Middleware details:**
- Runs on all routes except `/login`, `/api/auth/*`, `/_next/*`, `favicon.ico`, and `/icons/*`
- Checks for presence of `homelabarr_session` cookie only (no SQLite access on edge runtime)
- Redirects to `/login` when cookie is absent
- Full session validation happens server-side in API routes

**Login page details:**
- Client component with three states: loading, login, setup
- On mount, fetches `GET /api/auth/session` to determine mode
- If already authenticated, redirects to `/`
- If `setupRequired`, shows Create Password form (password + confirm, min 8 chars)
- Otherwise shows Login form (password + Remember Me switch)
- Both forms have show/hide password toggles using EyeIcon/ViewOffIcon from hugeicons
- Loading state shows spinning Loading03Icon
- Branding header with pulsing teal dot + "Homelabarr" text
- Styled with shadcn/ui Card, Input, Label, Button, Switch components
- max-w-sm centered card on dark background

## Verification
- `npx tsc --noEmit` passes with zero errors
- Middleware correctly redirects unauthenticated requests to `/login`
- Login page renders all three states (loading, login, setup)
- All async cookie operations are properly awaited (Next.js 16 requirement)

## Architecture Notes
- Middleware is intentionally thin (cookie presence only) because Next.js edge middleware cannot access SQLite
- The session endpoint (`GET /api/auth/session`) was already built in Plan 01 and serves as the auth state check for the login page
- Password hashing uses bcrypt with cost factor 12 (from `lib/auth/password.ts`)
- Session tokens are 32-byte random hex strings (from `lib/auth/session.ts`)
