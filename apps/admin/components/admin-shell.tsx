"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  FolderKanban,
  Gavel,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react"
import { clearAdminUser, useAdminUser } from "@/lib/auth"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"

const NAV_ITEMS = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/judges", label: "Judges", icon: Gavel },
]

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string
  onNavigate?: () => void
}) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
              (active
                ? "bg-violet-600/15 text-violet-300"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-100")
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function SignOutButton({ onSignOut }: { onSignOut: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onSignOut}
      className="w-full justify-start gap-3 text-slate-400 hover:text-slate-100"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </Button>
  )
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, hydrated } = useAdminUser()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  React.useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const handleSignOut = React.useCallback(() => {
    clearAdminUser()
    router.replace("/login")
  }, [router])

  if (!hydrated) {
    return (
      <div className="flex min-h-screen bg-slate-950">
        <aside className="hidden w-60 border-r border-slate-800 bg-slate-950 p-4 lg:block">
          <Skeleton className="mb-8 h-8 w-32 bg-slate-900" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 rounded-lg bg-slate-900" />
            ))}
          </div>
        </aside>
        <div className="flex-1">
          <div className="flex h-14 items-center border-b border-slate-800 px-4">
            <Skeleton className="h-8 w-8 rounded-lg bg-slate-900" />
          </div>
          <div className="p-6">
            <Skeleton className="h-64 rounded-xl bg-slate-900" />
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    router.replace("/login")
    return null
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-950 py-4 lg:flex">
        <div className="mb-8 flex items-center gap-2 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600/20 text-violet-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-100">HackHub</p>
            <p className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">
              Admin
            </p>
          </div>
        </div>
        <NavLinks pathname={pathname} />
        <div className="mt-auto border-t border-slate-800 px-3 pt-4">
          <p className="mb-2 truncate px-3 text-xs text-slate-500">
            {user.email}
          </p>
          <SignOutButton onSignOut={handleSignOut} />
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-slate-800 bg-slate-950 py-4">
            <div className="mb-8 flex items-center justify-between px-6">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600/20 text-violet-400">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-100">HackHub</p>
                  <p className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">
                    Admin
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-900 hover:text-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
            <div className="mt-auto border-t border-slate-800 px-3 pt-4">
              <p className="mb-2 truncate px-3 text-xs text-slate-500">
                {user.email}
              </p>
              <SignOutButton onSignOut={handleSignOut} />
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-slate-800 bg-slate-950/90 px-4 backdrop-blur">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-slate-100 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-semibold text-slate-200">
            {NAV_ITEMS.find(
              (i) => pathname === i.href || pathname.startsWith(`${i.href}/`)
            )?.label ?? "Admin"}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-xs text-slate-500 sm:inline">
              {user.email}
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600/20 text-xs font-bold text-violet-300">
              {user.email.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
