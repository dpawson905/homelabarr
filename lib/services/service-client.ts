import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { secrets } from "@/lib/db/schema";
import { decrypt } from "@/lib/crypto/secrets";
import type { ServiceFetchOptions, ServiceResponse } from "./types";

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

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(timeout),
    };

    if (body && method !== "GET") {
      headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url.toString(), fetchOptions);

    if (!response.ok) {
      return { ok: false, error: `Service returned ${response.status}`, status: response.status };
    }

    const data = (await response.json()) as T;
    return { ok: true, data };
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
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
