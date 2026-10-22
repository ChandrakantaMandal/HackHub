"use client"

import * as React from "react"
import {
  Award,
  ClipboardList,
  ExternalLink,
  FileText,
  FolderGit2,
  LinkIcon,
  Pencil,
  RefreshCw,
  Search,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { ApiError } from "@/lib/client"
import { useJudgeUser } from "@/lib/auth"
import { useSubmissionsStore } from "@/store/useSubmissionsStore"
import type { SubmissionRecord } from "@/lib/types"

const CRITERIA = [
  { key: "innovation", label: "Innovation" },
  { key: "technical", label: "Technical" },
  { key: "design", label: "Design" },
  { key: "presentation", label: "Presentation" },
  { key: "overall", label: "Overall" },
] as const

type CriterionKey = (typeof CRITERIA)[number]["key"]

function statusClasses(status: string): string {
  switch (status) {
    case "APPROVED":
      return "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
    case "REJECTED":
      return "border-red-500/30 bg-red-500/15 text-red-400"
    default:
      return "border-amber-500/30 bg-amber-500/15 text-amber-400"
  }
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: number
  hint: string
  accent: string
}) {
  return (
    <Card className="border-slate-800 bg-slate-900/50">
      <CardContent className="p-4">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          {label}
        </p>
        <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
        <p className="mt-0.5 text-xs text-slate-600">{hint}</p>
      </CardContent>
    </Card>
  )
}

