"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Mail, User, Lock, Loader, ArrowRight, Eye, EyeOff } from "lucide-react"
import { Rocket } from "lucide-react"

// Shadcn UI Imports
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import { Button } from "@workspace/ui/components/button"

import PasswordStrengthMeter from "../../components/PasswordStrengthMeter"
import { useAppStore } from "../../store/useAppStore"

const SignupPage = () => {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)

  const { register, error, isLoading } = useAppStore()
  const router = useRouter()

  // Prevent hydration mismatches with Next.js SSR
  useEffect(() => {
    setHasMounted(true)
  }, [])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await register(name, email, password, confirmPassword)
      router.push("/verify-email")
    } catch (err) {
      console.error(err)
    }
  }

  if (!hasMounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <div className="h-[550px] w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/60 p-8" />
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

      {/* Main Card */}
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
              Create Account
            </h1>
            <p className="text-sm text-slate-400">
              Join HackHub and start building amazing projects
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignUp} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                Full Name
              </label>
              <InputGroup className="rounded-xl border-slate-800 bg-slate-950/60 transition-all focus-within:border-purple-500/80 focus-within:ring-1 focus-within:ring-purple-500/50">
                <InputGroupAddon align="inline-start">
                  <User className="h-4 w-4 text-slate-400" />
                </InputGroupAddon>
                <InputGroupInput
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-none bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus-visible:ring-0"
                  required
                />
              </InputGroup>
            </div>

            {/* Email Address */}
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
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-none bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus-visible:ring-0"
                  required
                />
              </InputGroup>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                Password
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

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-400"
              >
                {error}
              </motion.div>
            )}

            {/* Strength Meter */}
            <PasswordStrengthMeter password={password} />

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="h-12 w-full rounded-xl bg-purple-600 font-semibold text-white shadow-lg shadow-purple-600/20 transition-all duration-200 hover:bg-purple-500"
            >
              {isLoading ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-slate-900 px-3 text-slate-400">
                  Already have an account?
                </span>
              </div>
            </div>

            {/* Sign In Secondary Button */}
            <Button
              render={<Link href="/signin" />}
              nativeButton={false}
              variant="outline"
              className="h-11 w-full rounded-xl border-slate-800 bg-slate-950/40 text-sm text-slate-200 transition-all hover:bg-slate-800 hover:text-white"
            >
              Sign In Instead
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

export default SignupPage
