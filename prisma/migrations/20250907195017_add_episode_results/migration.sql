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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "episodes_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "episodes_starBakerId_fkey" FOREIGN KEY ("starBakerId") REFERENCES "contestants" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "episodes_eliminatedId_fkey" FOREIGN KEY ("eliminatedId") REFERENCES "contestants" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_episodes" ("airDate", "createdAt", "episodeNumber", "id", "isActive", "seasonId", "title", "updatedAt") SELECT "airDate", "createdAt", "episodeNumber", "id", "isActive", "seasonId", "title", "updatedAt" FROM "episodes";
DROP TABLE "episodes";
ALTER TABLE "new_episodes" RENAME TO "episodes";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
