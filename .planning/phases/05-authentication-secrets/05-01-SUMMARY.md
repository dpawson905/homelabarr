# 05-01 Auth Foundation — Summary

## Objective
Build the authentication and secrets foundation: database tables (sessions + secrets), password hashing utilities, and session management library.

## Completed Tasks

### Task 1: Sessions and secrets tables added to database schema
- **Files**: `lib/db/schema.ts`, `lib/db/index.ts`
- Added `sessions` table with columns: id, token (unique), expiresAt, createdAt
- Added `secrets` table with columns: id, name (unique), encryptedValue, iv, authTag, description, createdAt, updatedAt
- Exported inferred types: `Session`, `NewSession`, `Secret`, `NewSecret`
- Re-exported all new types from `lib/db/index.ts`

### Task 2: Password hashing and session management libraries
- **Files**: `lib/auth/password.ts`, `lib/auth/session.ts`
- Added `bcryptjs` and `@types/bcryptjs` to `package.json`
- `password.ts` exports: `hashPassword`, `verifyPassword`, `isPasswordSet`
- `session.ts` exports: `createSession`, `validateSession`, `deleteSession`, `cleanExpiredSessions`, `getSessionFromCookies`, `setSessionCookie`, `clearSessionCookie`
- All cookie functions properly `await cookies()` for Next.js 16 compatibility
- Session cookies configured with: httpOnly, secure (production), sameSite: "lax", path: "/"
- Session durations: 24h default, 30d with rememberMe

### Task 3: Session check API endpoint
- **File**: `app/api/auth/session/route.ts`
- GET handler returns JSON with `authenticated` and optional `setupRequired` fields
- Returns `{ authenticated: false, setupRequired: true }` when no password hash exists in settings
- Returns `{ authenticated: true }` when valid session cookie is present
- Returns `{ authenticated: false, setupRequired: false }` when password is set but no valid session
- Always returns 200 status; errors return 500

## Architecture Decisions
- **Single-user auth**: Password hash stored in `settings` table under key `"passwordHash"` — no users table needed
- **Synchronous DB access**: All DB operations use `.get()` / `.all()` / `.run()` (better-sqlite3 sync driver)
- **Async cookie access**: All functions using `cookies()` are async per Next.js 16 requirements
- **bcryptjs (sync)**: Uses `hashSync`/`compareSync` for compatibility with synchronous DB driver
- **Cryptographic tokens**: 64-char hex tokens via `crypto.randomBytes(32)`

## Action Required
- **`npm install` must be run** to install `bcryptjs` and `@types/bcryptjs` (sandbox restrictions prevented automated installation during this session)

## Verification Status
- TypeScript compilation: passes except for missing `bcryptjs` module (resolved after `npm install`)
- All files structurally correct and follow existing project patterns
- Three commits created (one per task)
