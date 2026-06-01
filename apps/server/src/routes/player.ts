import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { toPartyDto } from "../lib/repos/party.js";
import { toEncounterDto } from "../lib/repos/combat.js";
import { toWeatherDto } from "../lib/repos/weather.js";
import { toCalendarDto } from "../lib/repos/calendar.js";
import { toBroadcastDto } from "../lib/repos/broadcast.js";
import { toPublicLocation } from "../lib/repos/location.js";
import { openSse } from "../plugins/sse.js";
import { rollTableResult, type RollTableResult, type SSEEvent } from "@toolkit/shared";

const params = z.object({ campaignId: z.string().min(1) });
const query = z.object({ t: z.string().min(1) });

async function authenticateShare(campaignId: string, token: string) {
  const row = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!row || row.shareToken !== token) return null;
  return row;
}

export const playerRoutes: FastifyPluginAsync = async (app) => {
  /** Consolidated current state for the player view. */
  app.get("/:campaignId", async (req, reply) => {
    const { campaignId } = params.parse(req.params);
    const { t } = query.parse(req.query);
    const campaign = await authenticateShare(campaignId, t);
    if (!campaign) {
      reply.code(404).send({ error: { code: "not_found", message: "Invalid share token." } });
      return;
    }

    const broadcasts = await prisma.broadcast.findMany({
      where: { campaignId, active: true },
    });
    const active = new Set(broadcasts.map((b) => b.widgetKey));

    // Resolve the broadcasted map's locationId from its payload (set by the
    // Map widget when the GM picks an active location).
    const mapBroadcast = broadcasts.find((b) => b.widgetKey === "map:current");
    let mapLocationId: string | null = null;
    if (mapBroadcast) {
      try {
        const payload = JSON.parse(mapBroadcast.payloadJson) as { locationId?: string };
        if (typeof payload.locationId === "string") mapLocationId = payload.locationId;
      } catch {
        /* malformed payload, ignore */
      }
    }

    // The latest random-table result lives entirely in the broadcast payload —
    // no DB resource needed (same trick as map:current's locationId).
    const tableBroadcast = broadcasts.find((b) => b.widgetKey === "rolltable:current");
    let tableResult: RollTableResult | null = null;
    if (tableBroadcast) {
      try {
        const parsed = rollTableResult.safeParse(JSON.parse(tableBroadcast.payloadJson));
        if (parsed.success) tableResult = parsed.data;
      } catch {
        /* malformed payload, ignore */
      }
    }

    const [party, activeEncounter, weatherRow, calendarRow, mapRow] = await Promise.all([
      prisma.partyMember.findMany({
        where: { campaignId },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      }),
      prisma.encounter.findFirst({
        where: { campaignId, active: true },
        include: { combatants: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.weather.findUnique({ where: { campaignId } }),
      prisma.calendar.findUnique({ where: { campaignId } }),
      mapLocationId
        ? prisma.location.findUnique({ where: { id: mapLocationId } })
        : Promise.resolve(null),
    ]);

    return {
      campaign: { id: campaign.id, name: campaign.name },
      broadcasts: broadcasts.map(toBroadcastDto),
      // Only include resources whose key is in the active set.
      data: {
        party: active.has("party") ? party.map(toPartyDto) : null,
        combat:
          active.has("combat") && activeEncounter ? toEncounterDto(activeEncounter) : null,
        weather: active.has("weather") && weatherRow ? toWeatherDto(weatherRow) : null,
        calendar:
          active.has("calendar") && calendarRow ? toCalendarDto(calendarRow) : null,
        map:
          active.has("map:current") && mapRow && mapRow.campaignId === campaignId
            ? toPublicLocation(mapRow)
            : null,
        rolltable: active.has("rolltable:current") ? tableResult : null,
      },
    };
  });

  app.get("/:campaignId/stream", async (req, reply) => {
    const { campaignId } = params.parse(req.params);
    const { t } = query.parse(req.query);
    const campaign = await authenticateShare(campaignId, t);
    if (!campaign) {
      reply.code(404).send({ error: { code: "not_found", message: "Invalid share token." } });
      return;
    }

    openSse(reply);

    // Resolve current active broadcast keys; refresh on broadcast.change.
    let activeKeys = new Set<string>();
    const refresh = async () => {
      const rows = await prisma.broadcast.findMany({
        where: { campaignId, active: true },
        select: { widgetKey: true },
      });
      activeKeys = new Set(rows.map((r) => r.widgetKey));
    };
    await refresh();

    const filter = (event: SSEEvent) => {
      if (event.type === "broadcast.change") return true;
      if (!event.broadcastKey) return false;
      return activeKeys.has(event.broadcastKey);
    };

    const unsubscribe = app.bus.subscribe(campaignId, reply, (event) => {
      if (event.type === "broadcast.change") {
        // Update keys; let the event itself through so the client can re-fetch state.
        void refresh();
        return true;
      }
      return filter(event);
    });

    req.raw.on("close", unsubscribe);
    req.raw.on("error", unsubscribe);
    return reply;
  });
};
