export interface ShowcaseStats {
  projects: number
  likes: number
  comments: number
}

export interface ShowcaseTeam {
  name: string
}

export interface ShowcaseListItem {
  id: string
  title: string
  description: string
  category: string | null
  likes: number
  comments: number
  team: ShowcaseTeam
}

export type UserRole = "PARTICIPANT" | "JUDGE" | "ADMIN"

export interface LoginResult {
  accessToken: string
  refreshToken: string
  sessionId: string
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

export type HackathonStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED"

export interface Hackathon {
  id: string
  name: string
  tagline: string | null
  description: string | null
  guidelines: string | null
  joinCode: string
  allowJoin: boolean
  maxTeamSize: number
  registrationDeadline: string
  startDate: string
  endDate: string
  location: string | null
  status: HackathonStatus
  createdAt: string
  updatedAt: string
}

export interface CreateHackathonInput {
  name: string
  tagline?: string
  description?: string
  guidelines?: string
  allowJoin?: boolean
  maxTeamSize?: number
  registrationDeadline: string
  startDate: string
  endDate: string
  location?: string
  status?: HackathonStatus
}

export interface JudgeRecord {
  id: string
  username: string
  name: string | null
  email: string
  submissions: number
  createdAt: string
}

export interface CreateJudgeInput {
  email: string
  password: string
  name?: string
}
