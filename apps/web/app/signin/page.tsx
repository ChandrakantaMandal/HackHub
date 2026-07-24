"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Mail,
  Lock,
  Loader2,
  Rocket,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"

import { useAppStore } from "@/store/useAppStore"

export default function SignInPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const { login, error, isLoading, hasHydrated } = useAppStore()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      await login(email, password)
      router.push("/dashboard")
    } catch (err) {
      console.error("Login failed:", err)
    }
  }

  // Prevent hydration layout shift while store reads from storage
  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4 selection:bg-purple-500 selection:text-white">
      {/* Background Glow Blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-10 -left-10 h-96 w-96 rounded-full bg-purple-600/20 blur-[120px]"
          animate={{
            x: [0, 80, 0],
            y: [0, -60, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -right-10 -bottom-10 h-96 w-96 rounded-full bg-blue-600/20 blur-[120px]"
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Main Form Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-2xl sm:p-10">
          {/* Header & Logo */}
          <div className="mb-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="mb-4 inline-block"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-400/30 bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg shadow-purple-500/25">
                <Rocket className="h-7 w-7 text-white" />
              </div>
            </motion.div>
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">
              Welcome Back
            </h1>
            <p className="text-sm text-slate-400">
              Sign in to continue your journey on HackHub
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-xs font-semibold tracking-wider text-slate-400 uppercase"
              >
                Email Address
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-12 rounded-xl border-slate-800 bg-slate-950/50 pl-11 text-slate-100 placeholder:text-slate-500 focus-visible:border-purple-500 focus-visible:ring-purple-500"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-xs font-semibold tracking-wider text-slate-400 uppercase"
                >
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-purple-400 transition-colors hover:text-purple-300"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-12 rounded-xl border-slate-800 bg-slate-950/50 pr-11 pl-11 text-slate-100 placeholder:text-slate-500 focus-visible:border-purple-500 focus-visible:ring-purple-500"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-3.5 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-200"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Alert
                  variant="destructive"
                  className="rounded-xl border-red-500/20 bg-red-500/10 text-red-400"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs font-medium">
                    {error}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="h-12 w-full rounded-xl bg-purple-600 font-semibold text-white shadow-lg shadow-purple-600/20 transition-all duration-200 hover:bg-purple-500"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Sign In"
              )}
            </Button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900/90 px-3 font-medium text-slate-500">
                  New to HackHub?
                </span>
              </div>
            </div>

            {/* Create Account Link/Button */}
            <Button
              render={<Link href="/signup" />}
              nativeButton={false}
              variant="outline"
              className="h-12 w-full rounded-xl border-slate-800 bg-slate-950/40 text-slate-200 transition-all duration-200 hover:bg-slate-800 hover:text-white"
            >
              Create New Account
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
