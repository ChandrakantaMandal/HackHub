"use client"

import * as React from "react"
import { Search, Users } from "lucide-react"
import { Input } from "@workspace/ui/components/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

interface MockUser {
  id: string
  name: string
  email: string
  role: "PARTICIPANT" | "JUDGE" | "ADMIN"
}

const MOCK_USERS: MockUser[] = [
  {
    id: "u1",
    name: "Asha Rao",
    email: "asha@hackhub.dev",
    role: "PARTICIPANT",
  },
  {
    id: "u2",
    name: "Ben Ortiz",
    email: "ben@hackhub.dev",
    role: "PARTICIPANT",
  },
  { id: "u3", name: "Chen Wei", email: "chen@hackhub.dev", role: "JUDGE" },
  {
    id: "u4",
    name: "Dana Fox",
    email: "dana@hackhub.dev",
    role: "PARTICIPANT",
  },
  { id: "u5", name: "Elle Novak", email: "elle@hackhub.dev", role: "ADMIN" },
  {
    id: "u6",
    name: "Femi Adeyemi",
    email: "femi@hackhub.dev",
    role: "PARTICIPANT",
  },
  { id: "u7", name: "Grace Kim", email: "grace@hackhub.dev", role: "JUDGE" },
  {
    id: "u8",
    name: "Hugo Silva",
    email: "hugo@hackhub.dev",
    role: "PARTICIPANT",
  },
]

function roleBadge(role: MockUser["role"]) {
  if (role === "ADMIN")
    return (
      <Badge
        variant="outline"
        className="border-amber-900/60 text-[10px] text-amber-400"
      >
        ADMIN
      </Badge>
    )
  if (role === "JUDGE")
    return (
      <Badge
        variant="outline"
        className="border-violet-900/60 text-[10px] text-violet-400"
      >
        JUDGE
      </Badge>
    )
  return (
    <Badge
      variant="outline"
      className="border-slate-700 text-[10px] text-slate-400"
    >
      PARTICIPANT
    </Badge>
  )
}

export default function UsersPage() {
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")

  // Simulate a brief load so the skeleton is visible like live pages.
  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(t)
  }, [])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return MOCK_USERS
    return MOCK_USERS.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
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
          <Users className="h-5 w-5 text-violet-400" />
          Users
        </h2>
        <p className="text-sm text-slate-500">
          Directory of participants, judges, and admins (mock data).
        </p>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users…"
          className="border-slate-800 bg-slate-950 pl-9 text-slate-100"
          aria-label="Search users"
        />
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-500">Name</TableHead>
                <TableHead className="text-slate-500">Email</TableHead>
                <TableHead className="text-slate-500">Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id} className="border-slate-800/60">
                  <TableCell className="font-medium text-slate-200">
                    {u.name}
                  </TableCell>
                  <TableCell className="text-slate-400">{u.email}</TableCell>
                  <TableCell>{roleBadge(u.role)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
