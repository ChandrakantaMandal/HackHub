"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, Variants } from "framer-motion"
import {
  Rocket,
  Users,
  BarChart3,
  Eye,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Trophy,
  MapPin,
  CalendarDays,
} from "lucide-react"

import { apiGet } from "@/lib/client"
import type { Hackathon } from "@/lib/types"
import { useAppStore } from "@/store/useAppStore"
import { useHydrated } from "@/lib/useHydrated"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"

interface Feature {
  icon: React.ElementType
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Work together seamlessly with your teammates in real-time with shared workspaces.",
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    description:
      "Visual charts and real-time analytics to monitor your project milestones.",
  },
  {
    icon: Eye,
    title: "Project Showcase",
    description:
      "Display your final projects in a public, high-visibility gallery for everyone to see.",
  },
  {
    icon: CheckCircle2,
    title: "Task Management",
    description:
      "Organize tasks and track deliverables with an intuitive agile board.",
  },
  {
    icon: Rocket,
    title: "Launch Ready",
    description:
      "Everything you need to turn a 48-hour hackathon project into a real startup.",
  },
]

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function LandingPage() {
  const [hackathons, setHackathons] = useState<Hackathon[]>([])
  const [hackathonsLoading, setHackathonsLoading] = useState(true)
  const accessToken = useAppStore((state) => state.accessToken)
  const hydrated = useHydrated()
  const isAuthenticated = hydrated && Boolean(accessToken)

  useEffect(() => {
    apiGet<Hackathon[]>("/hackathons", false)
      .then(setHackathons)
      .catch(() => setHackathons([]))
      .finally(() => setHackathonsLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-purple-500 selection:text-white">
      {/* Header */}
      <motion.header
        className="fixed inset-x-0 top-0 z-50 border-b border-slate-800 bg-slate-950/70 p-4 backdrop-blur-md"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4">
          <Link href="/" className="group flex items-center gap-2">
            <div className="rounded-xl bg-purple-600/20 p-2 text-purple-400 transition-colors group-hover:bg-purple-600 group-hover:text-white">
              <Rocket className="h-6 w-6" />
            </div>
            <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-xl font-bold text-transparent">
              HackHub
            </span>
          </Link>

          <div className="flex items-center gap-4 text-sm font-medium md:gap-6">
            <Link
              href="/showcase"
              className="hidden text-slate-300 transition-colors hover:text-white sm:block"
            >
              Showcase
            </Link>
            <Button
              render={
                <Link href={isAuthenticated ? "/dashboard" : "/signup"} />
              }
              nativeButton={false}
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800 hover:text-white"
            >
              {isAuthenticated ? "Go To Dashboard" : "Sign In"}
            </Button>
          </div>
        </nav>
      </motion.header>

      {/* Hero Section */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-24 pb-16">
        {/* Animated Background Gradients */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-1/4 -left-20 h-96 w-96 rounded-full bg-purple-600/20 blur-[120px]"
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
            className="absolute -right-20 bottom-1/4 h-[500px] w-[500px] rounded-full bg-blue-600/15 blur-[140px]"
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

        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center"
          >
            <motion.div variants={itemVariants} className="mb-6">
              <Badge
                variant="secondary"
                className="gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-purple-300 backdrop-blur-md"
              >
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                <span>The Future of Hackathon Platforms</span>
              </Badge>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="mb-8 text-5xl leading-[1.1] font-black tracking-tight sm:text-7xl lg:text-8xl"
            >
              Build. Collaborate.{" "}
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
                Showcase.
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mb-10 max-w-3xl text-lg leading-relaxed font-normal text-slate-400 sm:text-2xl"
            >
              The ultimate workspace for hackathon teams to organize tasks,
              track real-time progress, and present game-changing projects to
              the world.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex w-full flex-col justify-center gap-4 sm:w-auto sm:flex-row"
            >
              <Button
                render={
                  <Link href={isAuthenticated ? "/dashboard" : "/signup"} />
                }
                nativeButton={false}
                size="lg"
                className="h-12 gap-2 rounded-xl bg-purple-600 px-8 text-base text-white shadow-lg shadow-purple-600/25 hover:bg-purple-500"
              >
                {isAuthenticated ? "Go To Dashboard" : "Get Started Free"}
                <Rocket className="h-4 w-4" />
              </Button>
              <Button
                render={<Link href="/showcase" />}
                nativeButton={false}
                variant="outline"
                size="lg"
                className="h-12 gap-2 rounded-xl border-slate-800 bg-slate-900/50 px-8 text-base text-slate-200 backdrop-blur-sm hover:bg-slate-800 hover:text-white"
              >
                View Showcase
                <Eye className="h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 md:block"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="flex h-9 w-5 justify-center rounded-full border-2 border-slate-700 p-1">
            <div className="h-2 w-1 rounded-full bg-purple-400" />
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="border-t border-slate-800/80 bg-slate-900/50 py-28">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            className="mb-16 text-center"
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-5xl">
              Everything you need to{" "}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                succeed
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-400">
              From initial ideation to final pitch, HackHub provides all the
              dynamic tools required to build standard-setting software under
              pressure.
            </p>
          </motion.div>

          <motion.div
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div key={index} variants={itemVariants}>
                  <Card className="group h-full border-slate-800/80 bg-slate-900/60 transition-all duration-300 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/5">
                    <CardHeader>
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-400 transition-all duration-300 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white">
                        <Icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-xl font-semibold text-slate-100">
                        {feature.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm leading-relaxed text-slate-400">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* Active Hackathons Section */}
      {!hackathonsLoading && hackathons.length > 0 && (
        <section className="border-t border-slate-800/80 bg-slate-950 py-28">
          <div className="mx-auto max-w-7xl px-6">
            <motion.div
              className="mb-16 text-center"
              initial={{ y: 30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-5xl">
                Happening{" "}
                <span className="bg-gradient-to-r from-purple-400 to-amber-400 bg-clip-text text-transparent">
                  now
                </span>
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-slate-400">
                Register for an active hackathon, bring your team, and start
                building today.
              </p>
            </motion.div>

            <motion.div
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {hackathons.map((hackathon) => (
                <motion.div key={hackathon.id} variants={itemVariants}>
                  <Card className="group h-full border-slate-800/80 bg-slate-900/60 transition-all duration-300 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/5">
                    <CardHeader>
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 transition-all duration-300 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white">
                          <Trophy className="h-6 w-6" />
                        </div>
                        <Badge
                          variant="secondary"
                          className="border border-purple-500/20 bg-purple-500/10 text-purple-300"
                        >
                          {hackathon.participantCount} participant
                          {hackathon.participantCount === 1 ? "" : "s"}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl font-semibold text-slate-100">
                        {hackathon.name}
                      </CardTitle>
                      {hackathon.tagline && (
                        <CardDescription className="text-sm leading-relaxed text-slate-400">
                          {hackathon.tagline}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="flex h-[calc(100%-8rem)] flex-col gap-4">
                      <div className="space-y-1.5 text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDate(hackathon.startDate)} –{" "}
                          {formatDate(hackathon.endDate)}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" />
                          {hackathon.location || "Online"}
                        </div>
                      </div>
                      <div className="mt-auto">
                        {hackathon.isRegistrationOpen ? (
                          <Button
                            render={
                              <Link
                                href={
                                  isAuthenticated ? "/hackathons" : "/signup"
                                }
                              />
                            }
                            nativeButton={false}
                            size="sm"
                            className="w-full gap-2 rounded-xl bg-purple-600 text-white hover:bg-purple-500"
                          >
                            Register
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        ) : (
                          <p className="text-center text-xs text-slate-600">
                            Registration closed
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="relative overflow-hidden py-24">
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="relative rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-10 shadow-2xl md:p-16"
          >
            <h2 className="mb-6 text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Ready to build something amazing?
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-lg text-slate-400">
              Join thousands of developers, designers, and innovators using
              HackHub to bring ideas to life.
            </p>
            <Button
              render={
                <Link href={isAuthenticated ? "/dashboard" : "/signup"} />
              }
              nativeButton={false}
              size="lg"
              className="h-12 gap-2 rounded-xl bg-purple-600 px-8 text-white shadow-lg shadow-purple-600/20 hover:bg-purple-500"
            >
              {isAuthenticated ? "Go To Dashboard" : "Start Your Journey"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 bg-slate-950 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-purple-400" />
            <span className="font-bold text-slate-200">HackHub</span>
          </div>
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} HackHub. Built for creators, by
            creators.
          </p>
        </div>
      </footer>
    </div>
  )
}
