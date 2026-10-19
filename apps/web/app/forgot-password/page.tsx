"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  ArrowRight,
  Loader,
  Mail,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react"
import { Rocket } from "lucide-react"
import { toast } from "sonner"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import { Button } from "@workspace/ui/components/button"

import { useAppStore } from "../../store/useAppStore"
import { useHydrated } from "../../lib/useHydrated"

const ForgotPasswordPage = () => {
  const router = useRouter()

  const [step, setStep] = useState<"email" | "reset">("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    isLoading,
    forgotPassword,
    resetPassword,
    message,
    clearError,
    clearMessage,
  } = useAppStore()

  const hasMounted = useHydrated()

  useEffect(() => {
    if (message === "Password reset successfully") {
      toast.success(message)
      clearMessage()
      router.push("/signin")
    }
  }, [message, clearMessage, router])

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!email) {
      toast.error("Please enter your email address")
      return
    }

    try {
      await forgotPassword(email)
      toast.success("OTP sent to your email")
      setStep("reset")
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Failed to send OTP. Try again."
      )
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!otp) {
      toast.error("Please enter the OTP")
      return
    }
    if (!newPassword) {
      toast.error("Please enter a new password")
      return
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    try {
      await resetPassword(email, otp, newPassword, confirmPassword)
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Failed to reset password. Try again."
      )
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
          animate={{ x: [0, 80, 0], y: [0, -50, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-10 -bottom-10 h-96 w-96 rounded-full bg-blue-600/15 blur-[140px]"
          animate={{ x: [0, -100, 0], y: [0, 80, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
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
              {step === "email"
                ? "Enter your email to receive a reset OTP"
                : "Enter the OTP and your new password"}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === "email" ? (
              <motion.form
                key="email-step"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleSendOtp}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Email Address
                  </label>
                  <InputGroup className="rounded-xl border-slate-800 bg-slate-950/60 transition-all focus-within:border-purple-500/80 focus-within:ring-1 focus-within:ring-purple-500/50">
                    <InputGroupAddon align="inline-start">
                      <Mail className="h-4 w-4 text-slate-400" />
                    </InputGroupAddon>
                    <InputGroupInput
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-none bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus-visible:ring-0"
                      required
                    />
                  </InputGroup>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="mt-2 h-11 w-full gap-2 rounded-xl bg-purple-600 font-medium text-white shadow-lg shadow-purple-600/20 transition-all hover:bg-purple-500"
                >
                  {isLoading ? (
                    <Loader className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Send OTP
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <div className="pt-2 text-center">
                  <Link
                    href="/signin"
                    className="inline-flex items-center text-xs text-slate-400 transition-colors hover:text-slate-200"
                  >
                    <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                    Back to Sign In
                  </Link>
                </div>
              </motion.form>
            ) : (
              <motion.form
                key="reset-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleResetPassword}
                className="space-y-4"
              >
                {/* OTP */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    OTP Code
                  </label>
                  <InputGroup className="rounded-xl border-slate-800 bg-slate-950/60 transition-all focus-within:border-purple-500/80 focus-within:ring-1 focus-within:ring-purple-500/50">
                    <InputGroupAddon align="inline-start">
                      <ShieldCheck className="h-4 w-4 text-slate-400" />
                    </InputGroupAddon>
                    <InputGroupInput
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      className="border-none bg-transparent text-sm tracking-widest text-slate-100 placeholder:text-slate-500 focus-visible:ring-0"
                      maxLength={6}
                      required
                    />
                  </InputGroup>
                </div>

                {/* New Password */}
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
                      placeholder="Min 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="border-none bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus-visible:ring-0"
                      required
                    />
                    <InputGroupAddon align="inline-end">
                      <button
                        type="button"
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

                {/* Confirm Password */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Confirm Password
                  </label>
                  <InputGroup className="rounded-xl border-slate-800 bg-slate-950/60 transition-all focus-within:border-purple-500/80 focus-within:ring-1 focus-within:ring-purple-500/50">
                    <InputGroupAddon align="inline-start">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </InputGroupAddon>
                    <InputGroupInput
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="border-none bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus-visible:ring-0"
                      required
                    />
                    <InputGroupAddon align="inline-end">
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="text-slate-400 transition-colors hover:text-slate-200"
                      >
                        {showConfirm ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </InputGroupAddon>
                  </InputGroup>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="mt-2 h-11 w-full gap-2 rounded-xl bg-purple-600 font-medium text-white shadow-lg shadow-purple-600/20 transition-all hover:bg-purple-500"
                >
                  {isLoading ? (
                    <Loader className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Reset Password
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setStep("email")}
                    className="inline-flex items-center text-xs text-slate-400 transition-colors hover:text-slate-200"
                  >
                    <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                    Change email
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

export default ForgotPasswordPage
