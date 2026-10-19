export interface User {
  id: string
  accountId: string
  username: string
  name?: string | null
  avatar?: string | null
  bio?: string | null
  role: "PARTICIPANT" | "JUDGE" | "ADMIN"
  createdAt: string
  updatedAt: string
}

export interface Profile {
  id: string
  email: string
  user: User
}

export interface SessionTokens {
  accessToken: string
  refreshToken: string
  sessionId: string
}

export type TeamRole = "OWNER" | "MEMBER"

export interface TeamMember {
  id: string
  teamId: string
  userId: string
  role: TeamRole
  joinedAt: string
  user?: User
}

export interface Team {
  id: string
  name: string
  inviteCode?: string | null
  ownerId: string
  createdAt: string
  updatedAt: string
  members?: TeamMember[]
}

export type ProjectStatus =
  | "DRAFT"
  | "DEVELOPMENT"
  | "SUBMITTED"
  | "COMPLETED"
  | "WINNER"

export type TaskStatus = "todo" | "in_progress" | "completed"

export interface Task {
  id: string
  projectId: string
  title: string
  description?: string | null
  assignedTo?: string | null
  status: TaskStatus
  createdAt: string
  updatedAt: string
}

export type SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED"

export interface Submission {
  id: string
  projectId: string
  githubUrl?: string | null
  liveUrl?: string | null
  documentation?: string | null
  status: SubmissionStatus
  submittedAt?: string | null
  createdAt: string
}

export interface Project {
  id: string
  teamId: string
  title: string
  description: string
  category?: string | null
  tags: string[]
  status: ProjectStatus
  deadline?: string | null
  createdAt: string
  updatedAt: string
  tasks?: Task[]
  submission?: Submission | null
  progress?: number
  team?: {
    id: string
    name: string
    ownerId: string
    owner?: User
    members?: TeamMember[]
  }
}

export interface ShowcaseListItem {
  id: string
  title: string
  description: string
  category?: string | null
  tags: string[]
  team: { id: string; name: string }
  submission: {
    id: string
    status: SubmissionStatus
    submittedAt?: string | null
  }
  likes: number
  comments: number
}

export interface ShowcaseComment {
  id: string
  projectId: string
  message: string
  createdAt: string
  user: {
    id: string
    username: string
    name?: string | null
    avatar?: string | null
  }
}

export interface ShowcaseDetail extends Omit<
  ShowcaseListItem,
  "team" | "submission"
> {
  team: ShowcaseListItem["team"] & {
    owner: {
      id: string
      username: string
      name?: string | null
      avatar?: string | null
    }
  }
  submission: Submission & {
    githubUrl?: string | null
    liveUrl?: string | null
  }
  commentsList: ShowcaseComment[]
}

export interface ShowcaseStats {
  projects: number
  likes: number
  comments: number
}
