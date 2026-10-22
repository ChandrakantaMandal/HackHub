"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { FolderKanban, Loader2, Plus, Trophy } from "lucide-react"
import { toast } from "sonner"
import { apiGet, apiPost } from "@/lib/client"
import { useAppStore } from "@/store/useAppStore"
import { useHydrated } from "@/lib/useHydrated"
import type { Hackathon, Project, Team } from "@/lib/types"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Textarea } from "@workspace/ui/components/textarea"

const statusColors: Record<string, string> = {
  DRAFT: "border-slate-700 text-slate-400",
  DEVELOPMENT: "border-blue-900/60 text-blue-400",
  SUBMITTED: "border-amber-900/60 text-amber-400",
  COMPLETED: "border-emerald-900/60 text-emerald-400",
  WINNER: "border-violet-900/60 text-violet-400",
}

export default function ProjectsPage() {
  const hydrated = useHydrated()
  const user = useAppStore((s) => s.user)
  const [projects, setProjects] = useState<Project[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [myHackathons, setMyHackathons] = useState<Hackathon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    title: "",
    description: "",
    teamId: "",
    hackathonId: "",
    category: "",
    tags: "",
  })

  const load = useCallback(async () => {
    try {
      const data = await apiGet<Project[]>("/projects")
      setProjects(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    void load()
    apiGet<Team[]>("/projects/teams")
      .then(setTeams)
      .catch(() => {})
    apiGet<Hackathon[]>("/hackathons/mine")
      .then(setMyHackathons)
      .catch(() => {})
  }, [hydrated, load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.teamId || !form.hackathonId) return
    setCreating(true)
    try {
      await apiPost("/projects", {
        teamId: form.teamId,
        hackathonId: form.hackathonId,
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category.trim() || undefined,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        userId: user?.user?.id,
      })
      toast.success("Project created")
      setForm({
        title: "",
        description: "",
        teamId: "",
        hackathonId: "",
        category: "",
        tags: "",
      })
      setShowForm(false)
      await load()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create project"
      )
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Projects</h2>
          <p className="text-sm text-slate-500">
            Track your hackathon builds and their tasks
          </p>
        </div>
        {teams.length > 0 && (
          <Button
            onClick={() => setShowForm((v) => !v)}
            className="bg-violet-600 text-white hover:bg-violet-500"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New project
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-slate-100">Create project</CardTitle>
            <CardDescription className="text-slate-500">
              Attach a new project to one of your teams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              {myHackathons.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center">
                  <Trophy className="mx-auto mb-3 h-8 w-8 text-slate-700" />
                  <p className="text-sm text-slate-400">
                    Register for a hackathon before creating a project.
                  </p>
                  <Button
                    render={<Link href="/hackathons" />}
                    nativeButton={false}
                    size="sm"
                    className="mt-4 bg-violet-600 text-white hover:bg-violet-500"
                  >
                    Browse hackathons
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="p-title" className="text-slate-300">
                        Title
                      </Label>
                      <Input
                        id="p-title"
                        value={form.title}
                        onChange={(e) =>
                          setForm({ ...form, title: e.target.value })
                        }
                        placeholder="e.g. Smart Grid Optimizer"
                        className="border-slate-800 bg-slate-950 text-slate-100"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p-team" className="text-slate-300">
                        Team
                      </Label>
                      <Select
                        value={form.teamId}
                        items={teams.map((t) => ({
                          value: t.id,
                          label: t.name,
                        }))}
                        onValueChange={(v) =>
                          setForm({ ...form, teamId: v ?? "" })
                        }
                      >
                        <SelectTrigger
                          id="p-team"
                          className="border-slate-800 bg-slate-950 text-slate-100"
                        >
                          <SelectValue placeholder="Select a team" />
                        </SelectTrigger>
                        <SelectContent className="border-slate-800 bg-slate-900">
                          {teams.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p-hackathon" className="text-slate-300">
                        Hackathon
                      </Label>
                      <Select
                        value={form.hackathonId}
                        items={myHackathons.map((h) => ({
                          value: h.id,
                          label: h.name,
                        }))}
                        onValueChange={(v) =>
                          setForm({ ...form, hackathonId: v ?? "" })
                        }
                      >
                        <SelectTrigger
                          id="p-hackathon"
                          className="border-slate-800 bg-slate-950 text-slate-100"
                        >
                          <SelectValue placeholder="Select a hackathon" />
                        </SelectTrigger>
                        <SelectContent className="border-slate-800 bg-slate-900">
                          {myHackathons.map((h) => (
                            <SelectItem key={h.id} value={h.id}>
                              {h.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p-desc" className="text-slate-300">
                      Description
                    </Label>
                    <Textarea
                      id="p-desc"
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      placeholder="What are you building?"
                      className="min-h-20 border-slate-800 bg-slate-950 text-slate-100"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="p-cat" className="text-slate-300">
                        Category (optional)
                      </Label>
                      <Input
                        id="p-cat"
                        value={form.category}
                        onChange={(e) =>
                          setForm({ ...form, category: e.target.value })
                        }
                        placeholder="e.g. AI/ML, HealthTech"
                        className="border-slate-800 bg-slate-950 text-slate-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p-tags" className="text-slate-300">
                        Tags (comma-separated)
                      </Label>
                      <Input
                        id="p-tags"
                        value={form.tags}
                        onChange={(e) =>
                          setForm({ ...form, tags: e.target.value })
                        }
                        placeholder="react, node, llm"
                        className="border-slate-800 bg-slate-950 text-slate-100"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={
                        creating ||
                        !form.title.trim() ||
                        !form.teamId ||
                        !form.hackathonId
                      }
                      className="bg-violet-600 text-white hover:bg-violet-500"
                    >
                      {creating && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-slate-400"
                      onClick={() => setShowForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl bg-slate-900" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center">
          <FolderKanban className="mx-auto mb-3 h-8 w-8 text-slate-700" />
          <p className="text-sm text-slate-400">
            {teams.length === 0
              ? "Create a team first, then add a project to it."
              : "No projects yet. Create your first one."}
          </p>
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <Card className="h-full border-slate-800 bg-slate-900/50 transition-colors hover:border-violet-900/60">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-slate-100">{p.title}</CardTitle>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-[10px] ${statusColors[p.status] ?? statusColors.DRAFT}`}
                    >
                      {p.status}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2 text-slate-500">
                    {p.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {p.category && (
                      <Badge
                        variant="outline"
                        className="border-violet-900/60 text-[10px] text-violet-400"
                      >
                        {p.category}
                      </Badge>
                    )}
                    {p.tags.slice(0, 5).map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="border-slate-800 text-[10px] text-slate-500"
                      >
                        {tag}
                      </Badge>
                    ))}
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
