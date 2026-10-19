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
