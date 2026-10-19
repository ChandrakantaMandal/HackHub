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

async function request<T>(path: string, options: RequestOptions): Promise<T> {
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
