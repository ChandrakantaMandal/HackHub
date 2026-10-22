import { create } from "zustand"
import { ApiError, apiGet, apiPost } from "@/lib/client"
import type { CreateHackathonInput, Hackathon } from "@/lib/types"

interface HackathonsState {
  hackathons: Hackathon[]
  loading: boolean
  loadError: string | null
  load: () => Promise<void>
  createHackathon: (payload: CreateHackathonInput) => Promise<Hackathon>
}

export const useHackathonsStore = create<HackathonsState>()((set) => ({
  hackathons: [],
  loading: true,
  loadError: null,
  load: async () => {
    set({ loading: true, loadError: null })
    try {
      const data = await apiGet<Hackathon[]>("/admin/hackathons")
      set({ hackathons: Array.isArray(data) ? data : [], loading: false })
    } catch (err) {
      set({
        loadError:
          err instanceof ApiError ? err.message : "Failed to load hackathons",
        loading: false,
      })
    }
  },
  createHackathon: async (payload) => {
    const created = await apiPost<Hackathon>("/admin/hackathons", payload)
    set((state) => ({ hackathons: [created, ...state.hackathons] }))
    return created
  },
}))
