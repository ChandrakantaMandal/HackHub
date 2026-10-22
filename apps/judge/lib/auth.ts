"use client"

import * as React from "react"
import { create } from "zustand"

export interface JudgeUser {
  email: string
  role?: string
  judgeId?: string
  accessToken?: string
  refreshToken?: string
  sessionId?: string
}

const STORAGE_KEY = "hackhub-judge-user"

function readStoredUser(): JudgeUser | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as JudgeUser
    if (parsed && typeof parsed.email === "string") return parsed
    return null
  } catch {
    return null
  }
}

interface JudgeUserState {
  user: JudgeUser | null
  hydrated: boolean
  setUser: (user: JudgeUser) => void
  clearUser: () => void
  hydrate: () => void
}

export const useJudgeUserStore = create<JudgeUserState>()((set) => ({
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

export function getJudgeUser(): JudgeUser | null {
  return readStoredUser()
}

export function setJudgeUser(user: JudgeUser): void {
  useJudgeUserStore.getState().setUser(user)
}

export function clearJudgeUser(): void {
  useJudgeUserStore.getState().clearUser()
}

export function useJudgeUser(): {
  user: JudgeUser | null
  hydrated: boolean
} {
  const user = useJudgeUserStore((state) => state.user)
  const hydrated = useJudgeUserStore((state) => state.hydrated)
  const hydrate = useJudgeUserStore((state) => state.hydrate)

  React.useEffect(() => {
    hydrate()
  }, [hydrate])

  return { user, hydrated }
}
