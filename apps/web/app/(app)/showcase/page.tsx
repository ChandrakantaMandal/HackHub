"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Heart, MessageSquare, Search, Lightbulb } from "lucide-react"
import { apiGet, buildQuery } from "@/lib/client"
import { useHydrated } from "@/lib/useHydrated"
import type { ShowcaseListItem, ShowcaseStats } from "@/lib/types"
import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "title", label: "Title A–Z" },
  { value: "likes", label: "Most liked" },
]

export default function ShowcasePage() {
  const hydrated = useHydrated()
  const [items, setItems] = useState<ShowcaseListItem[]>([])
  const [stats, setStats] = useState<ShowcaseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [sort, setSort] = useState("newest")

  useEffect(() => {
    if (!hydrated) return
    let cancelled = false
    setLoading(true)
    const query = buildQuery({
      search: search.trim() || undefined,
      category: category === "all" ? undefined : category,
      sort,
    })
    Promise.all([
      apiGet<ShowcaseListItem[]>(`/showcase${query}`),
      apiGet<ShowcaseStats>("/showcase/stats"),
    ])
      .then(([list, s]) => {
        if (cancelled) return
        setItems(list)
        setStats(s)
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
  }, [hydrated, search, category, sort])

  const categories = Array.from(
    new Set(items.map((i) => i.category).filter((c): c is string => Boolean(c)))
  )

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Projects", value: stats.projects },
            { label: "Likes", value: stats.likes },
            { label: "Comments", value: stats.comments },
          ].map((s) => (
            <Card key={s.label} className="border-slate-800 bg-slate-900/50">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-500">
                  {s.label}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-100">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="border-slate-800 bg-slate-950 pl-9 text-slate-100"
            aria-label="Search projects"
          />
        </div>
        <Select value={category} onValueChange={(v) => setCategory(v ?? "all")}>
          <SelectTrigger className="w-full border-slate-800 bg-slate-950 text-slate-100 sm:w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className="border-slate-800 bg-slate-900">
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v ?? "newest")}>
          <SelectTrigger className="w-full border-slate-800 bg-slate-950 text-slate-100 sm:w-40">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent className="border-slate-800 bg-slate-900">
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl bg-slate-900" />
          ))}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center">
          <Lightbulb className="mx-auto mb-3 h-8 w-8 text-slate-700" />
          <p className="text-sm text-slate-400">
            Nothing here yet. Projects appear in the showcase once submitted.
          </p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link key={item.id} href={`/showcase/${item.id}`}>
              <Card className="h-full border-slate-800 bg-slate-900/50 transition-colors hover:border-violet-900/60">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-slate-100">
                      {item.title}
                    </CardTitle>
                    {item.category && (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-violet-900/60 text-[10px] text-violet-400"
                      >
                        {item.category}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="line-clamp-2 text-slate-500">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs font-medium text-slate-400">
                    {item.team.name}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5" />
                      {item.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {item.comments}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
