"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Gavel } from "lucide-react"
import { setJudgeUser, useJudgeUser } from "@/lib/auth"
import { ApiError, apiGet, apiPost } from "@/lib/client"
import type { LoginResult, ProfileResult } from "@/lib/types"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

export default function JudgeLoginPage() {
  const router = useRouter()
  const { user, hydrated } = useJudgeUser()

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")

  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (hydrated && user?.role === "JUDGE") {
      router.replace("/submissions")
    }
  }, [hydrated, user, router])

  async function finishLogin(session: LoginResult) {
    const profile = await apiGet<ProfileResult>("/auth/profile", {
      token: session.accessToken,
    })

    if (profile.user?.role !== "JUDGE") {
      setError("Judge access required")
      return
    }

    setJudgeUser({
      email: profile.email,
      role: profile.user.role,
      judgeId: session.judge?.id,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      sessionId: session.sessionId,
    })
    router.replace("/submissions")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError("Enter email and password")
      return
    }
    if (!email.includes("@")) {
      setError("Enter a valid email address")
      return
    }

    setSubmitting(true)
    try {
      const session = await apiPost<LoginResult>(
        "/judges/login",
        { email: email.trim(), password },
        { skipAuth: true }
      )
      await finishLogin(session)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Sign in failed. Please try again."
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!hydrated || user?.role === "JUDGE") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <Skeleton className="h-80 w-full max-w-sm rounded-2xl bg-slate-900" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-sm border-slate-800 bg-slate-900/50">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
            <Gavel className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl text-slate-100">
            HackHub Judge
          </CardTitle>
          <CardDescription className="text-slate-500">
            Sign in to start scoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="judge@hackhub.dev"
                className="border-slate-800 bg-slate-950 text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="border-slate-800 bg-slate-950 text-slate-100"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-violet-600 text-white hover:bg-violet-500"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
