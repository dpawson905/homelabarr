import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";

const KEY_FILE_PATH = "./data/.encryption-key";
const SALT_FILE_PATH = "./data/.encryption-salt";
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

let cachedKey: Buffer | null = null;

/**
 * Returns a per-installation random salt, persisted to disk.
 * Falls back to a static salt for existing installations that don't
 * yet have a salt file (to avoid breaking existing encrypted data).
 */
function getSalt(): string {
  if (existsSync(SALT_FILE_PATH)) {
    return readFileSync(SALT_FILE_PATH, "utf-8").trim();
  }

  // For existing installations that already have an encryption key but
  // no salt file, keep the legacy static salt to avoid breaking decryption.
  if (existsSync(KEY_FILE_PATH) || process.env.ENCRYPTION_SECRET) {
    return "homelabarr-secrets-salt";
  }

  // New installation: generate a random salt and persist it
  const salt = randomBytes(SALT_LENGTH).toString("hex");
  mkdirSync(dirname(SALT_FILE_PATH), { recursive: true });
  writeFileSync(SALT_FILE_PATH, salt, { mode: 0o600 });
  return salt;
}

/**
 * Derives a 32-byte encryption key using scryptSync.
 *
 * Key source priority:
 * 1. process.env.ENCRYPTION_SECRET
 * 2. ./data/.encryption-key file (auto-generated if missing)
 */
export function getEncryptionKey(): Buffer {
  if (cachedKey) {
    return cachedKey;
  }

  let secret: string;

  if (process.env.ENCRYPTION_SECRET) {
    secret = process.env.ENCRYPTION_SECRET;
  } else if (existsSync(KEY_FILE_PATH)) {
    secret = readFileSync(KEY_FILE_PATH, "utf-8").trim();
  } else {
    // Auto-generate a 32-byte hex key and persist it
    secret = randomBytes(32).toString("hex");
    mkdirSync(dirname(KEY_FILE_PATH), { recursive: true });
    writeFileSync(KEY_FILE_PATH, secret, { mode: 0o600 });
  }

  cachedKey = scryptSync(secret, getSalt(), KEY_LENGTH);
  return cachedKey;
}

/**
 * Encrypts plaintext using AES-256-GCM with a random 16-byte IV.
 * Returns hex-encoded strings for encrypted data, IV, and auth tag.
 */
export function encrypt(plaintext: string): {
  encrypted: string;
  iv: string;
  authTag: string;
} {
  const key = getEncryptionKey();
  const iv = randomBytes(16);

  const cipher = createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

/**
 * Decrypts AES-256-GCM encrypted data back to plaintext.
 * Expects hex-encoded strings for encrypted data, IV, and auth tag.
 */
export function decrypt(
  encrypted: string,
  iv: string,
  authTag: string
): string {
  const key = getEncryptionKey();

  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
