"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Rocket,
  Trophy,
  Medal,
  Users,
  ChartColumnIncreasing,
  Inbox,
} from "lucide-react"

import { apiGet } from "@/lib/client"
import type { Hackathon, TeamLeaderboardEntry } from "@/lib/types"
import { useAppStore } from "@/store/useAppStore"
import { useHydrated } from "@/lib/useHydrated"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

const rankStyles: Record<number, string> = {
  1: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  2: "border-slate-400/40 bg-slate-400/10 text-slate-300",
  3: "border-orange-600/40 bg-orange-600/10 text-orange-400",
}

const rankIcons: Record<number, React.ReactNode> = {
  1: <Trophy className="h-4 w-4" />,
  2: <Medal className="h-4 w-4" />,
  3: <Medal className="h-4 w-4" />,
}

export default function LeaderboardPage() {
  const hydrated = useHydrated()
  const accessToken = useAppStore((state) => state.accessToken)
  const isAuthenticated = hydrated && Boolean(accessToken)

  const [hackathons, setHackathons] = useState<Hackathon[]>([])
  const [hackathonsLoading, setHackathonsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [entries, setEntries] = useState<TeamLeaderboardEntry[]>([])
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const entriesLoading = Boolean(selectedId) && loadedId !== selectedId

  useEffect(() => {
    apiGet<Hackathon[]>("/hackathons", false)
      .then((list) => {
        setHackathons(list)
        setSelectedId((current) => current ?? list[0]?.id ?? null)
      })
      .catch(() => setHackathons([]))
      .finally(() => setHackathonsLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedId) return
    let cancelled = false
    apiGet<TeamLeaderboardEntry[]>(
      `/hackathons/${selectedId}/leaderboard`,
      false
    )
      .then((data) => {
        if (cancelled) return
        setEntries(data)
        setError(null)
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoadedId(selectedId)
      })
    return () => {
      cancelled = true
    }
  }, [selectedId])

  const selected = useMemo(
    () => hackathons.find((h) => h.id === selectedId) ?? null,
    [hackathons, selectedId]
  )

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-purple-500 selection:text-white">
      {/* Header */}
      <motion.header
        className="fixed inset-x-0 top-0 z-50 border-b border-slate-800 bg-slate-950/70 p-4 backdrop-blur-md"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4">
          <Link href="/" className="group flex items-center gap-2">
            <div className="rounded-xl bg-purple-600/20 p-2 text-purple-400 transition-colors group-hover:bg-purple-600 group-hover:text-white">
              <Rocket className="h-6 w-6" />
            </div>
            <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-xl font-bold text-transparent">
              HackHub
            </span>
          </Link>

          <div className="flex items-center gap-4 text-sm font-medium md:gap-6">
            <Link
              href="/showcase"
              className="hidden text-slate-300 transition-colors hover:text-white sm:block"
            >
              Showcase
            </Link>
            {isAuthenticated ? (
              <Button
                render={<Link href="/dashboard" />}
                nativeButton={false}
                variant="outline"
                size="sm"
                className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800 hover:text-white"
              >
                Go To Dashboard
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  render={<Link href="/signin" />}
                  nativeButton={false}
                  variant="outline"
                  size="sm"
                  className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800 hover:text-white"
                >
                  Sign In
                </Button>
                <Button
                  render={<Link href="/signup" />}
                  nativeButton={false}
                  size="sm"
                  className="bg-purple-600 text-white hover:bg-purple-500"
                >
                  Sign Up
                </Button>
              </div>
            )}
          </div>
        </nav>
      </motion.header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-12">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-0 left-1/4 h-72 w-72 rounded-full bg-purple-600/15 blur-[120px]"
            animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute right-1/4 bottom-0 h-72 w-72 rounded-full bg-amber-600/10 blur-[120px]"
            animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Badge
              variant="secondary"
              className="mb-6 gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-amber-300 backdrop-blur-md"
            >
              <ChartColumnIncreasing className="h-3.5 w-3.5 text-amber-400" />
              <span>Live Standings</span>
            </Badge>
            <h1 className="mb-4 text-4xl leading-[1.1] font-black tracking-tight sm:text-6xl">
              Team{" "}
              <span className="bg-gradient-to-r from-amber-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Leaderboard
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-slate-400">
              Every hackathon, ranked in real time by the judges&apos; average
              score. Pick a hackathon to see who&apos;s on top.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-24">
        {/* Hackathon selector */}
        {hackathonsLoading ? (
          <div className="mb-8 flex gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-9 w-36 rounded-full" />
            ))}
          </div>
        ) : hackathons.length > 0 ? (
          <motion.div
            className="mb-8 flex flex-wrap justify-center gap-3"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            {hackathons.map((hackathon) => {
              const isSelected = hackathon.id === selectedId
              return (
                <button
                  key={hackathon.id}
                  onClick={() => setSelectedId(hackathon.id)}
                  className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                    isSelected
                      ? "border-purple-500/50 bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                      : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {hackathon.name}
                </button>
              )
            })}
          </motion.div>
        ) : null}

        {!hackathonsLoading && hackathons.length === 0 && (
          <EmptyState
            icon={<Inbox className="h-8 w-8 text-slate-600" />}
            title="No active hackathons yet"
            description="Once a hackathon kicks off and judges start scoring, the standings will appear here."
          />
        )}

        {entriesLoading && (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        )}

        {!entriesLoading && error && (
          <EmptyState
            icon={<Inbox className="h-8 w-8 text-slate-600" />}
            title="Couldn't load the leaderboard"
            description={error}
          />
        )}

        {!entriesLoading && !error && hackathons.length > 0 && (
          <>
            <motion.div
              className="mb-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <h2 className="text-2xl font-bold text-slate-100">
                {selected?.name}
              </h2>
              {selected?.tagline && (
                <p className="mt-1 text-sm text-slate-500">
                  {selected.tagline}
                </p>
              )}
            </motion.div>

            {entries.length === 0 ? (
              <EmptyState
                icon={<Trophy className="h-8 w-8 text-slate-600" />}
                title="No scores yet"
                description="Teams show up here once the judges have scored their submissions. Check back soon!"
              />
            ) : (
              <div className="space-y-3">
                {entries.map((entry, index) => {
                  const rankClass =
                    rankStyles[entry.rank] ??
                    "border-slate-800 bg-slate-900/60 text-slate-400"
                  return (
                    <motion.div
                      key={`${entry.teamId}-${entry.projectId}`}
                      initial={{ y: 15, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.35, delay: index * 0.06 }}
                    >
                      <Card
                        className={`border bg-slate-900/60 transition-colors hover:border-purple-500/40 ${rankClass.split(" ")[0]}`}
                      >
                        <CardContent className="flex items-center gap-4 p-5">
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border font-bold ${rankClass}`}
                          >
                            {rankIcons[entry.rank] ?? (
                              <span className="text-sm">#{entry.rank}</span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-lg font-semibold text-slate-100">
                                {entry.teamName}
                              </p>
                              <Badge
                                variant="secondary"
                                className="gap-1 border border-slate-700 bg-slate-800/60 text-slate-400"
                              >
                                <Users className="h-3 w-3" />
                                {entry.judgeCount} judge
                                {entry.judgeCount === 1 ? "" : "s"}
                              </Badge>
                            </div>
                            <p className="truncate text-sm text-slate-500">
                              {entry.projectTitle}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-2xl font-black text-slate-100">
                              {entry.averageScore}
                            </p>
                            <p className="text-xs text-slate-500">avg score</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 bg-slate-950 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-purple-400" />
            <span className="font-bold text-slate-200">HackHub</span>
          </div>
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} HackHub. Built for creators, by
            creators.
          </p>
        </div>
      </footer>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 px-6 py-16 text-center"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900">
        {icon}
      </div>
      <h3 className="mb-1 text-lg font-semibold text-slate-200">{title}</h3>
      <p className="max-w-md text-sm text-slate-500">{description}</p>
    </motion.div>
  )
}
