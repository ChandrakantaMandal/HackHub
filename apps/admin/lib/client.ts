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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })

  let body: Envelope<T> | null = null
  try {
    body = (await res.json()) as Envelope<T>
  } catch {
    body = null
  }

  if (!res.ok) {
    throw new ApiError(
      body?.message || body?.error || `Request failed (${res.status})`,
      res.status,
      body?.fields
    )
  }

  return (body?.data ?? body) as T
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path)
}

export function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string] => Boolean(entry[1])
  )
  if (entries.length === 0) return ""
  return `?${new URLSearchParams(entries).toString()}`
}
