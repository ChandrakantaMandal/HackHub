"use client"

import * as React from "react"
import { Users, Search } from "lucide-react"
import { Input } from "@workspace/ui/components/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

interface MockTeam {
  id: string
  name: string
  members: number
  project: string | null
}

const MOCK_TEAMS: MockTeam[] = [
  { id: "t1", name: "Neural Nomads", members: 4, project: "MindBridge" },
  { id: "t2", name: "Pixel Pioneers", members: 3, project: "SnapCanvas" },
  { id: "t3", name: "Quantum Quill", members: 5, project: "EcoLedger" },
  { id: "t4", name: "Cloud Collective", members: 2, project: null },
  { id: "t5", name: "Data Drifters", members: 4, project: "PulseAnalytics" },
  { id: "t6", name: "Syntax Squad", members: 3, project: "CodeMentor AI" },
]

export default function TeamsPage() {
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")

  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(t)
  }, [])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return MOCK_TEAMS
    return MOCK_TEAMS.filter((t) => t.name.toLowerCase().includes(q))
  }, [search])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-xs rounded-lg bg-slate-900" />
        <Skeleton className="h-64 rounded-xl bg-slate-900" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
          <Users className="h-5 w-5 text-violet-400" />
          Teams
        </h2>
        <p className="text-sm text-slate-500">
          Registered teams and their linked projects (mock data).
        </p>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teams…"
          className="border-slate-800 bg-slate-950 pl-9 text-slate-100"
          aria-label="Search teams"
        />
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-500">Team</TableHead>
                <TableHead className="text-slate-500">Members</TableHead>
                <TableHead className="text-slate-500">Project</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id} className="border-slate-800/60">
                  <TableCell className="font-medium text-slate-200">
                    {t.name}
                  </TableCell>
                  <TableCell className="text-slate-400">{t.members}</TableCell>
                  <TableCell className="text-slate-400">
                    {t.project ?? (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
