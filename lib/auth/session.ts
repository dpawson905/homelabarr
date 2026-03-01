import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { eq, lt } from "drizzle-orm";
import type { Session } from "@/lib/db/schema";

// ─── Constants ──────────────────────────────────────────────────────────────

/** 24 hours in milliseconds */
const SESSION_DURATION = 24 * 60 * 60 * 1000;

/** 30 days in milliseconds */
const REMEMBER_ME_DURATION = 30 * 24 * 60 * 60 * 1000;

/** Name of the session cookie */
export const SESSION_COOKIE_NAME = "homelabarr_session";

// ─── Session CRUD ───────────────────────────────────────────────────────────

/**
 * Create a new session and return its token.
 * Generates a cryptographically random 64-char hex token.
 */
export function createSession(rememberMe: boolean = false): string {
  const token = randomBytes(32).toString("hex");
  const duration = rememberMe ? REMEMBER_ME_DURATION : SESSION_DURATION;
  const expiresAt = new Date(Date.now() + duration).toISOString();

  db.insert(sessions)
    .values({ token, expiresAt })
    .run();

  return token;
}

/**
 * Validate a session token. Returns the session if valid, null otherwise.
 * Deletes the session if it has expired.
 */
export function validateSession(token: string): Session | null {
  const session = db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .get();

  if (!session) return null;

  // Check if session has expired
  if (new Date(session.expiresAt) <= new Date()) {
    db.delete(sessions).where(eq(sessions.token, token)).run();
    return null;
  }

  return session;
}

/**
 * Delete a session by its token.
 */
export function deleteSession(token: string): void {
  db.delete(sessions).where(eq(sessions.token, token)).run();
}

/**
 * Delete all expired sessions.
 */
export function cleanExpiredSessions(): void {
  const now = new Date().toISOString();
  db.delete(sessions).where(lt(sessions.expiresAt, now)).run();
}

// ─── Cookie Helpers ─────────────────────────────────────────────────────────

/**
 * Read the session cookie and validate the session.
 * IMPORTANT: cookies() is async in Next.js 16.
 */
export async function getSessionFromCookies(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) return null;

  return validateSession(sessionCookie.value);
}

/**
 * Set the session cookie.
 * IMPORTANT: cookies() is async in Next.js 16.
 */
export async function setSessionCookie(
  token: string,
  rememberMe: boolean
): Promise<void> {
  const cookieStore = await cookies();
  const duration = rememberMe ? REMEMBER_ME_DURATION : SESSION_DURATION;

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(duration / 1000), // maxAge is in seconds
  });
}

/**
 * Clear the session cookie.
 * IMPORTANT: cookies() is async in Next.js 16.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
