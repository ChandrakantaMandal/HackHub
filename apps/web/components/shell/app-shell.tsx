"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAppStore } from "@/store/useAppStore"
import { useHydrated } from "@/lib/useHydrated"
import { Separator } from "@workspace/ui/components/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { SidebarBrand, SidebarNav } from "./sidebar"
import { Topbar } from "./topbar"

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated()
  const router = useRouter()
  const accessToken = useAppStore((s) => s.accessToken)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (hydrated && !accessToken) router.replace("/signin")
  }, [hydrated, accessToken, router])

  if (!hydrated || !accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-800 bg-slate-900/50 md:flex">
        <SidebarBrand />
        <Separator className="bg-slate-800" />
        <div className="mt-4 flex-1">
          <SidebarNav />
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-72 border-slate-800 bg-slate-950 p-0"
        >
          <SheetHeader className="border-b border-slate-800 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
          </SheetHeader>
          <SidebarBrand />
          <Separator className="bg-slate-800" />
          <div className="mt-4">
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="md:pl-64">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
