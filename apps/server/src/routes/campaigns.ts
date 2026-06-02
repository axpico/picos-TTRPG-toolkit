import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  createCampaignInput,
  joinCampaignInput,
  setMemberRoleInput,
  updateCampaignInput,
  type Campaign as CampaignDto,
  type Role,
} from "@toolkit/shared";
import type { Campaign as DbCampaign } from "@prisma/client";
import { prisma } from "../db.js";
import { toCampaignDto } from "../lib/repos/campaign.js";
import { generateShareToken } from "../lib/share-token.js";

const idParams = z.object({ id: z.string().min(1) });
const memberParams = z.object({ id: z.string().min(1), userId: z.string().min(1) });

/** Shape a campaign for a given role: attach myRole and hide the join code from non-DMs. */
function viewFor(row: DbCampaign, role: Role): CampaignDto {
  const dto = toCampaignDto(row);
  dto.myRole = role;
  if (role !== "dm") dto.joinCode = null;
  return dto;
}

const uid = (req: FastifyRequest) => req.user!.id;

export const campaignRoutes: FastifyPluginAsync = async (app) => {
  // List only the caller's campaigns, tagged with their role.
  app.get("/", async (req) => {
    const rows = await prisma.membership.findMany({
      where: { userId: uid(req) },
      include: { campaign: true },
      orderBy: { campaign: { updatedAt: "desc" } },
    });
    return rows.map((m) => viewFor(m.campaign, m.role as Role));
  });

  // Create a campaign — the creator becomes its DM.
  app.post("/", async (req, reply) => {
    const body = createCampaignInput.parse(req.body);
    const created = await prisma.campaign.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        tagsJson: JSON.stringify(body.tags ?? []),
        joinCode: generateShareToken(),
        layout: { create: {} },
        memberships: { create: { userId: uid(req), role: "dm" } },
      },
    });
    reply.code(201);
    return viewFor(created, "dm");
  });

  // Join a campaign by code (become a player; idempotent).
  app.post("/join", async (req, reply) => {
    const { joinCode } = joinCampaignInput.parse(req.body);
    const campaign = await prisma.campaign.findUnique({ where: { joinCode } });
    if (!campaign) {
      reply.code(404).send({ error: { code: "bad_code", message: "No campaign matches that code." } });
      return;
    }
    const existing = await prisma.membership.findUnique({
      where: { userId_campaignId: { userId: uid(req), campaignId: campaign.id } },
    });
    const role = (existing?.role as Role) ?? "player";
    if (!existing) {
      await prisma.membership.create({
        data: { userId: uid(req), campaignId: campaign.id, role: "player" },
      });
    }
    return viewFor(campaign, role);
  });

  app.get("/:id", { preHandler: app.requireCampaignRole() }, async (req) => {
    const { id } = idParams.parse(req.params);
    const row = await prisma.campaign.findUniqueOrThrow({ where: { id } });
    return viewFor(row, req.membership!.role);
  });

  app.patch("/:id", { preHandler: app.requireCampaignRole("dm") }, async (req) => {
    const { id } = idParams.parse(req.params);
    const body = updateCampaignInput.parse(req.body);
    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.tags !== undefined ? { tagsJson: JSON.stringify(body.tags) } : {}),
      },
    });
    app.bus.emit(id, { type: "campaign.update", campaignId: id });
    return viewFor(updated, "dm");
  });

  app.delete("/:id", { preHandler: app.requireCampaignRole("dm") }, async (req, reply) => {
    const { id } = idParams.parse(req.params);
    await prisma.campaign.delete({ where: { id } });
    reply.code(204).send();
  });

  app.post("/:id/join-code/rotate", { preHandler: app.requireCampaignRole("dm") }, async (req) => {
    const { id } = idParams.parse(req.params);
    const updated = await prisma.campaign.update({
      where: { id },
      data: { joinCode: generateShareToken() },
    });
    return viewFor(updated, "dm");
  });

  // --- Member management (DM only) ---
  app.get("/:id/members", { preHandler: app.requireCampaignRole("dm") }, async (req) => {
    const { id } = idParams.parse(req.params);
    const rows = await prisma.membership.findMany({
      where: { campaignId: id },
      include: { user: { select: { id: true, username: true, displayName: true } } },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((m) => ({ userId: m.userId, role: m.role as Role, user: m.user }));
  });

  app.patch("/:id/members/:userId", { preHandler: app.requireCampaignRole("dm") }, async (req) => {
    const { id, userId } = memberParams.parse(req.params);
    const { role } = setMemberRoleInput.parse(req.body);
    const updated = await prisma.membership.update({
      where: { userId_campaignId: { userId, campaignId: id } },
      data: { role },
    });
    return { userId: updated.userId, role: updated.role as Role };
  });

  app.delete("/:id/members/:userId", { preHandler: app.requireCampaignRole("dm") }, async (req, reply) => {
    const { id, userId } = memberParams.parse(req.params);
    await prisma.membership.delete({ where: { userId_campaignId: { userId, campaignId: id } } });
    reply.code(204).send();
  });
};
