"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  FolderKanban,
  Lightbulb,
  Loader2,
  LogOut,
  MessageCircle,
  Users,
  Zap,
  Trophy,
} from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { useAppStore } from "@/store/useAppStore"
import { useHydrated } from "@/lib/useHydrated"
import { startUnreadPolling, useChatUnread } from "@/store/useChatUnread"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hackathons", label: "Hackathons", icon: Trophy },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/showcase", label: "Showcase", icon: Lightbulb },
]

export function SidebarFooter({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter()
  const logout = useAppStore((s) => s.logout)
  const profile = useAppStore((s) => s.user)
  const [busy, setBusy] = useState(false)

  const name =
    profile?.user?.name?.trim() || profile?.user?.username || "Signed in"
  const email = profile?.email ?? ""

  const handleLogout = async () => {
    setBusy(true)
    await logout()
    router.replace("/signin")
  }

  return (
    <div className="flex flex-col gap-1.5 border-t border-slate-800 p-3">
      <button
        type="button"
        onClick={() => {
          router.push("/profile")
          onNavigate?.()
        }}
        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-800/60"
      >
        <Avatar size="sm">
          {profile?.user?.avatar ? (
            <AvatarImage
              src={profile.user.avatar}
              alt={name}
              className="border-none"
            />
          ) : null}
          <AvatarFallback className="bg-violet-500/20 text-[10px] font-semibold text-violet-300">
            {name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-slate-200">{name}</p>
          {email ? (
            <p className="truncate text-[11px] text-slate-500">{email}</p>
          ) : null}
        </div>
      </button>

      <button
        type="button"
        onClick={handleLogout}
        disabled={busy}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-slate-200 disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <LogOut className="h-3.5 w-3.5" />
        )}
        Log out
      </button>
    </div>
  )
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const mounted = useHydrated()
  const hasHydrated = useAppStore((s) => s.hasHydrated)
  const accessToken = useAppStore((s) => s.accessToken)
  const totalUnread = useChatUnread((s) => s.total)

  // The chat page socket bumps counts live; everywhere else we poll the
  // summary endpoint so the badge stays fresh across the app. Polling is a
  // store-level singleton (desktop + mobile sidebars share one interval).
  useEffect(() => {
    if (!mounted || !hasHydrated || !accessToken) return
    return startUnreadPolling()
  }, [mounted, hasHydrated, accessToken])

  return (
    <nav className="flex flex-col gap-1 px-3">
      {navItems.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-violet-500/15 text-violet-400"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
            {item.href === "/chat" && totalUnread > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-500 px-1.5 text-[10px] font-semibold text-white">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

export function SidebarBrand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-6 py-5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
        <Zap className="h-4 w-4 text-white" />
      </span>
      <span className="text-lg font-bold tracking-tight text-white">
        Hack<span className="text-violet-400">Hub</span>
      </span>
    </Link>
  )
}
