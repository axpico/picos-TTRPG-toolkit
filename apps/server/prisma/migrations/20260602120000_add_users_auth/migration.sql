-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Settings";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'player',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Membership_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tagsJson" TEXT NOT NULL DEFAULT '[]',
    "joinCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Campaign" ("createdAt", "description", "id", "name", "tagsJson", "updatedAt") SELECT "createdAt", "description", "id", "name", "tagsJson", "updatedAt" FROM "Campaign";
DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";
CREATE UNIQUE INDEX "Campaign_joinCode_key" ON "Campaign"("joinCode");
CREATE TABLE "new_DiceRoll" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT,
    "userId" TEXT,
    "notation" TEXT NOT NULL,
    "result" INTEGER NOT NULL,
    "breakdownJson" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiceRoll_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiceRoll_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DiceRoll" ("breakdownJson", "campaignId", "createdAt", "id", "label", "notation", "result") SELECT "breakdownJson", "campaignId", "createdAt", "id", "label", "notation", "result" FROM "DiceRoll";
DROP TABLE "DiceRoll";
ALTER TABLE "new_DiceRoll" RENAME TO "DiceRoll";
CREATE INDEX "DiceRoll_campaignId_createdAt_idx" ON "DiceRoll"("campaignId", "createdAt");
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
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartyMember_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PartyMember" ("campaignId", "conditionsJson", "createdAt", "hp", "hpMax", "id", "name", "notes", "order", "playerName", "portraitAssetId", "status", "updatedAt") SELECT "campaignId", "conditionsJson", "createdAt", "hp", "hpMax", "id", "name", "notes", "order", "playerName", "portraitAssetId", "status", "updatedAt" FROM "PartyMember";
DROP TABLE "PartyMember";
ALTER TABLE "new_PartyMember" RENAME TO "PartyMember";
CREATE INDEX "PartyMember_campaignId_order_idx" ON "PartyMember"("campaignId", "order");
CREATE UNIQUE INDEX "PartyMember_campaignId_userId_key" ON "PartyMember"("campaignId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Membership_campaignId_idx" ON "Membership"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_campaignId_key" ON "Membership"("userId", "campaignId");
