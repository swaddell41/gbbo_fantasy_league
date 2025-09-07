/*
  Warnings:

  - You are about to drop the column `finalistPoints` on the `user_scores` table. All the data in the column will be lost.
  - You are about to drop the column `totalPoints` on the `user_scores` table. All the data in the column will be lost.
  - You are about to drop the column `weeklyPoints` on the `user_scores` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "episode_handshakes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeId" TEXT NOT NULL,
    "contestantId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "episode_handshakes_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "episodes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "episode_handshakes_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES "contestants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "episode_soggy_bottoms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeId" TEXT NOT NULL,
    "contestantId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "episode_soggy_bottoms_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "episodes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "episode_soggy_bottoms_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES "contestants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_episodes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "seasonId" TEXT NOT NULL,
    "airDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "starBakerId" TEXT,
    "eliminatedId" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "technicalChallengeWinnerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "episodes_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "episodes_starBakerId_fkey" FOREIGN KEY ("starBakerId") REFERENCES "contestants" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "episodes_eliminatedId_fkey" FOREIGN KEY ("eliminatedId") REFERENCES "contestants" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "episodes_technicalChallengeWinnerId_fkey" FOREIGN KEY ("technicalChallengeWinnerId") REFERENCES "contestants" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_episodes" ("airDate", "createdAt", "eliminatedId", "episodeNumber", "id", "isActive", "isCompleted", "seasonId", "starBakerId", "title", "updatedAt") SELECT "airDate", "createdAt", "eliminatedId", "episodeNumber", "id", "isActive", "isCompleted", "seasonId", "starBakerId", "title", "updatedAt" FROM "episodes";
DROP TABLE "episodes";
ALTER TABLE "new_episodes" RENAME TO "episodes";
CREATE TABLE "new_user_scores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "weeklyScore" INTEGER NOT NULL DEFAULT 0,
    "finalistScore" INTEGER NOT NULL DEFAULT 0,
    "correctStarBaker" INTEGER NOT NULL DEFAULT 0,
    "correctElimination" INTEGER NOT NULL DEFAULT 0,
    "wrongStarBaker" INTEGER NOT NULL DEFAULT 0,
    "wrongElimination" INTEGER NOT NULL DEFAULT 0,
    "totalEpisodes" INTEGER NOT NULL DEFAULT 0,
    "technicalChallengeWins" INTEGER NOT NULL DEFAULT 0,
    "handshakes" INTEGER NOT NULL DEFAULT 0,
    "soggyBottoms" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_scores_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_user_scores" ("createdAt", "id", "seasonId", "updatedAt", "userId") SELECT "createdAt", "id", "seasonId", "updatedAt", "userId" FROM "user_scores";
DROP TABLE "user_scores";
ALTER TABLE "new_user_scores" RENAME TO "user_scores";
CREATE UNIQUE INDEX "user_scores_userId_seasonId_key" ON "user_scores"("userId", "seasonId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "episode_handshakes_episodeId_contestantId_key" ON "episode_handshakes"("episodeId", "contestantId");

-- CreateIndex
CREATE UNIQUE INDEX "episode_soggy_bottoms_episodeId_contestantId_key" ON "episode_soggy_bottoms"("episodeId", "contestantId");
