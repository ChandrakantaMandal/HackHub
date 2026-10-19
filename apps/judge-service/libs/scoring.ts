export interface ScoreCriteria {
  innovation: number
  technical: number
  design: number
  presentation: number
  overall: number
}

const WEIGHTS: ScoreCriteria = {
  innovation: 0.3,
  technical: 0.25,
  design: 0.2,
  presentation: 0.1,
  overall: 0.15,
}

export const computeFinalScore = (scores: ScoreCriteria): number => {
  const weighted =
    scores.innovation * WEIGHTS.innovation +
    scores.technical * WEIGHTS.technical +
    scores.design * WEIGHTS.design +
    scores.presentation * WEIGHTS.presentation +
    scores.overall * WEIGHTS.overall

  return Math.round(weighted * 10)
}

export interface LeaderboardRow {
  projectId: string
  title: string
  finalScore: number
}

export interface LeaderboardEntry {
  rank: number
  projectId: string
  title: string
  averageScore: number
  scoreCount: number
}

export const rankProjects = (rows: LeaderboardRow[]): LeaderboardEntry[] => {
  const groups = new Map<
    string,
    { title: string; total: number; count: number }
  >()

  for (const row of rows) {
    const group = groups.get(row.projectId)
    if (group) {
      group.total += row.finalScore
      group.count += 1
    } else {
      groups.set(row.projectId, {
        title: row.title,
        total: row.finalScore,
        count: 1,
      })
    }
  }

  const entries = Array.from(groups, ([projectId, group]) => ({
    projectId,
    title: group.title,
    averageScore: Math.round(group.total / group.count),
    scoreCount: group.count,
  }))

  entries.sort(
    (a, b) =>
      b.averageScore - a.averageScore ||
      b.scoreCount - a.scoreCount ||
      a.title.localeCompare(b.title)
  )

  return entries.map((entry, index) => ({ rank: index + 1, ...entry }))
}
