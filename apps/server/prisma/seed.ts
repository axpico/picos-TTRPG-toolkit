import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";

function joinCode() {
  return randomBytes(24)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const password = process.env.GM_PASSWORD;
    const username = process.env.GM_USERNAME ?? "gm";
    if (!password) {
      console.error("GM_PASSWORD is required for seeding. Set it in your .env file.");
      process.exit(1);
    }

    // Bootstrap the first DM account (idempotent — updates the password if present).
    const hash = await bcrypt.hash(password, 12);
    const dm = await prisma.user.upsert({
      where: { username },
      update: { passwordHash: hash },
      create: { username, passwordHash: hash, displayName: "Game Master" },
    });
    console.log(`[seed] bootstrap DM user "${username}" ready (${dm.id}).`);

    const campaignCount = await prisma.campaign.count();
    if (campaignCount === 0) {
      const campaign = await prisma.campaign.create({
        data: {
          name: "First Campaign",
          description: "A starter campaign you can rename or delete.",
          tagsJson: JSON.stringify([]),
          joinCode: joinCode(),
          layout: { create: {} },
          memberships: { create: { userId: dm.id, role: "dm" } },
        },
      });
      console.log(`[seed] created campaign ${campaign.id} (join code: ${campaign.joinCode}).`);
    } else {
      // Backfill: make the bootstrap user a DM of every existing campaign and
      // ensure each has a join code (covers campaigns created before auth).
      const campaigns = await prisma.campaign.findMany();
      for (const c of campaigns) {
        if (!c.joinCode) {
          await prisma.campaign.update({ where: { id: c.id }, data: { joinCode: joinCode() } });
        }
        await prisma.membership.upsert({
          where: { userId_campaignId: { userId: dm.id, campaignId: c.id } },
          update: {},
          create: { userId: dm.id, campaignId: c.id, role: "dm" },
        });
      }
      console.log(`[seed] backfilled DM membership + join codes on ${campaigns.length} campaign(s).`);
    }
  } finally {
    await (prisma as { $disconnect: () => Promise<void> }).$disconnect();
  }
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
