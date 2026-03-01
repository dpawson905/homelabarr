---
plan: 08-01
status: complete
---

## Summary

Built the shared integration infrastructure for external service communication. This provides a reusable service client layer that resolves API keys from the encrypted secrets table and makes authenticated HTTP requests to external services (Sonarr, Radarr, Plex, Jellyfin, etc.). The client supports four authentication strategies (X-Api-Key header, X-Plex-Token header, MediaBrowser Authorization header, and query-string apikey) with configurable timeouts, error handling, and typed responses.

## Files Created

- lib/services/types.ts — Shared TypeScript types for service auth strategies, connection config, fetch options, and discriminated union response type
- lib/services/service-client.ts — Service client with three functions: resolveSecret (synchronous secret lookup and decryption), fetchService (authenticated HTTP fetch with timeout and error wrapping), and getServiceConnection (config validation and secret resolution helper)

## Verification

- TypeScript compilation: pass
