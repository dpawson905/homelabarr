import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Cost factor 12 — deliberately slow to resist brute-force attacks.
const BCRYPT_ROUNDS = 12;

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export function isPasswordSet(): boolean {
  const row = db
    .select({ key: settings.key })
    .from(settings)
    .where(eq(settings.key, "passwordHash"))
    .get();
  return !!row;
}
