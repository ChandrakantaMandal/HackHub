"use client"

import * as React from "react"
import { RefreshCw, Search, Trophy } from "lucide-react"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { useLeaderboardStore } from "@/store/useLeaderboardStore"

function rankClasses(rank: number): string {
  switch (rank) {
    case 1:
      return "border-amber-500/40 bg-amber-500/15 text-amber-300"
    case 2:
      return "border-slate-400/40 bg-slate-400/15 text-slate-300"
    case 3:
      return "border-orange-600/40 bg-orange-600/15 text-orange-400"
    default:
      return "border-slate-700 text-slate-500"
  }
}

export default function LeaderboardPage() {
  const { entries, loading, loadError, load } = useLeaderboardStore()
  const [search, setSearch] = React.useState("")

  React.useEffect(() => {
    void load()
  }, [load])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return entries
    return entries.filter((entry) => entry.title.toLowerCase().includes(q))
  }, [entries, search])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-xs rounded-lg bg-slate-900" />
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl bg-slate-900" />
          ))}
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <Trophy className="h-5 w-5 text-violet-400" />
            Leaderboard
          </h2>
        </div>
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-sm text-red-400">{loadError}</p>
            <Button
              onClick={() => void load()}
              variant="outline"
              className="border-slate-800 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-slate-100"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <Trophy className="h-5 w-5 text-violet-400" />
            Leaderboard
          </h2>
          <p className="text-sm text-slate-500">
            Projects ranked by average judge score.
          </p>
        </div>
        <Button
          onClick={() => void load()}
          variant="outline"
          className="border-slate-800 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-slate-100"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects…"
          className="border-slate-800 bg-slate-950 pl-9 text-slate-100"
          aria-label="Search leaderboard"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Trophy className="h-8 w-8 text-slate-600" />
            <p className="text-sm text-slate-400">
              {entries.length === 0
                ? "No scored projects yet."
                : "No projects match your search."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-xs tracking-wide text-slate-500 uppercase">
                    <th className="px-5 py-3 font-medium">Rank</th>
                    <th className="px-5 py-3 font-medium">Project</th>
                    <th className="px-5 py-3 text-right font-medium">
                      Average score
                    </th>
                    <th className="px-5 py-3 text-right font-medium">Votes</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr
                      key={entry.projectId}
                      className="border-b border-slate-800/60 transition-colors last:border-b-0 hover:bg-slate-800/30"
                    >
                      <td className="px-5 py-3">
                        <Badge
                          variant="outline"
                          className={`min-w-8 justify-center text-center font-bold ${rankClasses(entry.rank)}`}
                        >
                          {entry.rank}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-200">
                        {entry.title}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-violet-400">
                        {Math.round(entry.averageScore * 10) / 10}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-500">
                        {entry.scoreCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
