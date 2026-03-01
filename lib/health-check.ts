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

interface FetchResult {
  response: Response;
  latency: number;
}

async function attemptFetch(
  url: string,
  method: "HEAD" | "GET",
  timeoutMs: number
): Promise<FetchResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
    });
    clearTimeout(timer);
    return { response, latency: Date.now() - start };
  } catch {
    clearTimeout(timer);
    return null;
  }
}

export async function checkAppHealth(
  url: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<HealthCheckResult> {
  const checkedAt = new Date().toISOString();

  // Try HEAD first (lighter), fall back to GET on network failure
  const fetchResult =
    (await attemptFetch(url, "HEAD", timeoutMs)) ??
    (await attemptFetch(url, "GET", timeoutMs));

  if (!fetchResult) {
    return { status: "offline", latency: 0, statusCode: null, checkedAt };
  }

  const { response, latency } = fetchResult;
  const statusCode = response.status;
  const status = statusCode >= 200 && statusCode < 300 ? "online" : "degraded";
  return { status, latency, statusCode, checkedAt };
}
