import { z } from "zod";
import {
  isPointRevealed,
  mapGrid,
  mapPin,
  mapReveal,
  mapToken,
  type Location as LocationDto,
  type MapToken,
  type MapTokenDto,
  type PublicLocation,
} from "@toolkit/shared";
import type { Location as DbLocation } from "@prisma/client";
import { parseJsonField } from "../json.js";

const pinsSchema = z.array(mapPin);
const revealsSchema = z.array(mapReveal);
const tokensSchema = z.array(mapToken);
const gridSchema = mapGrid.nullable();

function imageUrlFor(assetId: string | null): string | null {
  return assetId ? `/api/files/${assetId}` : null;
}

export function toLocationDto(row: DbLocation): LocationDto {
  // parseJsonField infers zod's input type for default-bearing schemas; the
  // runtime value is fully defaulted, so assert the output shape.
  const stored = parseJsonField(row.tokensJson, tokensSchema, []) as MapToken[];
  const tokens: MapTokenDto[] = stored.map((t) => ({
    ...t,
    imageUrl: imageUrlFor(t.imageAssetId),
  }));
  return {
    id: row.id,
    campaignId: row.campaignId,
    name: row.name,
    description: row.description,
    gmNotes: row.gmNotes,
    playerNotes: row.playerNotes,
    imageAssetId: row.imageAssetId,
    imageUrl: imageUrlFor(row.imageAssetId),
    pins: parseJsonField(row.pinsJson, pinsSchema, []),
    reveals: parseJsonField(row.revealsJson, revealsSchema, []),
    tokens,
    grid: parseJsonField(row.gridJson, gridSchema, null),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Strip GM-only fields, hidden pins, and fog-covered tokens for the player view.
 * A token reaches players only when the GM marked it visible AND its center is
 * not under fog (an unrevealed area or a `hide` rect).
 */
export function toPublicLocation(row: DbLocation): PublicLocation {
  const full = toLocationDto(row);
  return {
    id: full.id,
    name: full.name,
    description: full.description,
    playerNotes: full.playerNotes,
    imageUrl: full.imageUrl,
    pins: full.pins.filter((p) => p.playerVisible),
    reveals: full.reveals,
    // Players get the token disc + HP + AC, but never the full GM stat block.
    tokens: full.tokens
      .filter((t) => t.playerVisible && isPointRevealed({ x: t.x, y: t.y }, full.reveals))
      .map((t) => ({ ...t, statBlock: null })),
    grid: full.grid,
  };
}
