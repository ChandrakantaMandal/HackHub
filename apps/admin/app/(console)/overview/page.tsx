"use client"

import * as React from "react"
import { Heart, MessageSquare, FolderKanban, Activity } from "lucide-react"
import { apiGet } from "@/lib/client"
import type { ShowcaseStats } from "@/lib/types"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

export default function OverviewPage() {
  const [stats, setStats] = React.useState<ShowcaseStats | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    apiGet<ShowcaseStats>("/showcase/stats")
      .then((s) => {
        if (cancelled) return
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
  }, [])

  const cards = [
    { label: "Projects", value: stats?.projects, icon: FolderKanban },
    { label: "Likes", value: stats?.likes, icon: Heart },
    { label: "Comments", value: stats?.comments, icon: MessageSquare },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Overview</h2>
        <p className="text-sm text-slate-500">
          Live showcase metrics from the gateway.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-slate-900" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {cards.map((c) => {
            const Icon = c.icon
            return (
              <Card key={c.label} className="border-slate-800 bg-slate-900/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardDescription className="text-slate-500">
                    {c.label}
                  </CardDescription>
                  <Icon className="h-4 w-4 text-violet-400" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-100">
                    {c.value ?? "—"}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Activity className="h-4 w-4 text-violet-400" />
            System
          </CardTitle>
          <CardDescription className="text-slate-500">
            Gateway status
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-400">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Connected to gateway
          </span>
        </CardContent>
      </Card>
    </div>
  )
}
