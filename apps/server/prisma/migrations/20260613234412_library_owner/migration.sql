-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Monster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT,
    "ownerUserId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "environment" TEXT,
    "challenge" TEXT,
    "statsJson" TEXT NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "tagsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Monster_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Monster_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Monster" ("campaignId", "challenge", "createdAt", "environment", "id", "name", "notes", "statsJson", "tagsJson", "type", "updatedAt") SELECT "campaignId", "challenge", "createdAt", "environment", "id", "name", "notes", "statsJson", "tagsJson", "type", "updatedAt" FROM "Monster";
DROP TABLE "Monster";
ALTER TABLE "new_Monster" RENAME TO "Monster";
CREATE INDEX "Monster_ownerUserId_idx" ON "Monster"("ownerUserId");
CREATE TABLE "new_NPC" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT,
    "ownerUserId" TEXT,
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
    CONSTRAINT "NPC_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NPC_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_NPC" ("campaignId", "createdAt", "favorite", "hook", "id", "locationId", "name", "notes", "portraitAssetId", "quirk", "role", "statsJson", "tagsJson", "updatedAt") SELECT "campaignId", "createdAt", "favorite", "hook", "id", "locationId", "name", "notes", "portraitAssetId", "quirk", "role", "statsJson", "tagsJson", "updatedAt" FROM "NPC";
DROP TABLE "NPC";
ALTER TABLE "new_NPC" RENAME TO "NPC";
CREATE INDEX "NPC_ownerUserId_idx" ON "NPC"("ownerUserId");
CREATE TABLE "new_Spell" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT,
    "ownerUserId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "school" TEXT,
    "castingTime" TEXT,
    "range" TEXT,
    "components" TEXT,
    "duration" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "higherLevels" TEXT,
    "classesJson" TEXT NOT NULL DEFAULT '[]',
    "ritual" BOOLEAN NOT NULL DEFAULT false,
    "concentration" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "tagsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Spell_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Spell_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Spell" ("campaignId", "castingTime", "classesJson", "components", "concentration", "createdAt", "description", "duration", "higherLevels", "id", "level", "name", "range", "ritual", "school", "slug", "source", "tagsJson", "updatedAt") SELECT "campaignId", "castingTime", "classesJson", "components", "concentration", "createdAt", "description", "duration", "higherLevels", "id", "level", "name", "range", "ritual", "school", "slug", "source", "tagsJson", "updatedAt" FROM "Spell";
DROP TABLE "Spell";
ALTER TABLE "new_Spell" RENAME TO "Spell";
CREATE UNIQUE INDEX "Spell_slug_key" ON "Spell"("slug");
CREATE INDEX "Spell_ownerUserId_idx" ON "Spell"("ownerUserId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
