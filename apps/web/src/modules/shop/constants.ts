/** Preset option lists for the shop item editor. Fields remain free-text in the
 * schema; these just provide quick-pick dropdowns with a "custom" escape hatch. */
export const ITEM_TYPES = [
  "weapon",
  "armor",
  "supply",
  "consumable",
  "trinket",
  "tool",
  "gear",
  "ammo",
  "service",
] as const;

export const RARITIES = ["common", "uncommon", "rare", "very rare", "legendary"] as const;

/** Tailwind classes for a rarity accent (left border + text). */
export function rarityColor(rarity: string | null | undefined): string {
  switch ((rarity ?? "").toLowerCase()) {
    case "uncommon":
      return "border-l-emerald-500 text-emerald-300";
    case "rare":
      return "border-l-sky-500 text-sky-300";
    case "very rare":
      return "border-l-violet-500 text-violet-300";
    case "legendary":
      return "border-l-amber-500 text-amber-300";
    case "common":
      return "border-l-ink-500 text-ink-300";
    default:
      return "border-l-transparent text-ink-300";
  }
}

/** Formats a price as currency-ish text; returns "—" when unset. */
export function fmtPrice(value: number | null | undefined): string {
  if (value == null) return "—";
  return value % 1 === 0 ? `${value}` : value.toFixed(2);
}
