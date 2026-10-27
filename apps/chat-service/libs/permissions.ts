// DM permission matrix — enforced in both searchUsers (directory filtering)
// and startDm (creation), so users never see or reach people they may not DM.
//
// Product rules:
//   - Judges only message judges (and admins). Judges never message participants.
//   - Admins message judges and team leaders only.
//   - A team leader (the participant who owns a team) may message the admin.
//   - Plain participants (members without a team they lead) cannot DM judges
//     or the admin; they can DM other participants.

export type DmActor = {
  role: "ADMIN" | "JUDGE" | "PARTICIPANT"
  isLeader: boolean
}

export const canDm = (me: DmActor, target: DmActor): boolean => {
  // Judges are reachable by judges and admins only.
  if (target.role === "JUDGE") {
    return me.role === "JUDGE" || me.role === "ADMIN"
  }

  // Admins are reachable by judges, admins, and team leaders.
  if (target.role === "ADMIN") {
    return me.role === "JUDGE" || me.role === "ADMIN" || me.isLeader
  }

  // Target is a participant.
  if (me.role === "JUDGE") return false
  if (me.role === "ADMIN") return target.isLeader

  // Participant-to-participant (leader or member) is always allowed.
  return true
}
