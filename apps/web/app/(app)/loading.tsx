import { Skeleton } from "@workspace/ui/components/skeleton"

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950">
      <Skeleton className="h-10 w-10 rounded-xl bg-slate-900" />
      <p className="text-sm text-slate-400">Loading…</p>
    </div>
  )
}
