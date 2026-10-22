"use client"

import { JudgeShell } from "@/components/judge-shell"

export default function JudgeGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <JudgeShell>{children}</JudgeShell>
}
