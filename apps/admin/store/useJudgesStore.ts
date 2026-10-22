import { create } from "zustand"
import { ApiError, apiGet, apiPost } from "@/lib/client"
import type { CreateJudgeInput, JudgeRecord } from "@/lib/types"

interface JudgesState {
  judges: JudgeRecord[]
  loading: boolean
  loadError: string | null
  load: () => Promise<void>
  createJudge: (payload: CreateJudgeInput) => Promise<JudgeRecord>
}

export const useJudgesStore = create<JudgesState>()((set) => ({
  judges: [],
  loading: true,
  loadError: null,
  load: async () => {
    set({ loading: true, loadError: null })
    try {
      const data = await apiGet<JudgeRecord[]>("/admin/judges")
      set({ judges: Array.isArray(data) ? data : [], loading: false })
    } catch (err) {
      set({
        loadError:
          err instanceof ApiError ? err.message : "Failed to load judges",
        loading: false,
      })
    }
  },
  createJudge: async (payload) => {
    const created = await apiPost<JudgeRecord>("/admin/judges", payload)
    set((state) => ({ judges: [created, ...state.judges] }))
    return created
  },
}))
