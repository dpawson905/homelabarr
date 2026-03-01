// ─── Health Check Utility ────────────────────────────────────────────────────
// Performs HTTP health checks on app URLs and caches results in memory.

export type HealthStatus = "online" | "offline" | "degraded" | "disabled";

export interface HealthCheckResult {
  status: HealthStatus;
  latency: number;
  statusCode: number | null;
  checkedAt: string;
}

// ─── In-Memory Cache ────────────────────────────────────────────────────────

interface CacheEntry {
  result: HealthCheckResult;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

export function getCachedHealth(
  appId: string,
  maxAgeSeconds: number
): HealthCheckResult | null {
  const entry = cache.get(appId);
  if (!entry) return null;

  const ageMs = Date.now() - entry.timestamp;
  if (ageMs > maxAgeSeconds * 1000) return null;

  return entry.result;
}

export function setCachedHealth(appId: string, result: HealthCheckResult): void {
  cache.set(appId, { result, timestamp: Date.now() });
}

// ─── Health Check ───────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 10_000;

export async function checkAppHealth(
  url: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<HealthCheckResult> {
  const checkedAt = new Date().toISOString();

  // Try HEAD first (lighter), fall back to GET
  for (const method of ["HEAD", "GET"] as const) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const start = Date.now();

    try {
      const response = await fetch(url, {
        method,
        signal: controller.signal,
        redirect: "follow",
        // Avoid caching stale results
        cache: "no-store",
      });

      clearTimeout(timer);
      const latency = Date.now() - start;
      const statusCode = response.status;

      if (statusCode >= 200 && statusCode < 300) {
        return { status: "online", latency, statusCode, checkedAt };
      }

      // Server is reachable but returned a non-2xx status
      return { status: "degraded", latency, statusCode, checkedAt };
    } catch (error) {
      clearTimeout(timer);

      // If HEAD failed, try GET before giving up
      if (method === "HEAD") continue;

      // GET also failed -- the service is offline
      const latency = Date.now() - start;
      return { status: "offline", latency, statusCode: null, checkedAt };
    }
  }

  // Unreachable, but TypeScript needs a return
  return { status: "offline", latency: 0, statusCode: null, checkedAt };
}
