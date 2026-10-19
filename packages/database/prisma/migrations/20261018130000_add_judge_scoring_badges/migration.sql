-- CreateTable
CREATE TABLE "JudgeScore" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "innovation" INTEGER NOT NULL,
    "technical" INTEGER NOT NULL,
    "design" INTEGER NOT NULL,
    "presentation" INTEGER NOT NULL,
    "overall" INTEGER NOT NULL,
    "finalScore" INTEGER NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JudgeScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AchievementBadge" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "awardedById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AchievementBadge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JudgeScore_submissionId_judgeId_key" ON "JudgeScore"("submissionId", "judgeId");

-- CreateIndex
CREATE UNIQUE INDEX "AchievementBadge_submissionId_name_key" ON "AchievementBadge"("submissionId", "name");

-- AddForeignKey
ALTER TABLE "JudgeScore" ADD CONSTRAINT "JudgeScore_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgeScore" ADD CONSTRAINT "JudgeScore_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "Judge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchievementBadge" ADD CONSTRAINT "AchievementBadge_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchievementBadge" ADD CONSTRAINT "AchievementBadge_awardedById_fkey" FOREIGN KEY ("awardedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
