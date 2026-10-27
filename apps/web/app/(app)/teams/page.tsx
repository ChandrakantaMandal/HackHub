"use client"

import { useCallback, useEffect, useState } from "react"
import { Copy, Loader2, Plus, Trash2, UserPlus, Users } from "lucide-react"
import { toast } from "sonner"
import { apiDelete, apiGet, apiPost } from "@/lib/client"
import { useAppStore } from "@/store/useAppStore"
import { useHydrated } from "@/lib/useHydrated"
import type { Team, TeamMember } from "@/lib/types"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Separator } from "@workspace/ui/components/separator"
import { Skeleton } from "@workspace/ui/components/skeleton"

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function MemberRow({ member }: { member: TeamMember }) {
  const name =
    member.user?.name || member.user?.username || member.userId.slice(0, 8)
  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="bg-violet-600/20 text-xs font-semibold text-violet-300">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-200">{name}</p>
        {member.user?.username && (
          <p className="truncate text-xs text-slate-500">
            @{member.user.username}
          </p>
        )}
      </div>
      <Badge
        variant={member.role === "LEADER" ? "default" : "outline"}
        className={
          member.role === "LEADER"
            ? "bg-violet-600 text-white hover:bg-violet-600"
            : "border-slate-700 text-slate-400"
        }
      >
        {member.role === "LEADER" ? "Leader" : "Member"}
      </Badge>
    </div>
  )
}

export default function TeamsPage() {
  const hydrated = useHydrated()
  const user = useAppStore((s) => s.user)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await apiGet<Team[]>("/projects/teams")
      setTeams(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load teams")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (hydrated) void load()
  }, [hydrated, load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      await apiPost<Team>("/projects/teams", {
        name: newName.trim(),
        userId: user?.user?.id,
      })
      setNewName("")
      toast.success("Team created")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create team")
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim()) return
    setJoining(true)
    try {
      await apiPost("/projects/teams/join", {
        inviteCode: joinCode.trim(),
        userId: user?.user?.id,
      })
      setJoinCode("")
      toast.success("Joined team")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to join team")
    } finally {
      setJoining(false)
    }
  }

  const handleLeave = async (team: Team) => {
    const memberUserId = user?.user?.id
    if (!memberUserId) return
    try {
      await apiDelete(`/projects/teams/${team.id}/members/${memberUserId}`)
      toast.success("Left team")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to leave team")
    }
  }

  const handleDelete = async (team: Team) => {
    try {
      await apiDelete(`/projects/teams/${team.id}`)
      toast.success("Team deleted")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete team")
    }
  }

  const copyInvite = (code: string) => {
    void navigator.clipboard.writeText(code)
    toast.success("Invite code copied")
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Plus className="h-4 w-4 text-violet-400" />
              Create a team
            </CardTitle>
            <CardDescription className="text-slate-500">
              Start a new squad for the hackathon
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team-name" className="text-slate-300">
                  Team name
                </Label>
                <Input
                  id="team-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Neural Nomads"
                  className="border-slate-800 bg-slate-950 text-slate-100"
                  maxLength={50}
                />
              </div>
              <Button
                type="submit"
                disabled={creating || !newName.trim()}
                className="bg-violet-600 text-white hover:bg-violet-500"
              >
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create team
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <UserPlus className="h-4 w-4 text-violet-400" />
              Join a team
            </CardTitle>
            <CardDescription className="text-slate-500">
              Enter an invite code from a teammate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-code" className="text-slate-300">
                  Invite code
                </Label>
                <Input
                  id="invite-code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="e.g. a1b2c3d4"
                  className="border-slate-800 bg-slate-950 font-mono text-slate-100"
                />
              </div>
              <Button
                type="submit"
                disabled={joining || !joinCode.trim()}
                variant="outline"
                className="border-slate-700 text-slate-200 hover:bg-slate-800"
              >
                {joining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Join team
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-100">
          <Users className="h-5 w-5 text-violet-400" />
          Your teams
        </h2>

        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl bg-slate-900" />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && teams.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-800 p-10 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-slate-700" />
            <p className="text-sm text-slate-400">
              You&apos;re not in any teams yet. Create one or join with an
              invite code.
            </p>
          </div>
        )}

        {!loading && teams.length > 0 && (
          <div className="space-y-4">
            {teams.map((team) => {
              const isOwner = team.ownerId === user?.user?.id
              return (
                <Card
                  key={team.id}
                  className="border-slate-800 bg-slate-900/50"
                >
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-slate-100">
                        {team.name}
                      </CardTitle>
                      <CardDescription className="text-slate-500">
                        {team.members?.length ?? 0} member
                        {(team.members?.length ?? 0) === 1 ? "" : "s"}
                      </CardDescription>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {isOwner ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-slate-500 hover:text-red-400"
                          onClick={() => handleDelete(team)}
                          aria-label="Delete team"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-500 hover:text-red-400"
                          onClick={() => handleLeave(team)}
                        >
                          Leave
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {team.inviteCode && isOwner && (
                      <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
                        <span className="text-xs text-slate-500">
                          Invite code
                        </span>
                        <code className="flex-1 font-mono text-sm text-violet-300">
                          {team.inviteCode}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-slate-200"
                          onClick={() => copyInvite(team.inviteCode!)}
                          aria-label="Copy invite code"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                    <Separator className="bg-slate-800" />
                    <div className="space-y-3">
                      {team.members?.map((m) => (
                        <MemberRow key={m.id} member={m} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
