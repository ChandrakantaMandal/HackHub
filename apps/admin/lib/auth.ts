"use client"

import * as React from "react"
import { create } from "zustand"

export interface AdminUser {
  email: string
  role?: string
  accessToken?: string
  refreshToken?: string
  sessionId?: string
}

const STORAGE_KEY = "hackhub-admin-user"

function readStoredUser(): AdminUser | null {
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

interface AdminUserState {
  user: AdminUser | null
  hydrated: boolean
  setUser: (user: AdminUser) => void
  clearUser: () => void
  hydrate: () => void
}

export const useAdminUserStore = create<AdminUserState>()((set) => ({
  user: null,
  hydrated: false,
  setUser: (user) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    set({ user })
  },
  clearUser: () => {
    window.localStorage.removeItem(STORAGE_KEY)
    set({ user: null })
  },
  hydrate: () => set({ user: readStoredUser(), hydrated: true }),
}))

export function getAdminUser(): AdminUser | null {
  return readStoredUser()
}

export function setAdminUser(user: AdminUser): void {
  useAdminUserStore.getState().setUser(user)
}

export function clearAdminUser(): void {
  useAdminUserStore.getState().clearUser()
}

export function useAdminUser(): {
  user: AdminUser | null
  hydrated: boolean
} {
  const user = useAdminUserStore((state) => state.user)
  const hydrated = useAdminUserStore((state) => state.hydrated)
  const hydrate = useAdminUserStore((state) => state.hydrate)

  React.useEffect(() => {
    hydrate()
  }, [hydrate])

  return { user, hydrated }
}
