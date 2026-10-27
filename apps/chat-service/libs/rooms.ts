export type RoomIdentity =
  | { kind: "team"; teamId: string }
  | { kind: "judge" }
  | { kind: "direct"; teamId: string; judgeId: string }
  | { kind: "dm"; userA: string; userB: string }

export type RoomAuthResult =
  | { ok: true; identity: RoomIdentity }
  | { ok: false; error: string }

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Room-name protocol (denormalized linkage, no FK to Hackathon):
//   team_<teamId>              -> TEAM
//   judge                      -> JUDGE (global moderator room)
//   judge_<anything>           -> JUDGE (per-hackathon string used as-is)
//   channel_<teamId>_<judgeId> -> DIRECT
//   dm_<userA>_<userB>         -> DIRECT (canonical: lowercased, sorted ids)
// UUIDs contain no underscores, so the split points are unambiguous.
// Canonical 1:1 conversation name: dm_<min>_<max> of the lowercased ids.
export const dmRoomName = (a: string, b: string): string => {
  const [x, y] = [a.toLowerCase(), b.toLowerCase()].sort()
  return `dm_${x}_${y}`
}

export const parseRoomName = (room: string): RoomIdentity | null => {
  if (room === "judge" || room.startsWith("judge_")) {
    return { kind: "judge" }
  }

  if (room.startsWith("team_")) {
    const teamId = room.slice("team_".length)
    if (!UUID_RE.test(teamId)) return null
    return { kind: "team", teamId }
  }

  if (room.startsWith("channel_")) {
    const rest = room.slice("channel_".length)
    const sep = rest.indexOf("_")
    if (sep <= 0) return null
    const teamId = rest.slice(0, sep)
    const judgeId = rest.slice(sep + 1)
    if (!UUID_RE.test(teamId) || !UUID_RE.test(judgeId)) return null
    return { kind: "direct", teamId, judgeId }
  }

  if (room.startsWith("dm_")) {
    const rest = room.slice("dm_".length)
    const sep = rest.indexOf("_")
    if (sep <= 0) return null
    const userA = rest.slice(0, sep)
    const userB = rest.slice(sep + 1)
    if (!UUID_RE.test(userA) || !UUID_RE.test(userB)) return null
    if (userA === userB) return null
    if (room !== dmRoomName(userA, userB)) return null
    return { kind: "dm", userA, userB }
  }

  return null
}

type TeamMemberDb = {
  teamMember: {
    findUnique: (args: {
      where: { teamId_userId: { teamId: string; userId: string } }
    }) => Promise<{ teamId: string; userId: string } | null>
  }
}

const isTeamMember = async (
  db: TeamMemberDb,
  teamId: string,
  userId: string
) => {
  const member = await db.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  })
  return member !== null
}

// Single authorization gate shared by REST history and Socket.io join/send.
// judge rooms require role JUDGE; team rooms require TeamMember membership;
// direct rooms allow the judge (by id + role) OR any team member;
// dm rooms allow only the two participants.
export const authorizeRoomAccess = async (
  db: TeamMemberDb,
  room: string,
  userId: string,
  role: string
): Promise<RoomAuthResult> => {
  const identity = parseRoomName(room)
  if (!identity) {
    return { ok: false, error: "Invalid room name" }
  }

  if (identity.kind === "judge") {
    if (role !== "JUDGE") {
      return { ok: false, error: "Judge role required" }
    }
    return { ok: true, identity }
  }

  if (identity.kind === "team") {
    const member = await isTeamMember(db, identity.teamId, userId)
    if (!member) {
      return { ok: false, error: "Not a member of this team" }
    }
    return { ok: true, identity }
  }

  if (identity.kind === "dm") {
    if (userId === identity.userA || userId === identity.userB) {
      return { ok: true, identity }
    }
    return { ok: false, error: "Not a participant of this conversation" }
  }

  // direct
  if (userId === identity.judgeId && role === "JUDGE") {
    return { ok: true, identity }
  }
  const member = await isTeamMember(db, identity.teamId, userId)
  if (!member) {
    return { ok: false, error: "Not authorized for this channel" }
  }
  return { ok: true, identity }
}
