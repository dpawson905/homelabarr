export type ServiceAuthType =
  | "header-x-api-key"
  | "header-x-plex-token"
  | "header-authorization"
  | "query-apikey"
  | "query-auth"
  | "header-basic-auth"
  | "header-bearer"
  | "header-pve-token";

export interface ServiceFetchOptions {
  baseUrl: string;
  apiKey: string;
  endpoint: string;
  authType: ServiceAuthType;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  timeout?: number;
  queryParams?: Record<string, string>;
}

export type ServiceResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };
