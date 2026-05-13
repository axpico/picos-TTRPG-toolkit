import { z } from "zod";
import {
  mapPin,
  mapReveal,
  type Location as LocationDto,
  type PublicLocation,
} from "@toolkit/shared";
import type { Location as DbLocation } from "@prisma/client";
import { parseJsonField } from "../json.js";

const pinsSchema = z.array(mapPin);
const revealsSchema = z.array(mapReveal);

function imageUrlFor(assetId: string | null): string | null {
  return assetId ? `/api/files/${assetId}` : null;
}

export function toLocationDto(row: DbLocation): LocationDto {
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
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Strip GM-only fields and hidden pins for the player view. */
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
  };
}
