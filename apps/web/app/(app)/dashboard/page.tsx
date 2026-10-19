"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FolderKanban,
  Lightbulb,
  Users,
} from "lucide-react"
import { apiGet } from "@/lib/client"
import { useHydrated } from "@/lib/useHydrated"
import type { Project, Team } from "@/lib/types"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Progress } from "@workspace/ui/components/progress"
import { Skeleton } from "@workspace/ui/components/skeleton"

function projectProgress(p: Project): number {
  if (p.status === "COMPLETED" || p.status === "WINNER") return 100
  if (!p.tasks || p.tasks.length === 0) return 0
  const done = p.tasks.filter((t) => t.status === "completed").length
  return Math.round((done / p.tasks.length) * 100)
}

export default function DashboardPage() {
  const hydrated = useHydrated()
  const [teams, setTeams] = useState<Team[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hydrated) return
    let cancelled = false
    Promise.all([apiGet<Team[]>("/teams"), apiGet<Project[]>("/projects")])
      .then(([t, p]) => {
        if (cancelled) return
        setTeams(t)
        setProjects(p)
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
  }, [hydrated])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-slate-900" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl bg-slate-900" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-6 text-sm text-red-400">
        {error}
      </div>
    )
  }

  const activeProjects = projects.filter(
    (p) => p.status !== "COMPLETED" && p.status !== "WINNER"
  )
  const allTasks = projects.flatMap((p) => p.tasks ?? [])
  const completedTasks = allTasks.filter((t) => t.status === "completed")
  const avgProgress =
    projects.length > 0
      ? Math.round(
          projects.reduce((sum, p) => sum + projectProgress(p), 0) /
            projects.length
        )
      : 0

  const stats = [
    { label: "Teams", value: teams.length, icon: Users },
    { label: "Projects", value: projects.length, icon: FolderKanban },
    {
      label: "Tasks done",
      value: `${completedTasks.length}/${allTasks.length || 0}`,
      icon: CheckCircle2,
    },
    { label: "Active", value: activeProjects.length, icon: Clock },
  ]

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.label} className="border-slate-800 bg-slate-900/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-slate-400">
                  {s.label}
                </CardDescription>
                <Icon className="h-4 w-4 text-violet-400" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-100">{s.value}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-slate-100">Your projects</CardTitle>
            <CardDescription className="text-slate-500">
              Overall progress across all projects
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {projects.length === 0 && (
              <p className="text-sm text-slate-500">
                No projects yet.{" "}
                <Link href="/teams" className="text-violet-400 hover:underline">
                  Create a team
                </Link>{" "}
                to get started.
              </p>
            )}
            {projects.slice(0, 4).map((p) => (
              <div key={p.id} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/projects/${p.id}`}
                    className="truncate text-sm font-medium text-slate-200 hover:text-violet-300"
                  >
                    {p.title}
                  </Link>
                  <Badge
                    variant="outline"
                    className="shrink-0 border-slate-700 text-[10px] text-slate-400"
                  >
                    {p.status}
                  </Badge>
                </div>
                <Progress
                  value={projectProgress(p)}
                  className="h-1.5 bg-slate-800"
                />
              </div>
            ))}
            {projects.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Average progress</span>
                  <span>{avgProgress}%</span>
                </div>
                <Progress value={avgProgress} className="h-1.5 bg-slate-800" />
              </div>
            )}
            <Button
              render={<Link href="/projects" />}
              variant="ghost"
              size="sm"
              className="text-violet-400 hover:text-violet-300"
            >
              All projects
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-slate-100">Jump back in</CardTitle>
            <CardDescription className="text-slate-500">
              Pick up where you left off
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              render={<Link href="/teams" />}
              variant="outline"
              className="w-full justify-between border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
            >
              <span className="flex items-center">
                <Users className="mr-2 h-4 w-4 text-violet-400" />
                Manage your team
              </span>
              <ArrowRight className="h-4 w-4 text-slate-500" />
            </Button>
            <Button
              render={<Link href="/projects" />}
              variant="outline"
              className="w-full justify-between border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
            >
              <span className="flex items-center">
                <FolderKanban className="mr-2 h-4 w-4 text-violet-400" />
                Work on tasks
              </span>
              <ArrowRight className="h-4 w-4 text-slate-500" />
            </Button>
            <Button
              render={<Link href="/showcase" />}
              variant="outline"
              className="w-full justify-between border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
            >
              <span className="flex items-center">
                <Lightbulb className="mr-2 h-4 w-4 text-violet-400" />
                Browse the showcase
              </span>
              <ArrowRight className="h-4 w-4 text-slate-500" />
            </Button>
            {hydrated && (
              <p className="pt-2 text-xs text-slate-600">
                Pro tip: submit your project before the deadline to appear in
                the showcase.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
