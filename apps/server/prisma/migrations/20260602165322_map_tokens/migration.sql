-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "gmNotes" TEXT,
    "playerNotes" TEXT,
    "imageAssetId" TEXT,
    "pinsJson" TEXT NOT NULL DEFAULT '[]',
    "revealsJson" TEXT NOT NULL DEFAULT '[]',
    "tokensJson" TEXT NOT NULL DEFAULT '[]',
    "gridJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Location_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Location" ("campaignId", "createdAt", "description", "gmNotes", "id", "imageAssetId", "name", "pinsJson", "playerNotes", "revealsJson", "updatedAt") SELECT "campaignId", "createdAt", "description", "gmNotes", "id", "imageAssetId", "name", "pinsJson", "playerNotes", "revealsJson", "updatedAt" FROM "Location";
DROP TABLE "Location";
ALTER TABLE "new_Location" RENAME TO "Location";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
