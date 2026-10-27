import prisma from "@workspace/database"

export type ChatIdentity = { id: string; role: string }

// The gateway injects the JWT subject as x-user-id, which is the *account* id
// (auth-service signs generateAccessToken(account.id, ...)). Chat authorization
// compares against User.id (TeamMember.userId, Message.senderId), so the
// account id must be mapped to the user row here — for both the REST path
// (middleware/chat.middleware.ts) and the Socket.io handshake (src/socket.ts).
// Role comes from the DB (authoritative, fresher than the JWT claim); the
// x-user-role header is ignored. Fail-closed: unknown account -> null.
export const resolveUser = async (
  accountId: string
): Promise<ChatIdentity | null> => {
  const user = await prisma.user.findUnique({
    where: { accountId },
    select: { id: true, role: true },
  })
  if (!user) return null
  return { id: user.id, role: user.role }
}
