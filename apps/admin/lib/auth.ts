"use client"

import * as React from "react"

export interface AdminUser {
  email: string
}

const STORAGE_KEY = "hackhub-admin-user"

export function getAdminUser(): AdminUser | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AdminUser
    if (parsed && typeof parsed.email === "string") return parsed
    return null
  } catch {
    return null
  }
}

export function setAdminUser(user: AdminUser): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
}

export function clearAdminUser(): void {
  window.localStorage.removeItem(STORAGE_KEY)
}

export function useAdminUser(): {
  user: AdminUser | null
  hydrated: boolean
} {
  const [user, setUser] = React.useState<AdminUser | null>(null)
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    setUser(getAdminUser())
    setHydrated(true)
  }, [])

  return { user, hydrated }
}
