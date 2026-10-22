"use client"

import { useCallback, useEffect, useState } from "react"
import {
  CalendarDays,
  Globe2,
  Loader2,
  MapPin,
  Trophy,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { apiGet, apiPost } from "@/lib/client"
import { useHydrated } from "@/lib/useHydrated"
import type { Hackathon } from "@/lib/types"
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
import { Skeleton } from "@workspace/ui/components/skeleton"

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function HackathonCard({
  hackathon,
  onRegister,
  registeringId,
}: {
  hackathon: Hackathon
  onRegister: (id: string) => void
  registeringId: string | null
}) {
  return (
    <Card className="flex h-full flex-col border-slate-800 bg-slate-900/50 transition-colors hover:border-violet-900/60">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-slate-100">{hackathon.name}</CardTitle>
          {hackathon.registered ? (
            <Badge
              variant="outline"
              className="shrink-0 border-emerald-900/60 text-[10px] text-emerald-400"
            >
              Registered
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="shrink-0 border-violet-900/60 text-[10px] text-violet-400"
            >
              {hackathon.status}
            </Badge>
          )}
        </div>
        {hackathon.tagline && (
          <CardDescription className="text-sm text-slate-500">
            {hackathon.tagline}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="space-y-1.5 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
            {formatDate(hackathon.startDate)} – {formatDate(hackathon.endDate)}
          </div>
          <div className="flex items-center gap-2">
            {hackathon.location ? (
              <>
                <MapPin className="h-3.5 w-3.5 text-slate-500" />
                {hackathon.location}
              </>
            ) : (
              <>
                <Globe2 className="h-3.5 w-3.5 text-slate-500" />
                Online
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-slate-500" />
            {hackathon.participantCount} participant
            {hackathon.participantCount === 1 ? "" : "s"} · max team size{" "}
            {hackathon.maxTeamSize}
          </div>
        </div>

        <div className="mt-auto flex items-center gap-2">
          {hackathon.registered ? (
            <span className="text-xs font-medium text-emerald-400">
              You&apos;re registered
            </span>
          ) : hackathon.isRegistrationOpen ? (
            <Button
              size="sm"
              onClick={() => onRegister(hackathon.id)}
              disabled={registeringId === hackathon.id}
              className="bg-violet-600 text-white hover:bg-violet-500"
            >
              {registeringId === hackathon.id && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              Register
            </Button>
          ) : (
            <span className="text-xs text-slate-500">Registration closed</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function HackathonsPage() {
  const hydrated = useHydrated()
  const [active, setActive] = useState<Hackathon[]>([])
  const [mine, setMine] = useState<Hackathon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [registeringId, setRegisteringId] = useState<string | null>(null)
  const [joinCode, setJoinCode] = useState("")
  const [joining, setJoining] = useState(false)

  const load = useCallback(async () => {
    try {
      const [activeList, mineList] = await Promise.all([
        apiGet<Hackathon[]>("/hackathons"),
        apiGet<Hackathon[]>("/hackathons/mine").catch(() => [] as Hackathon[]),
      ])
      setActive(activeList)
      setMine(mineList)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load hackathons")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    void load()
  }, [hydrated, load])

  const handleRegister = async (id: string) => {
    setRegisteringId(id)
    try {
      await apiPost(`/hackathons/${id}/register`)
      toast.success("Registered for hackathon")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to register")
    } finally {
      setRegisteringId(null)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = joinCode.trim().toUpperCase()
    if (!code) return
    setJoining(true)
    try {
      const hackathon = await apiPost<Hackathon>("/hackathons/join", {
        joinCode: code,
      })
      toast.success(`Joined ${hackathon.name}`)
      setJoinCode("")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid join code")
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Hackathons</h2>
          <p className="text-sm text-slate-500">
            Discover active hackathons and track the ones you&apos;ve joined
          </p>
        </div>
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-slate-100">Have a join code?</CardTitle>
          <CardDescription className="text-slate-500">
            Enter a 6-character code to register for a hackathon directly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleJoin}
            className="flex flex-wrap items-end gap-2"
          >
            <div className="min-w-48 flex-1 space-y-2">
              <Label htmlFor="join-code" className="text-slate-300">
                Join code
              </Label>
              <Input
                id="join-code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="e.g. SPRING"
                maxLength={6}
                autoCapitalize="characters"
                autoComplete="off"
                className="border-slate-800 bg-slate-950 tracking-widest text-slate-100 uppercase"
              />
            </div>
            <Button
              type="submit"
              disabled={joining || !joinCode.trim()}
              className="bg-violet-600 text-white hover:bg-violet-500"
            >
              {joining && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Join
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl bg-slate-900" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && active.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center">
          <Trophy className="mx-auto mb-3 h-8 w-8 text-slate-700" />
          <p className="text-sm text-slate-400">
            No active hackathons right now. Check back soon.
          </p>
        </div>
      )}

      {!loading && active.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {active.map((h) => (
            <HackathonCard
              key={h.id}
              hackathon={h}
              onRegister={handleRegister}
              registeringId={registeringId}
            />
          ))}
        </div>
      )}

      {!loading && mine.length > 0 && (
        <div className="space-y-4 pt-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              Your hackathons
            </h3>
            <p className="text-xs text-slate-500">
              Everything you&apos;ve registered for, including past events
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {mine.map((h) => (
              <HackathonCard
                key={h.id}
                hackathon={h}
                onRegister={handleRegister}
                registeringId={registeringId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
