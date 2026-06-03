import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { sampleMonsters, sampleNpcs, sampleParty } from "@toolkit/shared";

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

      // Populate the starter campaign with a sample party so the tracker isn't empty.
      for (const [i, m] of sampleParty.entries()) {
        await prisma.partyMember.create({
          data: {
            campaignId: campaign.id,
            name: m.name,
            playerName: m.playerName ?? null,
            hp: m.hp ?? 0,
            hpMax: m.hpMax ?? 0,
            status: m.status ?? "active",
            conditionsJson: JSON.stringify(m.conditions ?? []),
            notes: m.notes ?? null,
            statsJson: JSON.stringify(m.stats ?? {}),
            order: i,
          },
        });
      }
      console.log(`[seed] added ${sampleParty.length} sample party member(s).`);
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

    // Seed the shared, library-wide bestiary and NPC roster (campaignId null) once,
    // so every campaign starts with default SRD content. Idempotent: skip if present.
    const libraryMonsters = await prisma.monster.count({ where: { campaignId: null } });
    if (libraryMonsters === 0) {
      for (const m of sampleMonsters) {
        await prisma.monster.create({
          data: {
            campaignId: null,
            name: m.name,
            type: m.type ?? null,
            environment: m.environment ?? null,
            challenge: m.challenge ?? null,
            statsJson: JSON.stringify(m.stats ?? {}),
            notes: m.notes ?? null,
            tagsJson: JSON.stringify(m.tags ?? []),
          },
        });
      }
      console.log(`[seed] added ${sampleMonsters.length} sample creature(s) to the bestiary library.`);
    } else {
      console.log(`[seed] bestiary library already populated (${libraryMonsters}); skipping samples.`);
    }

    const libraryNpcs = await prisma.nPC.count({ where: { campaignId: null } });
    if (libraryNpcs === 0) {
      for (const n of sampleNpcs) {
        await prisma.nPC.create({
          data: {
            campaignId: null,
            name: n.name,
            role: n.role ?? null,
            quirk: n.quirk ?? null,
            hook: n.hook ?? null,
            notes: n.notes ?? null,
            tagsJson: JSON.stringify(n.tags ?? []),
            portraitAssetId: n.portraitAssetId ?? null,
            favorite: n.favorite ?? false,
            locationId: n.locationId ?? null,
            statsJson: JSON.stringify(n.stats ?? {}),
          },
        });
      }
      console.log(`[seed] added ${sampleNpcs.length} sample NPC(s) to the library.`);
    } else {
      console.log(`[seed] NPC library already populated (${libraryNpcs}); skipping samples.`);
    }
  } finally {
    await (prisma as { $disconnect: () => Promise<void> }).$disconnect();
  }
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
