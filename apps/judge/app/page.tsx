"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function JudgeIndexPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/submissions")
  }, [router])

  return null
}
