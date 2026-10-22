import axios from "axios"
import { clearAdminUser, getAdminUser, setAdminUser } from "./auth"

export class ApiError extends Error {
  status: number
  fields?: Record<string, string>

  constructor(
    message: string,
    status: number,
    fields?: Record<string, string>
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.fields = fields
  }
}

interface Envelope<T> {
  success?: boolean
  data?: T
  message?: string
  error?: string
  fields?: Record<string, string>
}

export interface RequestOptions {
  /** Explicit bearer token; skips stored session and refresh handling. */
  token?: string
  /** Do not attach the stored session and never refresh or redirect. */
  skipAuth?: boolean
}

interface RefreshedSession {
  accessToken: string
  refreshToken: string
}

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
})

api.interceptors.response.use(
  (response) => {
    const body = response.data as Envelope<unknown> | null | undefined
    response.data = body?.data ?? body
    return response
  },
  (error: unknown) => Promise.reject(normalizeError(error))
)

function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as Envelope<unknown> | undefined
    return new ApiError(
      body?.message ||
        body?.error ||
        error.message ||
        "An unexpected error occurred",
      error.response?.status ?? 0,
      body?.fields
    )
  }
  return new ApiError(
    error instanceof Error && error.message
      ? error.message
      : "An unexpected error occurred",
    0
  )
}

async function refreshSession(): Promise<RefreshedSession | null> {
  const stored = getAdminUser()
  if (!stored?.refreshToken || !stored?.sessionId) return null

  try {
    // Plain axios: bypasses this module's interceptors to avoid recursion.
    const res = await axios.post<Envelope<RefreshedSession>>(
      "/api/auth/refresh",
      {
        refreshToken: stored.refreshToken,
        sessionId: stored.sessionId,
      },
      { headers: { "Content-Type": "application/json" } }
    )
    const body = res.data
    const data = body?.data ?? (body as unknown as RefreshedSession | undefined)
    if (!data?.accessToken || !data?.refreshToken) return null

    setAdminUser({
      ...stored,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    })
    return data
  } catch {
    return null
  }
}

let refreshInFlight: Promise<RefreshedSession | null> | null = null

function dedupedRefresh(): Promise<RefreshedSession | null> {
  if (!refreshInFlight) {
    refreshInFlight = refreshSession().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

async function request<T>(
  path: string,
  config: { method: "GET" | "POST"; data?: unknown },
  opts?: RequestOptions,
  allowRetry = true
): Promise<T> {
  const headers: Record<string, string> = {}
  if (opts?.token) {
    headers.Authorization = `Bearer ${opts.token}`
  } else if (!opts?.skipAuth) {
    const stored = getAdminUser()
    if (stored?.accessToken)
      headers.Authorization = `Bearer ${stored.accessToken}`
  }

  try {
    const res = await api.request<T>({
      url: path,
      method: config.method,
      data: config.data,
      headers,
    })
    return res.data
  } catch (error) {
    const apiError = normalizeError(error)
    const canRecover =
      apiError.status === 401 && allowRetry && !opts?.token && !opts?.skipAuth

    if (canRecover) {
      const refreshed = await dedupedRefresh()
      if (refreshed) {
        return request<T>(path, config, { token: refreshed.accessToken }, false)
      }
      clearAdminUser()
      if (typeof window !== "undefined") {
        window.location.assign("/login")
      }
    }

    throw apiError
  }
}

export function apiGet<T>(path: string, opts?: RequestOptions): Promise<T> {
  return request<T>(path, { method: "GET" }, opts)
}

export function apiPost<T>(
  path: string,
  body?: unknown,
  opts?: RequestOptions
): Promise<T> {
  return request<T>(
    path,
    { method: "POST", data: body === undefined ? undefined : body },
    opts
  )
}

export function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string] => Boolean(entry[1])
  )
  if (entries.length === 0) return ""
  return `?${new URLSearchParams(entries).toString()}`
}
