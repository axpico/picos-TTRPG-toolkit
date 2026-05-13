import type { GenerateShopInput, CreateShopItemInput } from "@toolkit/shared";

interface ItemDef {
  name: string;
  type: string;
  basePrice: number;
  rarity: "common" | "uncommon" | "rare" | "very rare" | "legendary";
  tags?: string[];
}

const RARITY_ORDER = ["common", "uncommon", "rare", "very rare", "legendary"] as const;

const CATALOG: Record<NonNullable<GenerateShopInput["flavor"]>, ItemDef[]> = {
  general: [
    { name: "Tinder kit", type: "supply", basePrice: 1.5, rarity: "common" },
    { name: "Bedroll", type: "supply", basePrice: 1, rarity: "common" },
    { name: "Lantern", type: "supply", basePrice: 5, rarity: "common" },
    { name: "Rope, 50ft", type: "supply", basePrice: 2, rarity: "common" },
    { name: "Iron rations (1 week)", type: "supply", basePrice: 3, rarity: "common" },
    { name: "Hand mirror, polished", type: "supply", basePrice: 5, rarity: "uncommon" },
    { name: "Sealed letter, addressee unknown", type: "curio", basePrice: 12, rarity: "uncommon", tags: ["mystery"] },
    { name: "Caged songbird", type: "livestock", basePrice: 18, rarity: "rare" },
  ],
  weapons: [
    { name: "Short blade, plain", type: "weapon", basePrice: 6, rarity: "common" },
    { name: "Hand axe", type: "weapon", basePrice: 6, rarity: "common" },
    { name: "Sling and stones", type: "weapon", basePrice: 1, rarity: "common" },
    { name: "Long blade, balanced", type: "weapon", basePrice: 22, rarity: "uncommon" },
    { name: "Recurve bow, oilskin-wrapped", type: "weapon", basePrice: 32, rarity: "uncommon" },
    { name: "Engraved dueling pistol", type: "weapon", basePrice: 90, rarity: "rare", tags: ["status"] },
    { name: 'Spear etched with a single rune', type: "weapon", basePrice: 320, rarity: "very rare", tags: ["arcane"] },
  ],
  alchemy: [
    { name: "Stinking solvent", type: "consumable", basePrice: 4, rarity: "common" },
    { name: "Numb-tongue draught", type: "consumable", basePrice: 8, rarity: "common" },
    { name: "Smoke pellet (3)", type: "consumable", basePrice: 12, rarity: "uncommon" },
    { name: "Salve of mending", type: "consumable", basePrice: 25, rarity: "uncommon" },
    { name: "Vial of luminous oil", type: "consumable", basePrice: 40, rarity: "rare" },
    { name: "Glass-rose elixir", type: "consumable", basePrice: 180, rarity: "very rare", tags: ["fragile"] },
  ],
  magical: [
    { name: "Lucky token (single-use)", type: "trinket", basePrice: 35, rarity: "uncommon", tags: ["arcane"] },
    { name: "Whisper-cup (eavesdrop)", type: "trinket", basePrice: 90, rarity: "rare", tags: ["arcane"] },
    { name: "Cord of forgetting (3 uses)", type: "trinket", basePrice: 150, rarity: "rare", tags: ["arcane"] },
    { name: "Sealed loop ring", type: "trinket", basePrice: 600, rarity: "very rare", tags: ["arcane"] },
    { name: "Ash-cloak of one quiet step", type: "wondrous", basePrice: 1800, rarity: "legendary", tags: ["arcane", "rumor"] },
  ],
  spacer: [
    { name: "Used welding torch", type: "tool", basePrice: 30, rarity: "common" },
    { name: "Comm patch (3 units)", type: "tool", basePrice: 60, rarity: "common" },
    { name: "Smartwire spool", type: "component", basePrice: 110, rarity: "uncommon" },
    { name: "Inert blackbox shell", type: "component", basePrice: 220, rarity: "uncommon", tags: ["scrap"] },
    { name: "Singer-grade gravlock", type: "component", basePrice: 540, rarity: "rare" },
    { name: "Logged drift-pilot's ear cuff", type: "trinket", basePrice: 1400, rarity: "very rare", tags: ["status"] },
  ],
};

const SIZE_RANGE: Record<NonNullable<GenerateShopInput["size"]>, [number, number]> = {
  small: [3, 6],
  medium: [6, 10],
  large: [10, 16],
};

function randInt(rng: () => number, lo: number, hi: number) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function priceJitter(rng: () => number, base: number) {
  const factor = 0.85 + rng() * 0.3; // ±15%
  const v = base * factor;
  return Math.round(v * 100) / 100;
}

export function generateShop(input: GenerateShopInput): {
  name: string;
  notes: string;
  items: CreateShopItemInput[];
} {
  const rng = Math.random;
  const flavor = input.flavor ?? "general";
  const sizeKey = input.size ?? "medium";
  const cap = input.rarityCap ?? "rare";
  const capIdx = RARITY_ORDER.indexOf(cap);
  const pool = CATALOG[flavor].filter((i) => RARITY_ORDER.indexOf(i.rarity) <= capIdx);
  const [lo, hi] = SIZE_RANGE[sizeKey];
  const target = Math.min(pool.length, randInt(rng, lo, hi));

  // Sample without replacement.
  const shuffled = [...pool].sort(() => rng() - 0.5).slice(0, target);
  const items: CreateShopItemInput[] = shuffled.map((d) => ({
    name: d.name,
    type: d.type,
    price: priceJitter(rng, d.basePrice),
    stock: randInt(rng, 1, sizeKey === "small" ? 3 : sizeKey === "medium" ? 6 : 10),
    rarity: d.rarity,
    tags: d.tags,
  }));

  return {
    name:
      input.name?.trim() ||
      `${flavor[0]!.toUpperCase()}${flavor.slice(1)} stock (${sizeKey})`,
    notes: `Auto-generated ${flavor} ${sizeKey} stock, rarity cap "${cap}".`,
    items,
  };
}
