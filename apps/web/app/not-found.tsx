import Link from "next/link"
import { Compass, Home } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/50">
        <Compass className="h-8 w-8 text-violet-400" />
      </div>
      <div className="space-y-2">
        <p className="font-mono text-sm font-semibold tracking-widest text-violet-400">
          404
        </p>
        <h1 className="text-2xl font-bold text-slate-100">Page not found</h1>
        <p className="max-w-md text-sm text-slate-400">
          The page you are looking for doesn&apos;t exist or may have been
          moved.
        </p>
      </div>
      <Button
        render={<Link href="/" />}
        className="bg-violet-600 text-white hover:bg-violet-500"
      >
        <Home className="mr-1.5 h-4 w-4" />
        Back home
      </Button>
    </div>
  )
}
