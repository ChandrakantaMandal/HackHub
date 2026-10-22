"use client"

import { useEffect, useState } from "react"
import { Plus, Search, X, RefreshCw, Trophy } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { ApiError } from "@/lib/client"
import { useHackathonsStore } from "@/store/useHackathonsStore"
import type { HackathonStatus, CreateHackathonInput } from "@/lib/types"

const STATUS_STYLES: Record<HackathonStatus, string> = {
  DRAFT: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  ACTIVE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  COMPLETED: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  ARCHIVED: "border-rose-500/30 bg-rose-500/10 text-rose-400",
}

const formatDate = (value: string | Date) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

const emptyForm = {
  name: "",
  tagline: "",
  location: "",
  registrationDeadline: "",
  startDate: "",
  endDate: "",
  maxTeamSize: "5",
  status: "ACTIVE" as HackathonStatus,
  allowJoin: true,
  description: "",
  guidelines: "",
}

export default function HackathonsPage() {
  const { hackathons, loading, loadError, load, createHackathon } =
    useHackathonsStore()
  const [search, setSearch] = useState("")

  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    void load()
  }, [load])

  const filtered = hackathons.filter((h) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      h.name.toLowerCase().includes(q) ||
      (h.tagline ?? "").toLowerCase().includes(q)
    )
  })

  const set = (key: keyof typeof emptyForm, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!form.name.trim()) {
      setFormError("Name is required")
      return
    }
    if (!form.registrationDeadline || !form.startDate || !form.endDate) {
      setFormError("All dates are required")
      return
    }

    const reg = new Date(form.registrationDeadline)
    const start = new Date(form.startDate)
    const end = new Date(form.endDate)

    if (reg > start || start > end) {
      setFormError("Dates must be ordered: registration <= start <= end")
      return
    }

    const maxTeamSize = Number(form.maxTeamSize)
    if (!Number.isInteger(maxTeamSize) || maxTeamSize < 1) {
      setFormError("Max team size must be an integer of at least 1")
      return
    }

    const payload: CreateHackathonInput = {
      name: form.name.trim(),
      registrationDeadline: reg.toISOString(),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      maxTeamSize,
      status: form.status,
      allowJoin: form.allowJoin,
      ...(form.tagline.trim() ? { tagline: form.tagline.trim() } : {}),
      ...(form.location.trim() ? { location: form.location.trim() } : {}),
      ...(form.description.trim()
        ? { description: form.description.trim() }
        : {}),
      ...(form.guidelines.trim() ? { guidelines: form.guidelines.trim() } : {}),
    }

    setCreating(true)
    try {
      await createHackathon(payload)
      setForm(emptyForm)
      setShowCreate(false)
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        const first = Object.values(err.fields)[0]?.[0]
        setFormError(first ?? err.message)
      } else {
        setFormError(
          err instanceof ApiError ? err.message : "Failed to create hackathon"
        )
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Hackathons</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage hackathons on HackHub
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm)
            setFormError(null)
            setShowCreate(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create hackathon
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search hackathons..."
          className="border-slate-800 bg-slate-950 pl-9 text-slate-100"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full bg-slate-800/50" />
          ))}
        </div>
      ) : loadError ? (
        <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-4 text-sm text-red-400">
          <div className="flex items-center justify-between gap-4">
            <span>{loadError}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              className="border-slate-800 text-slate-300 hover:bg-slate-800"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      ) : hackathons.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-6 py-12 text-center">
          <Trophy className="mx-auto h-10 w-10 text-slate-600" />
          <h2 className="mt-4 text-lg font-medium text-slate-200">
            No hackathons yet
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Create your first hackathon to get started.
          </p>
          <Button
            className="mt-4"
            onClick={() => {
              setForm(emptyForm)
              setFormError(null)
              setShowCreate(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create hackathon
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-6 py-12 text-center text-sm text-slate-500">
          No hackathons match &ldquo;{search}&rdquo;
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">Hackathon</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Schedule</th>
                <th className="px-4 py-3 font-medium">Join Code</th>
                <th className="px-4 py-3 font-medium">Location</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((h) => (
                <tr
                  key={h.id}
                  className="border-b border-slate-800/60 last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-200">{h.name}</div>
                    {h.tagline && (
                      <div className="mt-0.5 text-xs text-slate-500">
                        {h.tagline}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[h.status]}`}
                    >
                      {h.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {formatDate(h.startDate)} &ndash; {formatDate(h.endDate)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-violet-400">
                      {h.joinCode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {h.location || (
                      <span className="text-slate-600">&mdash;</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => !creating && setShowCreate(false)}
          />
          <form
            onSubmit={submit}
            className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">
                Create hackathon
              </h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                disabled={creating}
                className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ht-name" className="text-slate-300">
                  Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="ht-name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Spring Hack 2026"
                  className="border-slate-800 bg-slate-950 text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ht-tagline" className="text-slate-300">
                  Tagline
                </Label>
                <Input
                  id="ht-tagline"
                  value={form.tagline}
                  onChange={(e) => set("tagline", e.target.value)}
                  placeholder="Build the future in 48 hours"
                  className="border-slate-800 bg-slate-950 text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ht-location" className="text-slate-300">
                  Location
                </Label>
                <Input
                  id="ht-location"
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="Online or venue address"
                  className="border-slate-800 bg-slate-950 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ht-reg" className="text-slate-300">
                    Registration deadline{" "}
                    <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="ht-reg"
                    type="date"
                    value={form.registrationDeadline}
                    onChange={(e) =>
                      set("registrationDeadline", e.target.value)
                    }
                    className="border-slate-800 bg-slate-950 text-slate-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ht-start" className="text-slate-300">
                    Start date <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="ht-start"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => set("startDate", e.target.value)}
                    className="border-slate-800 bg-slate-950 text-slate-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ht-end" className="text-slate-300">
                    End date <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="ht-end"
                    type="date"
                    value={form.endDate}
                    onChange={(e) => set("endDate", e.target.value)}
                    className="border-slate-800 bg-slate-950 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ht-status" className="text-slate-300">
                    Status
                  </Label>
                  <select
                    id="ht-status"
                    value={form.status}
                    onChange={(e) => set("status", e.target.value)}
                    className="h-9 w-full rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ht-team" className="text-slate-300">
                    Max team size
                  </Label>
                  <Input
                    id="ht-team"
                    type="number"
                    min={1}
                    value={form.maxTeamSize}
                    onChange={(e) => set("maxTeamSize", e.target.value)}
                    className="border-slate-800 bg-slate-950 text-slate-100"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={form.allowJoin}
                  onChange={(e) => set("allowJoin", e.target.checked)}
                  className="h-4 w-4 accent-violet-600"
                />
                Allow teams to join this hackathon
              </label>

              <div className="space-y-1.5">
                <Label htmlFor="ht-desc" className="text-slate-300">
                  Description
                </Label>
                <Textarea
                  id="ht-desc"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                  placeholder="What is this hackathon about?"
                  className="border-slate-800 bg-slate-950 text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ht-guidelines" className="text-slate-300">
                  Guidelines
                </Label>
                <Textarea
                  id="ht-guidelines"
                  value={form.guidelines}
                  onChange={(e) => set("guidelines", e.target.value)}
                  rows={3}
                  placeholder="Rules, judging criteria, resources..."
                  className="border-slate-800 bg-slate-950 text-slate-100"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreate(false)}
                disabled={creating}
                className="border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create hackathon"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
