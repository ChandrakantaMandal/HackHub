"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ExternalLink,
  Heart,
  Loader2,
  MessageSquare,
  Send,
  Trophy,
} from "lucide-react"
import { toast } from "sonner"
import { apiGet, apiPost } from "@/lib/client"
import { useAppStore } from "@/store/useAppStore"
import { useHydrated } from "@/lib/useHydrated"
import type { ShowcaseComment, ShowcaseDetail } from "@/lib/types"
import { GithubIcon } from "@/components/icons"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
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
import { Separator } from "@workspace/ui/components/separator"
import { Skeleton } from "@workspace/ui/components/skeleton"

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "just now"
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export default function ShowcaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const hydrated = useHydrated()
  const user = useAppStore((s) => s.user)
  const [project, setProject] = useState<ShowcaseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liking, setLiking] = useState(false)
  const [comment, setComment] = useState("")
  const [posting, setPosting] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await apiGet<ShowcaseDetail>(`/showcase/${id}`)
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

  const toggleLike = async () => {
    setLiking(true)
    try {
      const res = await apiPost<{
        projectId: string
        liked: boolean
        likesCount: number
      }>(`/showcase/${id}/like`, { userId: user?.id })
      setProject((prev) => (prev ? { ...prev, likes: res.likesCount } : prev))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update like")
    } finally {
      setLiking(false)
    }
  }

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) return
    setPosting(true)
    try {
      const created = await apiPost<ShowcaseComment>(
        `/showcase/${id}/comment`,
        {
          message: comment.trim(),
          userId: user?.id,
        }
      )
      setProject((prev) =>
        prev
          ? {
              ...prev,
              comments: prev.comments + 1,
              commentsList: [created, ...prev.commentsList],
            }
          : prev
      )
      setComment("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post comment")
    } finally {
      setPosting(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-8 w-48 bg-slate-900" />
        <Skeleton className="h-72 rounded-xl bg-slate-900" />
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
          onClick={() => router.push("/showcase")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to showcase
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="text-slate-400 hover:text-slate-200"
        onClick={() => router.push("/showcase")}
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Showcase
      </Button>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl text-slate-100">
                {project.title}
              </CardTitle>
              <CardDescription className="mt-1 text-slate-500">
                by <span className="text-violet-400">{project.team.name}</span>
                {project.team.owner && (
                  <>
                    {" · "}
                    <span className="text-slate-400">
                      @{project.team.owner.username}
                    </span>
                  </>
                )}
              </CardDescription>
            </div>
            {project.category && (
              <Badge
                variant="outline"
                className="shrink-0 border-violet-900/60 text-[10px] text-violet-400"
              >
                {project.category}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-300">
            {project.description}
          </p>

          {project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
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
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => void toggleLike()}
              disabled={liking}
              variant="outline"
              className="border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900 hover:text-violet-400"
            >
              {liking ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Heart className="mr-1.5 h-4 w-4" />
              )}
              {project.likes}
            </Button>
            {project.submission.githubUrl && (
              <Button
                render={
                  <a
                    href={project.submission.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
                variant="outline"
                className="border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900"
              >
                <GithubIcon className="mr-1.5 h-4 w-4" />
                GitHub
              </Button>
            )}
            {project.submission.liveUrl && (
              <Button
                render={
                  <a
                    href={project.submission.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
                variant="outline"
                className="border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900"
              >
                <ExternalLink className="mr-1.5 h-4 w-4" />
                Live demo
              </Button>
            )}
          </div>

          {project.submission.status === "APPROVED" && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-900/50 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-400">
              <Trophy className="h-3.5 w-3.5" />
              Approved submission
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <MessageSquare className="h-4 w-4 text-violet-400" />
            Comments
          </CardTitle>
          <CardDescription className="text-slate-500">
            {project.comments} {project.comments === 1 ? "comment" : "comments"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {user && (
            <form onSubmit={submitComment} className="flex gap-2">
              <Input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Say something nice…"
                className="border-slate-800 bg-slate-950 text-slate-100"
                maxLength={2000}
              />
              <Button
                type="submit"
                disabled={posting || !comment.trim()}
                size="icon"
                className="shrink-0 bg-violet-600 text-white hover:bg-violet-500"
                aria-label="Post comment"
              >
                {posting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          )}
          {!user && (
            <p className="text-sm text-slate-500">
              <Link href="/signin" className="text-violet-400 hover:underline">
                Sign in
              </Link>{" "}
              to join the conversation.
            </p>
          )}

          <Separator className="bg-slate-800" />

          {project.commentsList.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">
              No comments yet. Be the first!
            </p>
          ) : (
            <ul className="space-y-4">
              {project.commentsList.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <Avatar className="h-8 w-8 border border-slate-800">
                    <AvatarImage
                      src={c.user.avatar ?? undefined}
                      alt={c.user.username}
                    />
                    <AvatarFallback className="bg-slate-800 text-xs text-slate-400">
                      {(c.user.name ?? c.user.username)
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-slate-200">
                        {c.user.name ?? `@${c.user.username}`}
                      </span>
                      <span className="text-xs text-slate-600">
                        {timeAgo(c.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm break-words whitespace-pre-wrap text-slate-300">
                      {c.message}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
