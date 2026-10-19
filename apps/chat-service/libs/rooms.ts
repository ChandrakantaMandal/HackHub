export type RoomIdentity =
  | { kind: "team"; teamId: string }
  | { kind: "judge" }
  | { kind: "direct"; teamId: string; judgeId: string }

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
// UUIDs contain no underscores, so the split points are unambiguous.
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
// direct rooms allow the judge (by id + role) OR any team member.
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
