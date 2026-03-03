import { eq } from "drizzle-orm";
import http from "node:http";
import https from "node:https";
import { db } from "@/lib/db";
import { secrets } from "@/lib/db/schema";
import { decrypt } from "@/lib/crypto/secrets";
import type { ServiceFetchOptions, ServiceResponse } from "./types";

// Homelab services commonly use self-signed certificates.
// This agent skips TLS verification for all outbound HTTPS requests.
const tlsSkipAgent = new https.Agent({ rejectUnauthorized: false });

export function resolveSecret(secretName: string): string | null {
  try {
    const secret = db
      .select()
      .from(secrets)
      .where(eq(secrets.name, secretName))
      .get();

    if (!secret) return null;

    return decrypt(secret.encryptedValue, secret.iv, secret.authTag);
  } catch {
    return null;
  }
}

/** Minimal response shape returned by fetchWithTls — close to the native Response API. */
export interface TlsResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
  json(): Promise<unknown>;
}

/**
 * Drop-in replacement for `fetch()` that tolerates self-signed certificates.
 * Use this in API routes that make direct fetch calls to homelab services.
 */
export async function fetchWithTls(
  url: string | URL,
  init?: RequestInit
): Promise<TlsResponse> {
  const urlStr = url.toString();
  const method = init?.method ?? "GET";
  const headers: Record<string, string> = {};
  if (init?.headers) {
    const h = init.headers;
    if (h instanceof Headers) {
      h.forEach((v, k) => { headers[k] = v; });
    } else if (Array.isArray(h)) {
      for (const [k, v] of h) headers[k] = v;
    } else {
      Object.assign(headers, h);
    }
  }

  const raw = await serviceFetch(urlStr, {
    method,
    headers,
    body: typeof init?.body === "string" ? init.body : undefined,
    timeout: 10_000,
  });

  const bodyText = raw.body;
  return {
    ok: raw.status >= 200 && raw.status < 300,
    status: raw.status,
    statusText: raw.statusText,
    headers: {
      get(name: string) {
        const lower = name.toLowerCase();
        return raw.headers[lower] ?? null;
      },
    },
    text: async () => bodyText,
    json: async () => JSON.parse(bodyText),
  };
}

/**
 * Make an HTTP/HTTPS request that tolerates self-signed certificates.
 * Returns { status, body, headers, statusText } or throws on network/timeout errors.
 */
function serviceFetch(
  url: string,
  options: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    timeout: number;
  }
): Promise<{ status: number; statusText: string; body: string; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === "https:";
    const transport = isHttps ? https : http;

    const req = transport.request(
      parsed,
      {
        method: options.method,
        headers: options.headers,
        timeout: options.timeout,
        ...(isHttps ? { agent: tlsSkipAgent } : {}),
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const resHeaders: Record<string, string> = {};
          for (const [k, v] of Object.entries(res.headers)) {
            if (typeof v === "string") resHeaders[k] = v;
            else if (Array.isArray(v)) resHeaders[k] = v.join(", ");
          }
          resolve({
            status: res.statusCode ?? 0,
            statusText: res.statusMessage ?? "",
            body: Buffer.concat(chunks).toString("utf-8"),
            headers: resHeaders,
          });
        });
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Service request timed out"));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

export async function fetchService<T>(
  options: ServiceFetchOptions
): Promise<ServiceResponse<T>> {
  const {
    baseUrl,
    apiKey,
    endpoint,
    authType,
    method = "GET",
    body,
    timeout = 10_000,
    queryParams,
  } = options;

  try {
    const url = new URL(endpoint, baseUrl.replace(/\/$/, "") + "/");

    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        url.searchParams.set(key, value);
      }
    }

    const headers: Record<string, string> = {};

    switch (authType) {
      case "header-x-api-key":
        headers["X-Api-Key"] = apiKey;
        break;
      case "header-x-plex-token":
        headers["X-Plex-Token"] = apiKey;
        headers["Accept"] = "application/json";
        break;
      case "header-authorization":
        headers["Authorization"] = `MediaBrowser Token="${apiKey}"`;
        break;
      case "query-apikey":
        url.searchParams.set("apikey", apiKey);
        break;
      case "query-auth":
        url.searchParams.set("auth", apiKey);
        break;
      case "header-basic-auth":
        headers["Authorization"] = "Basic " + Buffer.from(apiKey).toString("base64");
        break;
      case "header-bearer":
        headers["Authorization"] = "Bearer " + apiKey;
        break;
      case "header-pve-token":
        headers["Authorization"] = "PVEAPIToken=" + apiKey;
        break;
    }

    let requestBody: string | undefined;
    if (body && method !== "GET") {
      headers["Content-Type"] = "application/json";
      requestBody = JSON.stringify(body);
    }

    const response = await serviceFetch(url.toString(), {
      method,
      headers,
      body: requestBody,
      timeout,
    });

    if (response.status < 200 || response.status >= 300) {
      return { ok: false, error: `Service returned ${response.status}`, status: response.status };
    }

    const data = JSON.parse(response.body) as T;
    return { ok: true, data };
  } catch (error) {
    if (error instanceof Error && error.message === "Service request timed out") {
      return { ok: false, error: "Service request timed out" };
    }
    return { ok: false, error: "Failed to connect to service" };
  }
}

export function getServiceConnection(
  config: Record<string, unknown> | null
): { serviceUrl: string; apiKey: string } | null {
  if (!config) return null;

  const { serviceUrl, secretName } = config;

  if (
    typeof serviceUrl !== "string" ||
    !serviceUrl ||
    typeof secretName !== "string" ||
    !secretName
  ) {
    return null;
  }

  const apiKey = resolveSecret(secretName);
  if (!apiKey) return null;

  return { serviceUrl, apiKey };
}
