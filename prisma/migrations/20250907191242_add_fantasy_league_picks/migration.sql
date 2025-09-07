/*
  Warnings:

  - Added the required column `pickType` to the `picks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `seasonId` to the `picks` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "user_scores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "weeklyPoints" INTEGER NOT NULL DEFAULT 0,
    "finalistPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_scores_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_picks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "contestantId" TEXT NOT NULL,
    "episodeId" TEXT,
    "seasonId" TEXT NOT NULL,
    "pickType" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "isCorrect" BOOLEAN,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "picks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "picks_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES "contestants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "picks_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "episodes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "picks_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_picks" ("contestantId", "createdAt", "episodeId", "id", "points", "updatedAt", "userId") SELECT "contestantId", "createdAt", "episodeId", "id", "points", "updatedAt", "userId" FROM "picks";
DROP TABLE "picks";
ALTER TABLE "new_picks" RENAME TO "picks";
CREATE UNIQUE INDEX "picks_userId_episodeId_pickType_key" ON "picks"("userId", "episodeId", "pickType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "user_scores_userId_seasonId_key" ON "user_scores"("userId", "seasonId");
