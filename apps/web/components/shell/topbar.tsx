"use client"

import { usePathname, useRouter } from "next/navigation"
import {
  Menu,
  LogOut,
  User as UserIcon,
  ExternalLink,
  UserRound,
} from "lucide-react"
import { useAppStore } from "@/store/useAppStore"
import { useHydrated } from "@/lib/useHydrated"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

function pageTitle(pathname: string): string {
  if (pathname.startsWith("/dashboard")) return "Dashboard"
  if (pathname.startsWith("/teams")) return "Teams"
  if (pathname.startsWith("/chat")) return "Chat"
  if (pathname.startsWith("/projects")) return "Projects"
  if (pathname.startsWith("/showcase")) return "Showcase"
  if (pathname.startsWith("/profile")) return "Profile"
  return "HackHub"
}

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const hydrated = useHydrated()
  const user = useAppStore((s) => s.user)
  const logout = useAppStore((s) => s.logout)

  const username = hydrated && user?.user.username ? user.user.username : ""
  const initial = username ? username.charAt(0).toUpperCase() : "?"

  const handleLogout = async () => {
    await logout()
    router.replace("/signin")
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-800 bg-slate-950/80 px-4 backdrop-blur md:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="text-slate-400 md:hidden"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <h1 className="text-lg font-semibold text-slate-100">
        {pageTitle(pathname)}
      </h1>
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="hidden text-slate-400 hover:text-slate-100 sm:flex"
          onClick={() => router.push("/showcase")}
        >
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
          Public showcase
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <Avatar className="h-8 w-8">
              {hydrated && user?.user.avatar ? (
                <AvatarImage
                  src={user.user.avatar}
                  alt={username || "Avatar"}
                  className="border-none"
                />
              ) : null}
              <AvatarFallback className="bg-violet-600/20 text-xs font-semibold text-violet-300">
                {initial}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium text-slate-100">
                {username || "Signed in"}
              </p>
              {user?.email && (
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {user.email}
                </p>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <UserRound className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/dashboard")}>
              <UserIcon className="mr-2 h-4 w-4" />
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
