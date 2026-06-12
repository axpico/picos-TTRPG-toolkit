import { z } from "zod";
import type { Spell as SpellDto } from "@toolkit/shared";
import type { Spell as DbSpell } from "@prisma/client";
import { parseJsonField } from "../json.js";

const stringList = z.array(z.string());

export function toSpellDto(row: DbSpell): SpellDto {
  return {
    id: row.id,
    campaignId: row.campaignId,
    name: row.name,
    slug: row.slug,
    level: row.level,
    school: row.school,
    castingTime: row.castingTime,
    range: row.range,
    components: row.components,
    duration: row.duration,
    description: row.description,
    higherLevels: row.higherLevels,
    classes: parseJsonField(row.classesJson, stringList, []),
    ritual: row.ritual,
    concentration: row.concentration,
    source: row.source,
    tags: parseJsonField(row.tagsJson, stringList, []),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
