import WebSocket from "ws"

interface JsonRpcRequest {
  jsonrpc: "2.0"
  id: number
  method: string
  params?: unknown[]
}

interface JsonRpcResponse {
  jsonrpc: "2.0"
  id: number
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

/**
 * Opens a WebSocket to TrueNAS, authenticates with an API key,
 * runs the given JSON-RPC calls, and closes the connection.
 *
 * The WebSocket endpoint is `ws(s)://<host>/api/current`.
 * Self-signed certificates are tolerated (rejectUnauthorized: false).
 */
export async function truenasRpc<T extends Record<string, unknown>>(
  serviceUrl: string,
  apiKey: string,
  calls: { method: string; params?: unknown[] }[],
  timeout = 15_000
): Promise<{ ok: true; results: Map<string, unknown> } | { ok: false; error: string }> {
  // Build the WebSocket URL
  const base = serviceUrl.replace(/\/+$/, "")
  const wsUrl = base
    .replace(/^https:\/\//, "wss://")
    .replace(/^http:\/\//, "ws://")
    + "/api/current"

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      ws.close()
      resolve({ ok: false, error: "TrueNAS WebSocket connection timed out" })
    }, timeout)

    const ws = new WebSocket(wsUrl, { rejectUnauthorized: false })

    let nextId = 1
    const pending = new Map<number, { method: string; resolve: (val: unknown) => void; reject: (err: Error) => void }>()
    let authenticated = false

    function send(method: string, params?: unknown[]): Promise<unknown> {
      return new Promise((res, rej) => {
        const id = nextId++
        const req: JsonRpcRequest = { jsonrpc: "2.0", id, method, params: params ?? [] }
        pending.set(id, { method, resolve: res, reject: rej })
        ws.send(JSON.stringify(req))
      })
    }

    ws.on("open", async () => {
      try {
        // Authenticate with API key
        const authResult = await send("auth.login_with_api_key", [apiKey])
        if (!authResult) {
          clearTimeout(timer)
          ws.close()
          resolve({ ok: false, error: "TrueNAS authentication failed" })
          return
        }
        authenticated = true

        // Run all calls in parallel
        const entries = await Promise.all(
          calls.map(async (call) => {
            const result = await send(call.method, call.params)
            return [call.method, result] as [string, unknown]
          })
        )

        clearTimeout(timer)
        ws.close()
        resolve({ ok: true, results: new Map(entries) })
      } catch (err) {
        clearTimeout(timer)
        ws.close()
        resolve({
          ok: false,
          error: err instanceof Error ? err.message : "RPC call failed",
        })
      }
    })

    ws.on("message", (data) => {
      try {
        const msg: JsonRpcResponse = JSON.parse(data.toString())
        const handler = pending.get(msg.id)
        if (!handler) return
        pending.delete(msg.id)

        if (msg.error) {
          handler.reject(new Error(msg.error.message))
        } else {
          handler.resolve(msg.result)
        }
      } catch {
        // Ignore non-JSON messages (e.g. event notifications)
      }
    })

    ws.on("error", (err) => {
      clearTimeout(timer)
      for (const handler of pending.values()) {
        handler.reject(err instanceof Error ? err : new Error("WebSocket error"))
      }
      pending.clear()
      resolve({ ok: false, error: err instanceof Error ? err.message : "WebSocket error" })
    })

    ws.on("close", () => {
      clearTimeout(timer)
      if (!authenticated) {
        resolve({ ok: false, error: "WebSocket closed before authentication" })
      }
    })
  })
}
