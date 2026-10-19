"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation" // Next.js Router
import { Loader, ArrowRight } from "lucide-react"
import { Rocket } from "lucide-react"
import { motion } from "framer-motion"
import { useAppStore } from "../../store/useAppStore"
import { toast } from "sonner"
import { useHydrated } from "../../lib/useHydrated"

// UI Imports
import { Button } from "@workspace/ui/components/button"

// Get pending email from localStorage (set during registration)
const getPendingEmail = () => {
  if (typeof window === "undefined") return null
  return localStorage.getItem("pendingVerificationEmail")
}

const EmailVerificationPage = () => {
  const [code, setCode] = useState(["", "", "", "", "", ""])
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  const router = useRouter()
  const { error, isLoading, verifyEmail } = useAppStore()

  // Prevent SSR hydration mismatch
  const hasMounted = useHydrated()

  const handleChange = (index: number, value: string) => {
    const newCode = [...code]

    if (value.length > 1) {
      const pastedCode = value.slice(0, 6).split("")
      for (let i = 0; i < 6; i++) {
        newCode[i] = pastedCode[i] || ""
      }
      setCode(newCode)
      const lastFilledIndex =
        newCode.length -
        1 -
        [...newCode].reverse().findIndex((digit) => digit !== "")
      const focusIndex = lastFilledIndex < 5 ? lastFilledIndex + 1 : 5
      inputRefs.current[focusIndex]?.focus()
    } else {
      newCode[index] = value
      setCode(newCode)
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus()
      }
    }
  }

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault()
      const verificationCode = code.join("")

      if (verificationCode.length !== 6) {
        console.error("Please enter a valid 6-digit code")
        return
      }

      try {
        const email = getPendingEmail()
        if (!email) {
          toast.error("Email not found. Please register again.")
          router.push("/signup")
          return
        }
        await verifyEmail(email, verificationCode)
        toast.success("Email Verified Successfully! Account created.")
        router.push("/dashboard")
      } catch (err) {
        const errorMessage =
          err instanceof Error && err.message
            ? err.message
            : "Verification failed"
        console.error("Verification error:", errorMessage)
        toast.error(errorMessage)

        if (
          errorMessage.includes("expired") ||
          errorMessage.includes("Invalid")
        ) {
          setTimeout(() => {
            toast.error("Please register again")
            router.push("/signup")
          }, 2000)
        }
      }
    },
    [code, router, verifyEmail]
  )

  useEffect(() => {
    if (code.every((digit) => digit !== "")) {
      handleSubmit()
    }
  }, [code, handleSubmit])

  if (!hasMounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <div className="h-[400px] w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/60 p-8" />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4 text-slate-50 selection:bg-purple-500 selection:text-white">
      {/* Background Glowing Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-10 -left-10 h-80 w-80 rounded-full bg-purple-600/20 blur-[120px]"
          animate={{
            x: [0, 80, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -right-10 -bottom-10 h-96 w-96 rounded-full bg-blue-600/15 blur-[140px]"
          animate={{
            x: [0, -100, 0],
            y: [0, 80, 0],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Main Card Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="mb-3 inline-block"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-600/20 text-purple-400">
                <Rocket className="h-6 w-6" />
              </div>
            </motion.div>
            <h1 className="mb-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Verify Your Email
            </h1>
            <p className="text-sm text-slate-400">
              Enter the 6-digit code sent to your email address
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-between gap-2 sm:gap-3">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el
                  }}
                  maxLength={6}
                  type="text"
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="h-12 w-11 rounded-xl border border-slate-800 bg-slate-950/60 text-center text-xl font-bold text-slate-100 transition-all duration-200 focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/50 focus:outline-none sm:h-14 sm:w-12"
                />
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center text-xs font-medium text-red-400"
              >
                {error}
              </motion.div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="h-11 w-full gap-2 rounded-xl bg-purple-600 font-medium text-white shadow-lg shadow-purple-600/20 transition-all hover:bg-purple-500"
            >
              {isLoading ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Verify Email
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

export default EmailVerificationPage
