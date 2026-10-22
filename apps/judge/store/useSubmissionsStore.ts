import { create } from "zustand"
import { ApiError, apiDelete, apiGet, apiPost } from "@/lib/client"
import type {
  BadgeRecord,
  JudgeScoreRecord,
  ScoreInput,
  SubmissionRecord,
} from "@/lib/types"

interface SubmissionsState {
  submissions: SubmissionRecord[]
  loading: boolean
  loadError: string | null
  load: () => Promise<void>
  scoreSubmission: (
    submissionId: string,
    scores: ScoreInput
  ) => Promise<JudgeScoreRecord>
  awardBadge: (
    submissionId: string,
    name: string,
    description?: string
  ) => Promise<BadgeRecord>
  revokeBadge: (submissionId: string, badgeId: string) => Promise<void>
}

function upsertScore(
  submissions: SubmissionRecord[],
  submissionId: string,
  score: JudgeScoreRecord
): SubmissionRecord[] {
  return submissions.map((submission) => {
    if (submission.id !== submissionId) return submission
    const judgeScores = submission.judgeScores.some((s) => s.id === score.id)
      ? submission.judgeScores.map((s) => (s.id === score.id ? score : s))
      : [
          ...submission.judgeScores.filter((s) => s.judgeId !== score.judgeId),
          score,
        ]
    return { ...submission, judgeScores }
  })
}

export const useSubmissionsStore = create<SubmissionsState>()((set) => ({
  submissions: [],
  loading: true,
  loadError: null,
  load: async () => {
    set({ loading: true, loadError: null })
    try {
      const data = await apiGet<SubmissionRecord[]>("/judges/submissions")
      set({ submissions: Array.isArray(data) ? data : [], loading: false })
    } catch (err) {
      set({
        loadError:
          err instanceof ApiError ? err.message : "Failed to load submissions",
        loading: false,
      })
    }
  },
  scoreSubmission: async (submissionId, scores) => {
    const score = await apiPost<JudgeScoreRecord>(
      `/judges/submissions/${submissionId}/score`,
      scores
    )
    set((state) => ({
      submissions: upsertScore(state.submissions, submissionId, score),
    }))
    return score
  },
  awardBadge: async (submissionId, name, description) => {
    const badge = await apiPost<BadgeRecord>(
      `/judges/submissions/${submissionId}/badge`,
      description ? { name, description } : { name }
    )
    set((state) => ({
      submissions: state.submissions.map((submission) =>
        submission.id === submissionId
          ? { ...submission, badges: [...submission.badges, badge] }
          : submission
      ),
    }))
    return badge
  },
  revokeBadge: async (submissionId, badgeId) => {
    await apiDelete<{ id: string }>(
      `/judges/submissions/${submissionId}/badge/${badgeId}`
    )
    set((state) => ({
      submissions: state.submissions.map((submission) =>
        submission.id === submissionId
          ? {
              ...submission,
              badges: submission.badges.filter((b) => b.id !== badgeId),
            }
          : submission
      ),
    }))
  },
}))
