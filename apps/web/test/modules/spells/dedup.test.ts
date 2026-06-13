import { describe, it, expect } from "vitest";
import type { Spell } from "@toolkit/shared";
import { findDuplicate } from "../../../src/modules/spells/dedup.js";

const spell = (over: Partial<Spell> = {}): Spell => ({
  id: "s1",
  campaignId: null,
  name: "Fireball",
  slug: "fireball",
  level: 3,
  school: "evocation",
  castingTime: "1 action",
  range: "150 feet",
  components: "V, S, M",
  duration: "Instantaneous",
  description: "Boom.",
  higherLevels: null,
  classes: ["Wizard"],
  ritual: false,
  concentration: false,
  source: "PHB",
  tags: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("findDuplicate", () => {
  it("matches an existing slug in the target scope", () => {
    const lib = spell({ id: "lib", campaignId: null, slug: "fireball" });
    const found = findDuplicate([lib], "Anything", "fireball", null);
    expect(found?.id).toBe("lib");
  });

  it("matches by name case-insensitively when slug is null", () => {
    const custom = spell({ id: "c", campaignId: "camp", slug: null, name: "Magic Missile" });
    expect(findDuplicate([custom], "magic missile", null, "camp")?.id).toBe("c");
    expect(findDuplicate([custom], "  MAGIC MISSILE  ", null, "camp")?.id).toBe("c");
  });

  it("ignores spells in a different scope", () => {
    const lib = spell({ id: "lib", campaignId: null, slug: "fireball" });
    // Copying into a campaign must not match the library copy.
    expect(findDuplicate([lib], "Fireball", "fireball", "camp")).toBeUndefined();
  });

  it("returns undefined when nothing matches", () => {
    const lib = spell({ id: "lib", campaignId: null, name: "Aid", slug: "aid" });
    expect(findDuplicate([lib], "Bless", "bless", null)).toBeUndefined();
  });
});
