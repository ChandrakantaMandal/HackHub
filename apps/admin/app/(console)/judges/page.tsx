"use client"

import * as React from "react"
import { Gavel, Plus, RefreshCw, Search } from "lucide-react"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
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
import { ApiError } from "@/lib/client"
import { useJudgesStore } from "@/store/useJudgesStore"
import type { CreateJudgeInput } from "@/lib/types"

export default function JudgesPage() {
  const { judges, loading, loadError, load, createJudge } = useJudgesStore()
  const [search, setSearch] = React.useState("")

  const [modalOpen, setModalOpen] = React.useState(false)
  const [formEmail, setFormEmail] = React.useState("")
  const [formPassword, setFormPassword] = React.useState("")
  const [formName, setFormName] = React.useState("")
  const [formError, setFormError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    void load()
  }, [load])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return judges
    return judges.filter(
      (j) =>
        j.name?.toLowerCase().includes(q) ||
        j.username.toLowerCase().includes(q) ||
        j.email.toLowerCase().includes(q)
    )
  }, [judges, search])

  function openModal() {
    setFormEmail("")
    setFormPassword("")
    setFormName("")
    setFormError(null)
    setModalOpen(true)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!formEmail.trim() || !formPassword) {
      setFormError("Email and password are required")
      return
    }
    if (!formEmail.includes("@")) {
      setFormError("Enter a valid email address")
      return
    }
    if (formPassword.length < 8) {
      setFormError("Password must be at least 8 characters")
      return
    }

    const payload: CreateJudgeInput = {
      email: formEmail.trim(),
      password: formPassword,
      ...(formName.trim() ? { name: formName.trim() } : {}),
    }

    setSubmitting(true)
    try {
      await createJudge(payload)
      setModalOpen(false)
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : "Failed to create judge. Please try again."
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-xs rounded-lg bg-slate-900" />
        <Skeleton className="h-64 rounded-xl bg-slate-900" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <Gavel className="h-5 w-5 text-violet-400" />
            Judges
          </h2>
        </div>
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-sm text-red-400">{loadError}</p>
            <Button
              onClick={() => void load()}
              variant="outline"
              className="border-slate-800 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-slate-100"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <Gavel className="h-5 w-5 text-violet-400" />
            Judges
          </h2>
          <p className="text-sm text-slate-500">
            Registered judges and scoring activity.
          </p>
        </div>
        <Button
          onClick={openModal}
          className="bg-violet-600 text-white hover:bg-violet-500"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add judge
        </Button>
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

      {filtered.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Gavel className="h-8 w-8 text-slate-600" />
            <p className="text-sm text-slate-400">
              {judges.length === 0
                ? "No judges yet. Create the first one."
                : "No judges match your search."}
            </p>
            {judges.length === 0 && (
              <Button
                onClick={openModal}
                className="bg-violet-600 text-white hover:bg-violet-500"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add judge
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-500">Name</TableHead>
                  <TableHead className="text-slate-500">Email</TableHead>
                  <TableHead className="text-right text-slate-500">
                    Scored
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((j) => (
                  <TableRow key={j.id} className="border-slate-800/60">
                    <TableCell>
                      <div className="font-medium text-slate-200">
                        {j.name || j.username}
                      </div>
                      {j.name && (
                        <div className="text-xs text-slate-500">
                          @{j.username}
                        </div>
                      )}
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
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            aria-hidden="true"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-100">
                Add judge
              </h3>
              <Badge
                variant="outline"
                className="border-violet-900/60 text-[10px] text-violet-400"
              >
                JUDGE
              </Badge>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="judge-name" className="text-slate-300">
                  Name <span className="text-slate-600">(optional)</span>
                </Label>
                <Input
                  id="judge-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Grace Kim"
                  className="border-slate-800 bg-slate-950 text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="judge-new-email" className="text-slate-300">
                  Email
                </Label>
                <Input
                  id="judge-new-email"
                  type="email"
                  autoComplete="off"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="judge@hackhub.dev"
                  className="border-slate-800 bg-slate-950 text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="judge-new-password" className="text-slate-300">
                  Password
                </Label>
                <Input
                  id="judge-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="border-slate-800 bg-slate-950 text-slate-100"
                />
              </div>
              {formError && (
                <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">
                  {formError}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="border-slate-800 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-violet-600 text-white hover:bg-violet-500"
                >
                  {submitting ? "Creating…" : "Create judge"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
