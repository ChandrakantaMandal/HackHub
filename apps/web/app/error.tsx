"use client"

import Link from "next/link"
import { useEffect } from "react"
import { AlertTriangle, Home } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-900/50 bg-red-950/30">
        <AlertTriangle className="h-8 w-8 text-red-400" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-100">
          Something went wrong
        </h1>
        <p className="max-w-md text-sm text-slate-400">
          An unexpected error occurred while loading this page. You can try
          again or head back home.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-slate-600">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <Button
          onClick={reset}
          className="bg-violet-600 text-white hover:bg-violet-500"
        >
          Try again
        </Button>
        <Button
          render={<Link href="/" />}
          variant="outline"
          className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
        >
          <Home className="mr-1.5 h-4 w-4" />
          Back home
        </Button>
      </div>
    </div>
  )
}
