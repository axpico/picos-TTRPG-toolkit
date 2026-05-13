import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";

function shareToken() {
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
    if (!password) {
      console.error("GM_PASSWORD is required for seeding. Set it in your .env file.");
      process.exit(1);
    }

    const existing = await prisma.settings.findUnique({ where: { id: 1 } });
    const hash = await bcrypt.hash(password, 12);
    if (existing) {
      await prisma.settings.update({ where: { id: 1 }, data: { passwordHash: hash } });
      console.log("[seed] updated GM password.");
    } else {
      await prisma.settings.create({ data: { id: 1, passwordHash: hash } });
      console.log("[seed] created Settings row with GM password.");
    }

    const campaigns = await prisma.campaign.count();
    if (campaigns === 0) {
      const campaign = await prisma.campaign.create({
        data: {
          name: "First Campaign",
          description: "A starter campaign you can rename or delete.",
          tagsJson: JSON.stringify([]),
          shareToken: shareToken(),
          layout: { create: {} },
        },
      });
      console.log(`[seed] created campaign ${campaign.id} (token: ${campaign.shareToken}).`);
    } else {
      console.log(`[seed] ${campaigns} campaign(s) already present; skipped.`);
    }
  } finally {
    await (prisma as { $disconnect: () => Promise<void> }).$disconnect();
  }
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
