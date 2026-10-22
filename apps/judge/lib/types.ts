export type UserRole = "PARTICIPANT" | "JUDGE" | "ADMIN"

export interface LoginResult {
  accessToken: string
  refreshToken: string
  sessionId: string
  judge: { id: string }
}

export interface ProfileUser {
  id: string
  username: string
  name?: string | null
  role: UserRole
}

export interface ProfileResult {
  id: string
  email: string
  user: ProfileUser | null
}

export type SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED"

export interface SubmissionTeam {
  id: string
  name: string
  owner: { id: string; username: string; name: string }
}

export interface SubmissionProject {
  id: string
  title: string
  description: string
  category: string | null
  status: string
  team: SubmissionTeam
}

export interface JudgeScoreRecord {
  id: string
  submissionId: string
  judgeId: string
  innovation: number
  technical: number
  design: number
  presentation: number
  overall: number
  finalScore: number
  feedback: string | null
  createdAt: string
  updatedAt: string
}

export interface BadgeRecord {
  id: string
  submissionId: string
  awardedById: string
  name: string
  description: string | null
  createdAt: string
}

export interface SubmissionRecord {
  id: string
  projectId: string
  project: SubmissionProject
  githubUrl: string | null
  liveUrl: string | null
  documentation: string | null
  status: SubmissionStatus
  submittedAt: string | null
  createdAt: string
  judgeScores: JudgeScoreRecord[]
  badges: BadgeRecord[]
}

export interface ScoreInput {
  innovation: number
  technical: number
  design: number
  presentation: number
  overall: number
  feedback?: string
}

export interface LeaderboardEntry {
  rank: number
  projectId: string
  title: string
  averageScore: number
  scoreCount: number
}
