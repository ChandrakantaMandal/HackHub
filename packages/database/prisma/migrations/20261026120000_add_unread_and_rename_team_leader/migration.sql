-- Rename the team "owner" role to "leader" (product terminology change).
-- Postgres has no DROP VALUE for enums (and values cannot be renamed in
-- place), so the type is recreated without 'OWNER'. The column is widened
-- to TEXT first so the type can be swapped inside one transaction.
ALTER TABLE "TeamMember" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "TeamMember" ALTER COLUMN "role" TYPE TEXT USING "role"::text;

DROP TYPE "TeamRole";
CREATE TYPE "TeamRole" AS ENUM ('LEADER', 'MEMBER');

ALTER TABLE "TeamMember"
  ALTER COLUMN "role" TYPE "TeamRole"
  USING (CASE WHEN "role" = 'OWNER' THEN 'LEADER' ELSE 'MEMBER' END)::"TeamRole";
ALTER TABLE "TeamMember" ALTER COLUMN "role" SET DEFAULT 'MEMBER';

-- CreateTable: RoomRead (per-user read cursor powering unread badges)
CREATE TABLE "RoomRead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoomRead_userId_roomId_key" ON "RoomRead"("userId", "roomId");

-- CreateIndex
CREATE INDEX "RoomRead_userId_idx" ON "RoomRead"("userId");

-- AddForeignKey
ALTER TABLE "RoomRead" ADD CONSTRAINT "RoomRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomRead" ADD CONSTRAINT "RoomRead_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
