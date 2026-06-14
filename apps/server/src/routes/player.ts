import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  rollTableResult,
  updateMyCharacterInput,
  type RollTableResult,
  type SSEEvent,
} from "@toolkit/shared";
import { prisma } from "../db.js";
import { toPartyDto, toPublicPartyDto } from "../lib/repos/party.js";
import { toEncounterDto } from "../lib/repos/combat.js";
import { toWeatherDto } from "../lib/repos/weather.js";
import { toCalendarDto } from "../lib/repos/calendar.js";
import { toBroadcastDto } from "../lib/repos/broadcast.js";
import { toPublicLocation } from "../lib/repos/location.js";
import { toClockDto } from "../lib/repos/clock.js";
import { toTimerDto } from "../lib/repos/timer.js";
import { toDiceDto } from "../lib/repos/dice.js";
import { canManageCharacter } from "../lib/auth.js";
import { openSse } from "../plugins/sse.js";
import { writeLog } from "../services/log.js";
import { getProjector } from "../share/registry.js";

/** Widget keys that have a dedicated `data` field below; the generic share loop skips them. */
const NATIVE_KEYS = new Set([
  "party",
  "combat",
  "weather",
  "calendar",
  "map:current",
  "rolltable:current",
  "clocks",
  "timers",
  "dice",
]);

