-- Rename the team "owner" role to "leader" (product terminology change).
-- AlterEnum first: add LEADER, drop OWNER (a value cannot be renamed in-place).
ALTER TYPE "TeamRole" ADD VALUE 'LEADER';
ALTER TYPE "TeamRole" DROP VALUE 'OWNER';

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
