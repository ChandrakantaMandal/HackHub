"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { apiDelete, apiGet, apiPatch } from "@/lib/client"
import { useHydrated } from "@/lib/useHydrated"
import type { Project, TaskStatus } from "@/lib/types"
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
import { Separator } from "@workspace/ui/components/separator"
import { Skeleton } from "@workspace/ui/components/skeleton"

const statusCycle: TaskStatus[] = ["todo", "in_progress", "completed"]

function nextStatus(s: TaskStatus): TaskStatus {
  const i = statusCycle.indexOf(s)
  return statusCycle[(i + 1) % statusCycle.length] ?? "todo"
}

function TaskIcon({ status }: { status: TaskStatus }) {
  if (status === "completed")
    return <CheckCircle2 className="h-4 w-4 text-emerald-400" />
  if (status === "in_progress")
    return <Clock className="h-4 w-4 text-amber-400" />
  return <Circle className="h-4 w-4 text-slate-600" />
}

function projectProgress(p: Project): number {
  if (p.status === "COMPLETED" || p.status === "WINNER") return 100
  if (!p.tasks || p.tasks.length === 0) return 0
  const done = p.tasks.filter((t) => t.status === "completed").length
  return Math.round((done / p.tasks.length) * 100)
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const hydrated = useHydrated()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await apiGet<Project>(`/projects/${id}`)
      setProject(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load project")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (hydrated) void load()
  }, [hydrated, load])

  const toggleTask = async (taskId: string, current: TaskStatus) => {
    setToggling(taskId)
    const target = nextStatus(current)
    try {
      await apiPatch(`/projects/${id}/tasks/${taskId}`, { status: target })
      setProject((prev) => {
        if (!prev?.tasks) return prev
        return {
          ...prev,
          tasks: prev.tasks.map((t) =>
            t.id === taskId ? { ...t, status: target } : t
          ),
        }
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update task")
    } finally {
      setToggling(null)
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      await apiDelete(`/projects/${id}/tasks/${taskId}`)
      setProject((prev) => {
        if (!prev?.tasks) return prev
        return { ...prev, tasks: prev.tasks.filter((t) => t.id !== taskId) }
      })
      toast.success("Task deleted")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete task")
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-8 w-48 bg-slate-900" />
        <Skeleton className="h-40 rounded-xl bg-slate-900" />
        <Skeleton className="h-64 rounded-xl bg-slate-900" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400">
          {error ?? "Project not found"}
        </div>
        <Button
          variant="ghost"
          className="mt-4 text-slate-400"
          onClick={() => router.push("/projects")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to projects
        </Button>
      </div>
    )
  }

  const progress = projectProgress(project)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-slate-200"
          onClick={() => router.push("/projects")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Projects
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-500 hover:text-red-400"
          aria-label="Delete project"
          onClick={async () => {
            try {
              await apiDelete(`/projects/${id}`)
              toast.success("Project deleted")
              router.push("/projects")
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : "Failed to delete project"
              )
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl text-slate-100">
                {project.title}
              </CardTitle>
              <CardDescription className="mt-1 text-slate-500">
                {project.team?.name && (
                  <Link
                    href="/teams"
                    className="text-violet-400 hover:underline"
                  >
                    {project.team.name}
                  </Link>
                )}
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className="shrink-0 border-slate-700 text-[10px] text-slate-400"
            >
              {project.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {project.description && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-300">
              {project.description}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {project.category && (
              <Badge
                variant="outline"
                className="border-violet-900/60 text-[10px] text-violet-400"
              >
                {project.category}
              </Badge>
            )}
            {project.tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="border-slate-800 text-[10px] text-slate-500"
              >
                {tag}
              </Badge>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5 bg-slate-800" />
          </div>
          {project.submission && (
            <>
              <Separator className="bg-slate-800" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Submission</span>
                <Badge
                  variant="outline"
                  className={
                    project.submission.status === "APPROVED"
                      ? "border-emerald-900/60 text-emerald-400"
                      : project.submission.status === "REJECTED"
                        ? "border-red-900/60 text-red-400"
                        : "border-amber-900/60 text-amber-400"
                  }
                >
                  {project.submission.status}
                </Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-slate-100">Tasks</CardTitle>
          <CardDescription className="text-slate-500">
            Tap a task to cycle its status: todo → in progress → done
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!project.tasks || project.tasks.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">
              No tasks yet. Task creation is coming soon.
            </p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {project.tasks.map((task) => (
                <li key={task.id} className="flex items-center gap-3 py-3">
                  <button
                    onClick={() => void toggleTask(task.id, task.status)}
                    disabled={toggling === task.id}
                    className="flex flex-1 items-center gap-3 text-left disabled:opacity-50"
                    aria-label="Toggle task status"
                  >
                    {toggling === task.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                    ) : (
                      <TaskIcon status={task.status} />
                    )}
                    <div className="min-w-0">
                      <p
                        className={`truncate text-sm ${
                          task.status === "completed"
                            ? "text-slate-500 line-through"
                            : "text-slate-200"
                        }`}
                      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="truncate text-xs text-slate-500">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-600 hover:text-red-400"
                    onClick={() => void deleteTask(task.id)}
                    aria-label="Delete task"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
