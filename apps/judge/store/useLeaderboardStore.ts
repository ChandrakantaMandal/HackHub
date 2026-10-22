import { create } from "zustand"
import { ApiError, apiGet } from "@/lib/client"
import type { LeaderboardEntry } from "@/lib/types"

interface LeaderboardState {
  entries: LeaderboardEntry[]
  loading: boolean
  loadError: string | null
  load: () => Promise<void>
}

export const useLeaderboardStore = create<LeaderboardState>()((set) => ({
  entries: [],
  loading: true,
  loadError: null,
  load: async () => {
    set({ loading: true, loadError: null })
    try {
      const data = await apiGet<LeaderboardEntry[]>("/judges/leaderboard")
      set({ entries: Array.isArray(data) ? data : [], loading: false })
    } catch (err) {
      set({
        loadError:
          err instanceof ApiError ? err.message : "Failed to load leaderboard",
        loading: false,
      })
    }
  },
}))