function safeJson(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const idParams = z.object({ id: z.string().min(1) });

/**
 * Player-facing endpoints. Access is gated by campaign membership (any role) via
 * `requireCampaignRole()`; the projection itself is still limited to widgets the
 * GM is actively broadcasting.
 */
export const playerRoutes: FastifyPluginAsync = async (app) => {
  const memberGuard = { preHandler: app.requireCampaignRole() };

  app.get("/:id/player-state", memberGuard, async (req) => {
    const { id: campaignId } = idParams.parse(req.params);
    const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });

    const broadcasts = await prisma.broadcast.findMany({ where: { campaignId, active: true } });
    const active = new Set(broadcasts.map((b) => b.widgetKey));

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

    const [party, activeEncounter, weatherRow, calendarRow, mapRow, clockRows, timerRows, diceRows] =
      await Promise.all([
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
        mapLocationId ? prisma.location.findUnique({ where: { id: mapLocationId } }) : Promise.resolve(null),
        active.has("clocks")
          ? prisma.progressClock.findMany({
              where: { campaignId, secret: false },
              orderBy: [{ order: "asc" }, { createdAt: "asc" }],
            })
          : Promise.resolve([]),
        active.has("timers")
          ? prisma.timer.findMany({
              where: { campaignId, secret: false },
              orderBy: [{ order: "asc" }, { createdAt: "asc" }],
            })
          : Promise.resolve([]),
        active.has("dice")
          ? prisma.diceRoll.findMany({
              where: { campaignId, hidden: false },
              orderBy: { createdAt: "desc" },
              take: 20,
              include: { user: { select: { displayName: true, username: true } } },
            })
          : Promise.resolve([]),
      ]);

    // Generic share engine: every other active broadcast whose module type has a
    // registered projector is projected to a player-safe payload here.
    const widgetEntries = await Promise.all(
      broadcasts
        .filter((b) => !NATIVE_KEYS.has(b.widgetKey))
        .map(async (b) => {
          const type = b.widgetKey.split(":")[0] ?? b.widgetKey;
          const project = getProjector(type);
          if (!project) return null;
          try {
            const data = await project(campaignId, safeJson(b.payloadJson));
            return data == null ? null : { widgetKey: b.widgetKey, type, data };
          } catch {
            return null;
          }
        }),
    );
    const widgets = widgetEntries.filter((e): e is NonNullable<typeof e> => e !== null);

    return {
      campaign: { id: campaign.id, name: campaign.name },
      broadcasts: broadcasts.map(toBroadcastDto),
      widgets,
      data: {
        party: active.has("party") ? party.map(toPublicPartyDto) : null,
        combat: active.has("combat") && activeEncounter ? toEncounterDto(activeEncounter) : null,
        weather: active.has("weather") && weatherRow ? toWeatherDto(weatherRow) : null,
        calendar: active.has("calendar") && calendarRow ? toCalendarDto(calendarRow) : null,
        map:
          active.has("map:current") && mapRow && mapRow.campaignId === campaignId
            ? toPublicLocation(mapRow)
            : null,
        rolltable: active.has("rolltable:current") ? tableResult : null,
        clocks: active.has("clocks") ? clockRows.map(toClockDto) : null,
        timers: active.has("timers") ? timerRows.map(toTimerDto) : null,
        dice: active.has("dice") ? diceRows.map((r) => toDiceDto(r, r.user)) : null,
      },
    };
  });

  app.get("/:id/player-stream", memberGuard, async (req, reply) => {
    const { id: campaignId } = idParams.parse(req.params);
    openSse(reply);

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
      if (!event.broadcastKey) return false;
      return activeKeys.has(event.broadcastKey);
    };

    let closed = false;
    let cleanup = () => {};
    const closeStream = () => {
      if (closed) return;
      closed = true;
      cleanup();
      try {
        reply.raw.end();
      } catch {
        /* connection already gone */
      }
    };

    const unsubscribe = app.bus.subscribe(campaignId, reply, (event) => {
      // GM-only revocation signal: tear down this stream if *this* member was
      // removed from the campaign. Never forwarded to the player client.
      if (event.type === "membership.change") {
        const p = event.payload as { userId?: string; role?: string | null } | undefined;
        if (p?.userId === req.user!.id && (p.role === null || p.role === undefined)) {
          closeStream();
        }
        return false;
      }
      if (event.type === "broadcast.change") {
        // Keep activeKeys current synchronously from the payload so events that
        // arrive right after a toggle aren't filtered against a stale set. The
        // batch toggle carries no per-key info, so fall back to a DB refresh.
        const p = event.payload as
          | { batch?: boolean; widgetKey?: string; active?: boolean }
          | undefined;
        if (p?.batch || !event.broadcastKey) {
          void refresh();
        } else if (p?.active) {
          activeKeys.add(event.broadcastKey);
        } else {
          activeKeys.delete(event.broadcastKey);
        }
        return true;
      }
      return filter(event);
    });
    // Count this watcher so the GM dashboard can show live presence.
    const untrack = app.bus.trackPresence(campaignId);

    cleanup = () => {
      untrack();
      unsubscribe();
    };
    req.raw.on("close", closeStream);
    req.raw.on("error", closeStream);
    return reply;
  });

  // The caller's own character in this campaign (or null if the DM hasn't assigned one).
  app.get("/:id/my-character", memberGuard, async (req) => {
    const { id: campaignId } = idParams.parse(req.params);
    const row = await prisma.partyMember.findFirst({
      where: { campaignId, userId: req.user!.id },
    });
    return row ? toPartyDto(row) : null;
  });

  app.patch("/:id/my-character", memberGuard, async (req, reply) => {
    const { id: campaignId } = idParams.parse(req.params);
    const body = updateMyCharacterInput.parse(req.body);
    const character = await prisma.partyMember.findFirst({
      where: { campaignId, userId: req.user!.id },
    });
    if (!character || !canManageCharacter(req.user!.id, req.membership!.role, character)) {
      reply.code(403).send({ error: { code: "forbidden", message: "No character assigned to you." } });
      return;
    }
    const updated = await prisma.partyMember.update({
      where: { id: character.id },
      data: {
        ...(body.hp !== undefined ? { hp: body.hp } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.conditions !== undefined ? { conditionsJson: JSON.stringify(body.conditions) } : {}),
        ...(body.notes !== undefined ? { notes: body.notes ?? null } : {}),
        ...(body.stats !== undefined ? { statsJson: JSON.stringify(body.stats) } : {}),
      },
    });
    const dto = toPartyDto(updated);
    // This event reaches the player stream (broadcastKey "party"); ship only the
    // player-safe projection. DM widgets refetch full data via query invalidation.
    app.bus.emit(campaignId, {
      type: "party.update",
      campaignId,
      broadcastKey: "party",
      payload: { member: toPublicPartyDto(updated) },
    });
    await writeLog(app, campaignId, "party.update", `${dto.name} updated their character`);
    return dto;
  });
};
