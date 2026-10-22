import { useAppStore } from "@/store/useAppStore"

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8080"

export class ApiError extends Error {
  status: number
  fields?: Record<string, string[]>

  constructor(
    message: string,
    status: number,
    fields?: Record<string, string[]>
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.fields = fields
  }
}

interface RequestOptions {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  body?: unknown
  auth?: boolean
}

async function tryRefreshTokens(): Promise<boolean> {
  const { refreshToken, sessionId } = useAppStore.getState()
  if (!refreshToken || !sessionId) return false
  try {
    const res = await fetch(`${GATEWAY_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken, sessionId }),
    })
    const body = (await res.json().catch(() => null)) as {
      success?: boolean
      data?: { accessToken?: string; refreshToken?: string }
    } | null
    if (!res.ok || !body?.success || !body.data?.accessToken) return false
    useAppStore.setState({
      accessToken: body.data.accessToken,
      refreshToken: body.data.refreshToken ?? null,
    })
    return true
  } catch {
    return false
  }
}

async function request<T>(
  path: string,
  options: RequestOptions,
  isRetry = false
): Promise<T> {
  const { accessToken } = useAppStore.getState()

  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers["Content-Type"] = "application/json"
  if (options.auth !== false && accessToken)
    headers.Authorization = `Bearer ${accessToken}`

  const res = await fetch(`${GATEWAY_URL}/api${path}`, {
    method: options.method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (res.status === 401 && options.auth !== false && !isRetry) {
    const refreshed = await tryRefreshTokens()
    if (refreshed) {
      return request<T>(path, options, true)
    }
    useAppStore.setState({
      accessToken: null,
      refreshToken: null,
      sessionId: null,
      user: null,
    })
  }

  const body = (await res.json().catch(() => null)) as {
    success?: boolean
    data?: T
    message?: string
    error?: string
    fields?: Record<string, string[]>
  } | null

  if (!res.ok || !body?.success) {
    const message =
      body?.message || body?.error || `Request failed (${res.status})`
    throw new ApiError(message, res.status, body?.fields)
  }

  return body.data as T
}

export function apiGet<T>(path: string, auth = true): Promise<T> {
  return request<T>(path, { method: "GET", auth })
}

export function apiPost<T>(
  path: string,
  body?: unknown,
  auth = true
): Promise<T> {
  return request<T>(path, { method: "POST", body, auth })
}

export function apiPatch<T>(
  path: string,
  body?: unknown,
  auth = true
): Promise<T> {
  return request<T>(path, { method: "PATCH", body, auth })
}

export function apiDelete<T>(path: string, auth = true): Promise<T> {
  return request<T>(path, { method: "DELETE", auth })
}

export function buildQuery(
  params: Record<string, string | number | undefined>
): string {
  const q = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") q.set(key, String(value))
  }
  const s = q.toString()
  return s ? `?${s}` : ""
}
