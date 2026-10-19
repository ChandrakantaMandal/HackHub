"use client"

import * as React from "react"
import { FolderKanban, Search } from "lucide-react"
import { apiGet, buildQuery } from "@/lib/client"
import type { ShowcaseListItem } from "@/lib/types"
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

export default function ProjectsPage() {
  const [items, setItems] = React.useState<ShowcaseListItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    const query = buildQuery({ search: search.trim() || undefined })
    apiGet<ShowcaseListItem[]>(`/showcase${query}`)
      .then((list) => {
        if (cancelled) return
        setItems(list)
        setError(null)
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [search])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
          <FolderKanban className="h-5 w-5 text-violet-400" />
          Projects
        </h2>
        <p className="text-sm text-slate-500">
          Showcase projects pulled live from the gateway.
        </p>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects…"
          className="border-slate-800 bg-slate-950 pl-9 text-slate-100"
          aria-label="Search projects"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg bg-slate-900" />
          ))}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center">
          <FolderKanban className="mx-auto mb-3 h-8 w-8 text-slate-700" />
          <p className="text-sm text-slate-400">No projects yet.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-500">Title</TableHead>
                  <TableHead className="text-slate-500">Team</TableHead>
                  <TableHead className="text-slate-500">Category</TableHead>
                  <TableHead className="text-right text-slate-500">
                    Likes
                  </TableHead>
                  <TableHead className="text-right text-slate-500">
                    Comments
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="border-slate-800/60">
                    <TableCell className="font-medium text-slate-200">
                      {item.title}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {item.team.name}
                    </TableCell>
                    <TableCell>
                      {item.category ? (
                        <Badge
                          variant="outline"
                          className="border-violet-900/60 text-[10px] text-violet-400"
                        >
                          {item.category}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-slate-300">
                      {item.likes}
                    </TableCell>
                    <TableCell className="text-right text-slate-300">
                      {item.comments}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
