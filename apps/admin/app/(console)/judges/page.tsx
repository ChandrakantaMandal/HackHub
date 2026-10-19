"use client"

import * as React from "react"
import { Gavel, Search } from "lucide-react"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/badge"
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

interface MockJudge {
  id: string
  name: string
  email: string
  organization: string
  submissions: number
}

const MOCK_JUDGES: MockJudge[] = [
  {
    id: "j1",
    name: "Chen Wei",
    email: "chen@hackhub.dev",
    organization: "TechStars",
    submissions: 12,
  },
  {
    id: "j2",
    name: "Grace Kim",
    email: "grace@hackhub.dev",
    organization: "Sequoia Scout",
    submissions: 8,
  },
  {
    id: "j3",
    name: "Marco Bianchi",
    email: "marco@hackhub.dev",
    organization: "Local University",
    submissions: 15,
  },
  {
    id: "j4",
    name: "Priya Nair",
    email: "priya@hackhub.dev",
    organization: "Google for Startups",
    submissions: 5,
  },
]

export default function JudgesPage() {
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")

  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(t)
  }, [])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return MOCK_JUDGES
    return MOCK_JUDGES.filter(
      (j) =>
        j.name.toLowerCase().includes(q) ||
        j.organization.toLowerCase().includes(q)
    )
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
          <Gavel className="h-5 w-5 text-violet-400" />
          Judges
        </h2>
        <p className="text-sm text-slate-500">
          Registered judges and scoring activity (mock data).
        </p>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search judges…"
          className="border-slate-800 bg-slate-950 pl-9 text-slate-100"
          aria-label="Search judges"
        />
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-500">Name</TableHead>
                <TableHead className="text-slate-500">Organization</TableHead>
                <TableHead className="text-slate-500">Email</TableHead>
                <TableHead className="text-right text-slate-500">
                  Scored
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((j) => (
                <TableRow key={j.id} className="border-slate-800/60">
                  <TableCell className="font-medium text-slate-200">
                    {j.name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="border-violet-900/60 text-[10px] text-violet-400"
                    >
                      {j.organization}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-400">{j.email}</TableCell>
                  <TableCell className="text-right text-slate-300">
                    {j.submissions}
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
