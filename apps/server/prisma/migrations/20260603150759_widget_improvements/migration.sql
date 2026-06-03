-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Combatant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "encounterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "initiative" INTEGER NOT NULL,
    "hp" INTEGER,
    "hpMax" INTEGER,
    "ac" INTEGER,
    "defeated" BOOLEAN NOT NULL DEFAULT false,
    "conditionsJson" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "isPC" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Combatant_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Combatant" ("conditionsJson", "encounterId", "hp", "hpMax", "id", "initiative", "isPC", "name", "notes", "order") SELECT "conditionsJson", "encounterId", "hp", "hpMax", "id", "initiative", "isPC", "name", "notes", "order" FROM "Combatant";
DROP TABLE "Combatant";
ALTER TABLE "new_Combatant" RENAME TO "Combatant";
CREATE TABLE "new_DiceRoll" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT,
    "userId" TEXT,
    "notation" TEXT NOT NULL,
    "result" INTEGER NOT NULL,
    "breakdownJson" TEXT NOT NULL,
    "label" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiceRoll_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiceRoll_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DiceRoll" ("breakdownJson", "campaignId", "createdAt", "id", "label", "notation", "result", "userId") SELECT "breakdownJson", "campaignId", "createdAt", "id", "label", "notation", "result", "userId" FROM "DiceRoll";
DROP TABLE "DiceRoll";
ALTER TABLE "new_DiceRoll" RENAME TO "DiceRoll";
CREATE INDEX "DiceRoll_campaignId_createdAt_idx" ON "DiceRoll"("campaignId", "createdAt");
CREATE TABLE "new_ProgressClock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "segments" INTEGER NOT NULL DEFAULT 6,
    "filled" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "secret" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProgressClock_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProgressClock" ("campaignId", "color", "createdAt", "description", "filled", "id", "name", "order", "segments", "updatedAt") SELECT "campaignId", "color", "createdAt", "description", "filled", "id", "name", "order", "segments", "updatedAt" FROM "ProgressClock";
DROP TABLE "ProgressClock";
ALTER TABLE "new_ProgressClock" RENAME TO "ProgressClock";
CREATE INDEX "ProgressClock_campaignId_order_idx" ON "ProgressClock"("campaignId", "order");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
