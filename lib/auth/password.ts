import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Hash a plaintext password using bcrypt with cost factor 12.
 * Uses sync variant for compatibility with better-sqlite3's synchronous driver.
 */
export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 12);
}

/**
 * Verify a plaintext password against a bcrypt hash.
 */
export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

/**
 * Check whether a password hash has been stored in the settings table.
 * Returns true if the "passwordHash" key exists.
 */
export function isPasswordSet(): boolean {
  const row = db
    .select()
    .from(settings)
    .where(eq(settings.key, "passwordHash"))
    .get();
  return !!row;
}
