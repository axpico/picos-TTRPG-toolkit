-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_NPC" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "quirk" TEXT,
    "hook" TEXT,
    "notes" TEXT,
    "tagsJson" TEXT NOT NULL DEFAULT '[]',
    "portraitAssetId" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "locationId" TEXT,
    "statsJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NPC_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "NPC_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_NPC" ("campaignId", "createdAt", "favorite", "hook", "id", "locationId", "name", "notes", "portraitAssetId", "quirk", "role", "tagsJson", "updatedAt") SELECT "campaignId", "createdAt", "favorite", "hook", "id", "locationId", "name", "notes", "portraitAssetId", "quirk", "role", "tagsJson", "updatedAt" FROM "NPC";
DROP TABLE "NPC";
ALTER TABLE "new_NPC" RENAME TO "NPC";
CREATE TABLE "new_PartyMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "playerName" TEXT,
    "hp" INTEGER NOT NULL DEFAULT 0,
    "hpMax" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "conditionsJson" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "portraitAssetId" TEXT,
    "statsJson" TEXT NOT NULL DEFAULT '{}',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartyMember_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PartyMember" ("campaignId", "conditionsJson", "createdAt", "hp", "hpMax", "id", "name", "notes", "order", "playerName", "portraitAssetId", "status", "updatedAt", "userId") SELECT "campaignId", "conditionsJson", "createdAt", "hp", "hpMax", "id", "name", "notes", "order", "playerName", "portraitAssetId", "status", "updatedAt", "userId" FROM "PartyMember";
DROP TABLE "PartyMember";
ALTER TABLE "new_PartyMember" RENAME TO "PartyMember";
CREATE INDEX "PartyMember_campaignId_order_idx" ON "PartyMember"("campaignId", "order");
CREATE UNIQUE INDEX "PartyMember_campaignId_userId_key" ON "PartyMember"("campaignId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
