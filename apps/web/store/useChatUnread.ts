import { create } from "zustand"
import { apiGet } from "../lib/client"
import type { ChatUnreadSummary } from "../lib/types"

// Per-conversation unread counts + the total badge for the app sidebar.
// The server is the source of truth (GET /chat/unread); socket "message"
// events bump counts locally so badges update without waiting a refetch.
// clear(room) is optimistic — the server cursor is upserted when the chat
// page joins the room, and the next fetch reconciles.
interface ChatUnreadState {
  total: number
  byRoom: Record<string, number>
  /** Room currently open in the chat UI — never bumps its own badge. */
  activeRoom: string | null
  setActiveRoom: (room: string | null) => void
  fetch: () => Promise<void>
  /** Increment a room's count (incoming message). No-op for the active room
   *  or for messages the user sent themselves. */
  bump: (room: string, senderId?: string, myId?: string | null) => void
  /** Zero a room's count (user opened/focused it). */
  clear: (room: string) => void
}

export const useChatUnread = create<ChatUnreadState>((set, get) => ({
  total: 0,
  byRoom: {},
  activeRoom: null,

  setActiveRoom: (room) => set({ activeRoom: room }),

  fetch: async () => {
    try {
      const data = await apiGet<ChatUnreadSummary>("/chat/unread")
      set({ total: data.total, byRoom: data.byRoom })
    } catch {
      // Not signed in / request failed — keep the last known counts.
    }
  },

  bump: (room, senderId, myId) => {
    if (senderId && myId && senderId === myId) return
    if (get().activeRoom === room) return
    set((s) => {
      const next = (s.byRoom[room] ?? 0) + 1
      return { byRoom: { ...s.byRoom, [room]: next }, total: s.total + 1 }
    })
  },

  clear: (room) =>
    set((s) => {
      const prev = s.byRoom[room] ?? 0
      if (prev === 0) return s
      return {
        byRoom: { ...s.byRoom, [room]: 0 },
        total: Math.max(0, s.total - prev),
      }
    }),
}))

// Polling singleton — desktop + mobile sidebars both mount SidebarNav; only
// one interval should exist. Returns a cleanup no-op for the second caller.
let pollTimer: ReturnType<typeof setInterval> | null = null

export const startUnreadPolling = (): (() => void) => {
  if (pollTimer) return () => {}
  useChatUnread.getState().fetch()
  pollTimer = setInterval(() => useChatUnread.getState().fetch(), 30_000)
  return () => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }
}