export default function SubmissionsPage() {
  const {
    submissions,
    loading,
    loadError,
    load,
    scoreSubmission,
    awardBadge,
    revokeBadge,
  } = useSubmissionsStore()
  const { user } = useJudgeUser()
  const judgeId = user?.judgeId

  const [search, setSearch] = React.useState("")

  const [scoreTarget, setScoreTarget] = React.useState<SubmissionRecord | null>(
    null
  )
  const [scores, setScores] = React.useState<Record<CriterionKey, number>>({
    innovation: 0,
    technical: 0,
    design: 0,
    presentation: 0,
    overall: 0,
  })
  const [feedback, setFeedback] = React.useState("")
  const [scoreError, setScoreError] = React.useState<string | null>(null)
  const [scoring, setScoring] = React.useState(false)

  const [badgeTarget, setBadgeTarget] = React.useState<SubmissionRecord | null>(
    null
  )
  const [badgeName, setBadgeName] = React.useState("")
  const [badgeDescription, setBadgeDescription] = React.useState("")
  const [badgeError, setBadgeError] = React.useState<string | null>(null)
  const [awarding, setAwarding] = React.useState(false)

  const [revokingId, setRevokingId] = React.useState<string | null>(null)

  React.useEffect(() => {
    void load()
  }, [load])

  const stats = React.useMemo(() => {
    const scored = judgeId
      ? submissions.filter((s) =>
          s.judgeScores.some((sc) => sc.judgeId === judgeId)
        ).length
      : 0
    const badges = submissions.reduce((n, s) => n + s.badges.length, 0)
    return {
      total: submissions.length,
      scored,
      awaiting: submissions.length - scored,
      badges,
    }
  }, [submissions, judgeId])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return submissions
    return submissions.filter(
      (s) =>
        s.project.title.toLowerCase().includes(q) ||
        s.project.team.name.toLowerCase().includes(q) ||
        s.project.team.owner.name.toLowerCase().includes(q) ||
        s.project.team.owner.username.toLowerCase().includes(q) ||
        (s.project.category?.toLowerCase().includes(q) ?? false)
    )
  }, [submissions, search])

  function myScore(submission: SubmissionRecord) {
    return judgeId
      ? submission.judgeScores.find((sc) => sc.judgeId === judgeId)
      : undefined
  }

  function openScoreModal(submission: SubmissionRecord) {
    const existing = myScore(submission)
    setScores({
      innovation: existing?.innovation ?? 0,
      technical: existing?.technical ?? 0,
      design: existing?.design ?? 0,
      presentation: existing?.presentation ?? 0,
      overall: existing?.overall ?? 0,
    })
    setFeedback(existing?.feedback ?? "")
    setScoreError(null)
    setScoreTarget(submission)
  }

  async function handleScore(e: React.FormEvent) {
    e.preventDefault()
    setScoreError(null)
    if (!scoreTarget) return

    setScoring(true)
    try {
      await scoreSubmission(scoreTarget.id, {
        ...scores,
        ...(feedback.trim() ? { feedback: feedback.trim() } : {}),
      })
      toast.success("Score submitted")
      setScoreTarget(null)
    } catch (err) {
      setScoreError(
        err instanceof ApiError
          ? err.message
          : "Failed to submit score. Please try again."
      )
    } finally {
      setScoring(false)
    }
  }

  function openBadgeModal(submission: SubmissionRecord) {
    setBadgeName("")
    setBadgeDescription("")
    setBadgeError(null)
    setBadgeTarget(submission)
  }

  async function handleAward(e: React.FormEvent) {
    e.preventDefault()
    setBadgeError(null)
    if (!badgeTarget) return

    if (!badgeName.trim()) {
      setBadgeError("Badge name is required")
      return
    }

    setAwarding(true)
    try {
      await awardBadge(
        badgeTarget.id,
        badgeName.trim(),
        badgeDescription.trim() || undefined
      )
      toast.success("Badge awarded")
      setBadgeTarget(null)
    } catch (err) {
      setBadgeError(
        err instanceof ApiError
          ? err.message
          : "Failed to award badge. Please try again."
      )
    } finally {
      setAwarding(false)
    }
  }

  async function handleRevoke(submission: SubmissionRecord, badgeId: string) {
    setRevokingId(badgeId)
    try {
      await revokeBadge(submission.id, badgeId)
      toast.success("Badge revoked")
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to revoke badge"
      )
    } finally {
      setRevokingId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-slate-900" />
          ))}
        </div>
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
            <ClipboardList className="h-5 w-5 text-violet-400" />
            Submissions
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
            <ClipboardList className="h-5 w-5 text-violet-400" />
            Submissions
          </h2>
          <p className="text-sm text-slate-500">
            Review projects, submit scores, and award badges.
          </p>
        </div>
        <Button
          onClick={() => void load()}
          variant="outline"
          className="border-slate-800 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-slate-100"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total submissions"
          value={stats.total}
          hint="Awaiting and scored"
          accent="text-slate-100"
        />
        <StatCard
          label="Scored by you"
          value={stats.scored}
          hint="Your completed reviews"
          accent="text-violet-400"
        />
        <StatCard
          label="Awaiting score"
          value={stats.awaiting}
          hint="Not yet scored by you"
          accent="text-amber-400"
        />
        <StatCard
          label="Badges"
          value={stats.badges}
          hint="Awarded across submissions"
          accent="text-emerald-400"
        />
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search submissions…"
          className="border-slate-800 bg-slate-950 pl-9 text-slate-100"
          aria-label="Search submissions"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ClipboardList className="h-8 w-8 text-slate-600" />
            <p className="text-sm text-slate-400">
              {submissions.length === 0
                ? "No submissions yet."
                : "No submissions match your search."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((submission) => {
            const mine = myScore(submission)
            return (
              <Card
                key={submission.id}
                className="border-slate-800 bg-slate-900/50"
              >
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-100">
                          {submission.project.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className={statusClasses(submission.status)}
                        >
                          {submission.status}
                        </Badge>
                        {submission.project.category && (
                          <Badge
                            variant="outline"
                            className="border-slate-700 text-slate-400"
                          >
                            {submission.project.category}
                          </Badge>
                        )}
                        {mine && (
                          <Badge className="border-violet-500/40 bg-violet-500/15 text-violet-300">
                            Scored by you · {mine.finalScore}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-400">
                        {submission.project.description}
                      </p>
                      <p className="text-xs text-slate-500">
                        Team{" "}
                        <span className="font-medium text-slate-400">
                          {submission.project.team.name}
                        </span>{" "}
                        · owned by {submission.project.team.owner.name} (@
                        {submission.project.team.owner.username})
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        onClick={() => openScoreModal(submission)}
                        className="bg-violet-600 text-white hover:bg-violet-500"
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        {mine ? "Rescore" : "Score"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openBadgeModal(submission)}
                        className="border-slate-800 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                      >
                        <Award className="mr-2 h-4 w-4" />
                        Badge
                      </Button>
                    </div>
                  </div>

                  {(submission.githubUrl ||
                    submission.liveUrl ||
                    submission.documentation) && (
                    <div className="flex flex-wrap gap-2">
                      {submission.githubUrl && (
                        <a
                          href={submission.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 px-2.5 py-1 text-xs text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-200"
                        >
                          <FolderGit2 className="h-3.5 w-3.5" />
                          GitHub
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {submission.liveUrl && (
                        <a
                          href={submission.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 px-2.5 py-1 text-xs text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-200"
                        >
                          <LinkIcon className="h-3.5 w-3.5" />
                          Live demo
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {submission.documentation && (
                        <a
                          href={submission.documentation}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 px-2.5 py-1 text-xs text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-200"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Documentation
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}

                  {submission.judgeScores.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                        Judge scores
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {submission.judgeScores.map((score) => (
                          <div
                            key={score.id}
                            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
                          >
                            <p className="text-xs text-slate-500">
                              {score.judgeId === judgeId ? (
                                <span className="font-semibold text-violet-400">
                                  Your score
                                </span>
                              ) : (
                                "Judge"
                              )}{" "}
                              ·{" "}
                              <span className="font-semibold text-slate-200">
                                {score.finalScore}
                              </span>
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-600">
                              I {score.innovation} · T {score.technical} · D{" "}
                              {score.design} · P {score.presentation} · O{" "}
                              {score.overall}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                      Badges
                    </p>
                    {submission.badges.length === 0 ? (
                      <p className="text-xs text-slate-600">
                        No badges awarded yet.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {submission.badges.map((badge) => (
                          <span
                            key={badge.id}
                            className="group inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 py-1 pr-1 pl-3 text-xs font-medium text-amber-300"
                            title={badge.description ?? undefined}
                          >
                            <Award className="h-3.5 w-3.5" />
                            {badge.name}
                            <button
                              type="button"
                              onClick={() =>
                                void handleRevoke(submission, badge.id)
                              }
                              disabled={revokingId === badge.id}
                              aria-label={`Revoke ${badge.name} badge`}
                              className="ml-0.5 rounded-full p-1 text-amber-500/60 transition-colors hover:bg-amber-500/20 hover:text-amber-200 disabled:opacity-50"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {scoreTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            aria-hidden="true"
            onClick={() => !scoring && setScoreTarget(null)}
          />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  Score submission
                </h3>
                <p className="text-sm text-slate-500">
                  {scoreTarget.project.title} · {scoreTarget.project.team.name}
                </p>
              </div>
              <Badge
                variant="outline"
                className="border-violet-900/60 text-[10px] text-violet-400"
              >
                0–10
              </Badge>
            </div>
            <form onSubmit={handleScore} className="space-y-4">
              <div className="space-y-4">
                {CRITERIA.map((criterion) => (
                  <div key={criterion.key}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <Label
                        htmlFor={`score-${criterion.key}`}
                        className="text-slate-300"
                      >
                        {criterion.label}
                      </Label>
                      <span className="text-sm font-bold text-violet-400">
                        {scores[criterion.key]}
                      </span>
                    </div>
                    <input
                      id={`score-${criterion.key}`}
                      type="range"
                      min={0}
                      max={10}
                      step={1}
                      value={scores[criterion.key]}
                      onChange={(e) =>
                        setScores((prev) => ({
                          ...prev,
                          [criterion.key]: Number(e.target.value),
                        }))
                      }
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-violet-500"
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="score-feedback" className="text-slate-300">
                  Feedback <span className="text-slate-600">(optional)</span>
                </Label>
                <textarea
                  id="score-feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="What stood out? What could improve?"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-violet-600 focus:outline-none"
                />
                <p className="text-right text-[11px] text-slate-600">
                  {feedback.length}/2000
                </p>
              </div>
              {scoreError && (
                <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">
                  {scoreError}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setScoreTarget(null)}
                  disabled={scoring}
                  className="border-slate-800 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={scoring}
                  className="bg-violet-600 text-white hover:bg-violet-500"
                >
                  {scoring
                    ? "Submitting…"
                    : myScore(scoreTarget)
                      ? "Update score"
                      : "Submit score"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {badgeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            aria-hidden="true"
            onClick={() => !awarding && setBadgeTarget(null)}
          />
          <div className="relative w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  Award badge
                </h3>
                <p className="text-sm text-slate-500">
                  {badgeTarget.project.title}
                </p>
              </div>
              <Badge
                variant="outline"
                className="border-amber-500/40 text-[10px] text-amber-400"
              >
                <Award className="mr-1 h-3 w-3" />
                BADGE
              </Badge>
            </div>
            <form onSubmit={handleAward} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="badge-name" className="text-slate-300">
                  Badge name
                </Label>
                <Input
                  id="badge-name"
                  value={badgeName}
                  onChange={(e) => setBadgeName(e.target.value)}
                  maxLength={60}
                  placeholder="Best UI, Most Innovative…"
                  className="border-slate-800 bg-slate-950 text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="badge-description" className="text-slate-300">
                  Description <span className="text-slate-600">(optional)</span>
                </Label>
                <textarea
                  id="badge-description"
                  value={badgeDescription}
                  onChange={(e) => setBadgeDescription(e.target.value)}
                  maxLength={200}
                  rows={2}
                  placeholder="Why this project earned it"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-violet-600 focus:outline-none"
                />
              </div>
              {badgeError && (
                <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">
                  {badgeError}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBadgeTarget(null)}
                  disabled={awarding}
                  className="border-slate-800 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={awarding}
                  className="bg-violet-600 text-white hover:bg-violet-500"
                >
                  {awarding ? "Awarding…" : "Award badge"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
