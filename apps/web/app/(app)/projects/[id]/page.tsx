"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Rocket,
  Trash2,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/client"
import { useHydrated } from "@/lib/useHydrated"
import { useAppStore } from "@/store/useAppStore"
import type { Project, Task, TaskStatus } from "@/lib/types"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Progress } from "@workspace/ui/components/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
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
  const currentUser = useAppStore((s) => s.user)
  const currentUserId = currentUser?.user?.id ?? null
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [newAssignee, setNewAssignee] = useState("")
  const [reassigning, setReassigning] = useState<string | null>(null)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [githubUrl, setGithubUrl] = useState("")
  const [liveDemoUrl, setLiveDemoUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const assigneeOptions = useMemo(() => {
    if (!project?.team) return []
    const opts: { value: string; label: string }[] = []
    const seen = new Set<string>()
    if (project.team.ownerId) {
      seen.add(project.team.ownerId)
      const owner = project.team.owner
      opts.push({
        value: project.team.ownerId,
        label: `${owner?.name || owner?.username || "Leader"} (leader)`,
      })
    }
    for (const m of project.team.members ?? []) {
      if (seen.has(m.userId)) continue
      seen.add(m.userId)
      opts.push({
        value: m.userId,
        label: m.user?.name || m.user?.username || m.userId.slice(0, 8),
      })
    }
    return opts
  }, [project?.team])

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
      const result = await apiPatch<{ task: Task; progress: number }>(
        `/projects/tasks/${taskId}`,
        { status: target }
      )
      setProject((prev) => {
        if (!prev?.tasks) return prev
        return {
          ...prev,
          progress: result.progress,
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
      const result = await apiDelete<{ progress: number }>(
        `/projects/tasks/${taskId}`
      )
      setProject((prev) => {
        if (!prev?.tasks) return prev
        return {
          ...prev,
          progress: result.progress,
          tasks: prev.tasks.filter((t) => t.id !== taskId),
        }
      })
      toast.success("Task deleted")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete task")
    }
  }

  const assignTask = async (taskId: string, assignedTo: string) => {
    setReassigning(taskId)
    try {
      const result = await apiPatch<{ task: Task; progress: number }>(
        `/projects/tasks/${taskId}`,
        { assignedTo }
      )
      setProject((prev) => {
        if (!prev?.tasks) return prev
        return {
          ...prev,
          progress: result.progress,
          tasks: prev.tasks.map((t) =>
            t.id === taskId ? { ...t, assignedTo: result.task.assignedTo } : t
          ),
        }
      })
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update assignee"
      )
    } finally {
      setReassigning(null)
    }
  }

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    setAdding(true)
    try {
      const result = await apiPost<{ task: Task; progress: number }>(
        `/projects/tasks`,
        {
          projectId: id,
          title,
          description: newDesc.trim() || undefined,
          assignedTo: newAssignee || undefined,
        }
      )
      setProject((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          progress: result.progress,
          tasks: [...(prev.tasks ?? []), result.task],
        }
      })
      setNewTitle("")
      setNewDesc("")
      setNewAssignee("")
      toast.success("Task added")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add task")
    } finally {
      setAdding(false)
    }
  }

  const submitProject = async (e: React.FormEvent) => {
    e.preventDefault()
    const gh = githubUrl.trim()
    if (!gh) return
    setSubmitting(true)
    try {
      await apiPost(`/projects/submit`, {
        projectId: id,
        githubUrl: gh,
        liveDemoUrl: liveDemoUrl.trim() || undefined,
      })
      setProject((prev) =>
        prev
          ? {
              ...prev,
              submission: {
                id: "pending",
                projectId: prev.id,
                githubUrl: gh,
                liveUrl: liveDemoUrl.trim() || null,
                status: "PENDING" as const,
                submittedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
              },
            }
          : prev
      )
      setSubmitOpen(false)
      setGithubUrl("")
      setLiveDemoUrl("")
      toast.success("Project submitted for judging!")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit project"
      )
    } finally {
      setSubmitting(false)
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

  const progress = project.progress ?? projectProgress(project)
  const isLeader = !!project.team && project.team.ownerId === currentUserId
  // Status is assignee-only; the leader may only move unassigned tasks.
  const canToggleTask = (task: Task) =>
    task.assignedTo ? task.assignedTo === currentUserId : isLeader
  const assigneeLabel = (task: Task) => {
    if (!task.assignedTo) return "Unassigned"
    if (task.assignedTo === currentUserId) return "You"
    const opt = assigneeOptions.find((o) => o.value === task.assignedTo)
    if (opt) return opt.label.replace(" (leader)", "")
    return `${task.assignedTo.slice(0, 8)} (former member)`
  }

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
          {progress === 100 && !project.submission && isLeader && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-900/50 bg-emerald-950/20 px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                All tasks completed — ready to submit
              </div>
              <Button
                size="sm"
                onClick={() => setSubmitOpen(true)}
                className="bg-violet-600 text-white hover:bg-violet-500"
              >
                <Rocket className="mr-1 h-4 w-4" />
                Submit project
              </Button>
            </div>
          )}
          {progress === 100 && !project.submission && !isLeader && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-500">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              All tasks completed — waiting for the team leader to submit
            </div>
          )}
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
            Tasks move through three stages: todo → in progress → done. Only the
            assigned member can change a task&apos;s status — the leader assigns
            tasks and submits the project.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLeader ? (
            <form onSubmit={(e) => void addTask(e)} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="New task title"
                  maxLength={200}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-violet-600 focus:outline-none"
                />
                {assigneeOptions.length > 0 && (
                  <Select
                    value={newAssignee || "none"}
                    items={[
                      { value: "none", label: "Unassigned" },
                      ...assigneeOptions,
                    ]}
                    onValueChange={(v) =>
                      setNewAssignee(!v || v === "none" ? "" : v)
                    }
                  >
                    <SelectTrigger
                      aria-label="Assignee"
                      className="w-40 shrink-0 border-slate-700 bg-slate-950/50 text-slate-400"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-800 bg-slate-900">
                      <SelectItem
                        value="none"
                        className="text-slate-400 focus:bg-slate-800 focus:text-slate-200"
                      >
                        Unassigned
                      </SelectItem>
                      {assigneeOptions.map((o) => (
                        <SelectItem
                          key={o.value}
                          value={o.value}
                          className="text-slate-300 focus:bg-slate-800 focus:text-slate-100"
                        >
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  type="submit"
                  size="sm"
                  disabled={adding || !newTitle.trim()}
                  className="bg-violet-600 text-white hover:bg-violet-500"
                >
                  {adding ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-1 h-4 w-4" />
                  )}
                  Add
                </Button>
              </div>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                maxLength={500}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-violet-600 focus:outline-none"
              />
            </form>
          ) : (
            <p className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs text-slate-500">
              Only the team leader can create tasks.
            </p>
          )}
          {!project.tasks || project.tasks.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">
              No tasks yet. Add one above.
            </p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {project.tasks.map((task) => (
                <li key={task.id} className="flex items-center gap-3 py-3">
                  <button
                    onClick={() => void toggleTask(task.id, task.status)}
                    disabled={toggling === task.id || !canToggleTask(task)}
                    className="flex flex-1 items-center gap-3 text-left disabled:opacity-50"
                    aria-label="Toggle task status"
                    title={
                      canToggleTask(task)
                        ? "Change task status"
                        : task.assignedTo
                          ? "Only the assigned member can change this task's status"
                          : "Unassigned — only the team leader can change this task's status"
                    }
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
                  {isLeader && assigneeOptions.length > 0 ? (
                    (() => {
                      const formerMember =
                        task.assignedTo &&
                        !assigneeOptions.some(
                          (o) => o.value === task.assignedTo
                        )
                          ? {
                              value: task.assignedTo,
                              label: `${task.assignedTo.slice(0, 8)} (former member)`,
                            }
                          : null
                      const options = [
                        { value: "none", label: "Unassigned" },
                        ...assigneeOptions,
                        ...(formerMember ? [formerMember] : []),
                      ]
                      return (
                        <Select
                          value={task.assignedTo ?? "none"}
                          items={options}
                          disabled={reassigning === task.id}
                          onValueChange={(v) =>
                            void assignTask(
                              task.id,
                              !v || v === "none" ? "" : v
                            )
                          }
                        >
                          <SelectTrigger
                            size="sm"
                            aria-label={`Assignee for ${task.title}`}
                            className="w-32 shrink-0 border-slate-700 bg-slate-950/50 text-xs text-slate-400"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-slate-800 bg-slate-900">
                            {options.map((o) => (
                              <SelectItem
                                key={o.value}
                                value={o.value}
                                className="text-slate-300 focus:bg-slate-800 focus:text-slate-100"
                              >
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )
                    })()
                  ) : (
                    <span
                      className="w-32 shrink-0 truncate text-right text-xs text-slate-500"
                      title={`Assigned to: ${assigneeLabel(task)}`}
                    >
                      {assigneeLabel(task)}
                    </span>
                  )}
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

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="border-slate-800 bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Submit project</DialogTitle>
            <DialogDescription className="text-slate-500">
              All tasks are done. Add your repository link to submit this
              project for judging.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void submitProject(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="githubUrl" className="text-slate-400">
                GitHub repository URL *
              </Label>
              <Input
                id="githubUrl"
                type="url"
                required
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/your-team/repo"
                className="border-slate-700 bg-slate-950/50 text-slate-200 placeholder:text-slate-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="liveDemoUrl" className="text-slate-400">
                Live demo URL (optional)
              </Label>
              <Input
                id="liveDemoUrl"
                type="url"
                value={liveDemoUrl}
                onChange={(e) => setLiveDemoUrl(e.target.value)}
                placeholder="https://your-app.vercel.app"
                className="border-slate-700 bg-slate-950/50 text-slate-200 placeholder:text-slate-600"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSubmitOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !githubUrl.trim()}
                className="bg-violet-600 text-white hover:bg-violet-500"
              >
                {submitting ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Rocket className="mr-1 h-4 w-4" />
                )}
                Submit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
