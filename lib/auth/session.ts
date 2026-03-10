import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { eq, lt } from "drizzle-orm";
import type { Session } from "@/lib/db/schema";

// ─── Constants ──────────────────────────────────────────────────────────────

const SESSION_DURATION = 24 * 60 * 60 * 1000;
const REMEMBER_ME_DURATION = 30 * 24 * 60 * 60 * 1000;

export const SESSION_COOKIE_NAME = "homelabarr_session";

// ─── Session CRUD ───────────────────────────────────────────────────────────

export function createSession(rememberMe: boolean = false): string {
  const token = randomBytes(32).toString("hex");
  const duration = rememberMe ? REMEMBER_ME_DURATION : SESSION_DURATION;
  const expiresAt = new Date(Date.now() + duration).toISOString();

  db.insert(sessions).values({ token, expiresAt }).run();

  return token;
}

export function validateSession(token: string): Session | null {
  const session = db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .get();

  if (!session) return null;

  if (new Date(session.expiresAt) <= new Date()) {
    db.delete(sessions).where(eq(sessions.token, token)).run();
    return null;
  }

  return session;
}

export function deleteSession(token: string): void {
  db.delete(sessions).where(eq(sessions.token, token)).run();
}

export function cleanExpiredSessions(): void {
  db.delete(sessions).where(lt(sessions.expiresAt, new Date().toISOString())).run();
}

// ─── Cookie Helpers ─────────────────────────────────────────────────────────
// Note: cookies() is async in Next.js 15+.

export async function getSessionFromCookies(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) return null;

  return validateSession(sessionCookie.value);
}

export async function setSessionCookie(
  token: string,
  rememberMe: boolean
): Promise<void> {
  const cookieStore = await cookies();
  const duration = rememberMe ? REMEMBER_ME_DURATION : SESSION_DURATION;

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.SECURE_COOKIES === "true",
    sameSite: "strict",
    path: "/",
    maxAge: duration / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
