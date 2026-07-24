"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { motion } from "framer-motion"
import { Lock, Loader, ArrowRight, Eye, EyeOff } from "lucide-react"
import { Rocket } from "lucide-react"
import { toast } from "sonner"

// UI Components
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import { Button } from "@workspace/ui/components/button"

import { useAppStore } from "../../../store/useAppStore"

const ResetPasswordPage = () => {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)

  const { resetPassword, error, isLoading, message } = useAppStore()

  const params = useParams()
  const router = useRouter()

  // Extract token from route params (e.g. /reset-password/[token])
  const token = params?.token as string

  // Prevent SSR hydration mismatch
  useEffect(() => {
    setHasMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    try {
      await resetPassword(token, password)

      toast.success(
        "Password reset successfully, redirecting to sign in page..."
      )
      setTimeout(() => {
        router.push("/signin")
      }, 2000)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Error resetting password")
    }
  }

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
              Reset Password
            </h1>
            <p className="text-sm text-slate-400">
              Enter your new password below
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password Input */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                New Password
              </label>
              <InputGroup className="rounded-xl border-slate-800 bg-slate-950/60 transition-all focus-within:border-purple-500/80 focus-within:ring-1 focus-within:ring-purple-500/50">
                <InputGroupAddon align="inline-start">
                  <Lock className="h-4 w-4 text-slate-400" />
                </InputGroupAddon>
                <InputGroupInput
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-none bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus-visible:ring-0"
                  required
                />
                <InputGroupAddon align="inline-end">
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 transition-colors hover:text-slate-200"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </InputGroupAddon>
              </InputGroup>
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                Confirm Password
              </label>
              <InputGroup className="rounded-xl border-slate-800 bg-slate-950/60 transition-all focus-within:border-purple-500/80 focus-within:ring-1 focus-within:ring-purple-500/50">
                <InputGroupAddon align="inline-start">
                  <Lock className="h-4 w-4 text-slate-400" />
                </InputGroupAddon>
                <InputGroupInput
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="border-none bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus-visible:ring-0"
                  required
                />
                <InputGroupAddon align="inline-end">
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-slate-400 transition-colors hover:text-slate-200"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </InputGroupAddon>
              </InputGroup>
            </div>

            {/* Error Banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-400"
              >
                {error}
              </motion.div>
            )}

            {/* Success Banner */}
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-400"
              >
                {message}
              </motion.div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="mt-2 h-11 w-full gap-2 rounded-xl bg-purple-600 font-medium text-white shadow-lg shadow-purple-600/20 transition-all hover:bg-purple-500"
            >
              {isLoading ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Set New Password
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

export default ResetPasswordPage
