"use client"

import Link from "next/link"
import { Zap } from "lucide-react"
import { useAppStore } from "@/store/useAppStore"
import { useHydrated } from "@/lib/useHydrated"
import { Button } from "@workspace/ui/components/button"

export function ShowcaseShell({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated()
  const accessToken = useAppStore((s) => s.accessToken)
  const isAuthenticated = hydrated && Boolean(accessToken)

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
              <Zap className="h-4 w-4 text-white" />
            </span>
            <span className="text-lg font-bold tracking-tight text-white">
              Hack<span className="text-violet-400">Hub</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              render={<Link href={isAuthenticated ? "/dashboard" : "/"} />}
              nativeButton={false}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-slate-100"
            >
              {isAuthenticated ? "Dashboard" : "Home"}
            </Button>
            {isAuthenticated ? (
              <Button
                render={<Link href="/hackathons" />}
                nativeButton={false}
                size="sm"
                className="bg-violet-600 text-white hover:bg-violet-500"
              >
                Hackathons
              </Button>
            ) : (
              <Button
                render={<Link href="/signin" />}
                nativeButton={false}
                size="sm"
                className="bg-violet-600 text-white hover:bg-violet-500"
              >
                Sign in
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 md:p-8">{children}</main>
    </div>
  )
}
