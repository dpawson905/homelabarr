/**
 * Simple in-process sliding-window rate limiter.
 * Tracks attempts per key (IP address) and rejects when the limit is exceeded.
 * Old entries are cleaned up automatically.
 */

interface RateLimitEntry {
  timestamps: number[]
}

const store = new Map<string, RateLimitEntry>()

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

/** Remove expired entries periodically (every 5 minutes) */
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS)
    if (entry.timestamps.length === 0) store.delete(key)
  }
}, 5 * 60 * 1000).unref()

/**
 * Check if a request should be rate limited.
 * Returns { limited: false } if allowed, or { limited: true, retryAfterSeconds } if blocked.
 */
export function checkRateLimit(key: string): { limited: false } | { limited: true; retryAfterSeconds: number } {
  const now = Date.now()
  let entry = store.get(key)

  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS)

  if (entry.timestamps.length >= MAX_ATTEMPTS) {
    const oldestInWindow = entry.timestamps[0]
    const retryAfterSeconds = Math.ceil((oldestInWindow + WINDOW_MS - now) / 1000)
    return { limited: true, retryAfterSeconds }
  }

  entry.timestamps.push(now)
  return { limited: false }
}
