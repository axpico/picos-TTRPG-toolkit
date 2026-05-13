import type { GeneratedNpc } from "@toolkit/shared";

// All tables are original phrasings. Names are intentionally generic
// fantasy/sci-fi staples that nobody owns; cultures map to flavor packs.

interface NameTable {
  given: string[];
  family: string[];
}

const NAMES: Record<string, NameTable> = {
  generic: {
    given: ["Aren", "Mira", "Joran", "Selka", "Pip", "Quill", "Nori", "Tov", "Idra", "Bevin", "Yala", "Ruke", "Esha", "Korin", "Vask", "Mela"],
    family: ["Brookwell", "Ashford", "Thorne", "Vance", "Greylock", "Marrow", "Bramble", "Pike", "Holt", "Reed"],
  },
  northern: {
    given: ["Hild", "Gunnar", "Eira", "Sven", "Sigrid", "Olaf", "Astrid", "Bjorn"],
    family: ["Frostvein", "Stormhammer", "Bearcloak", "Wolfsong", "Ironwall"],
  },
  desert: {
    given: ["Faris", "Layla", "Zaid", "Nura", "Karim", "Suha", "Rami", "Iman"],
    family: ["al-Sahari", "of the Dune", "an-Nasr", "ibn-Falaj"],
  },
  imperial: {
    given: ["Caius", "Livia", "Decimus", "Octavia", "Titus", "Aurelia", "Marcus", "Drusilla"],
    family: ["Vellio", "Aurelian", "Corvinus", "Tarquin", "Vespa"],
  },
  spacer: {
    given: ["Nyx", "Echo", "Rune", "Vega", "Halcy", "Quasar", "Lume", "Onyx"],
    family: ["Kessler", "Tycho", "Halo", "Drift", "Northstar"],
  },
};

const ROLES = [
  "innkeeper",
  "blacksmith",
  "scholar",
  "fence",
  "guard captain",
  "scribe",
  "ferry pilot",
  "courier",
  "merchant",
  "alchemist",
  "spy",
  "midwife",
  "town crier",
  "tomb-watcher",
  "alley mystic",
  "dockmaster",
  "tax collector",
  "informant",
];

const QUIRKS = [
  "always speaks in third person",
  "compulsively counts coins, even imaginary ones",
  "carries an obviously fake holy relic",
  "has one eye that doesn't blink",
  "names every weapon they touch",
  "refuses to look strangers in the eye",
  "smells faintly of woodsmoke and rosewater",
  "keeps a journal in a code only they can read",
  "laughs at the wrong moments",
  "whispers a prayer before drinking water",
  "has a small bird that does most of the listening",
  "claims to have died once, briefly",
  "speaks in chained metaphors",
  "wears mismatched gloves on purpose",
  "is convinced you've met before",
];

const HOOKS = [
  "needs a courier for a parcel they refuse to describe",
  "is searching for a sibling who vanished a season ago",
  "owes a dangerous debt to someone unnamed",
  "saw something in the dark that hasn't left their dreams",
  "has a map missing one critical piece",
  "wants to trade a secret for safe passage",
  "is being followed and pretends not to notice",
  "knows where the local watch buries its mistakes",
  "thinks the party can finally finish what they started",
  "will pay handsomely for an ordinary-looking object",
  "is looking for someone with no scars and no name",
  "claims to recognize an ancestor of one of you",
];

const TAGS = ["urban", "rural", "underworld", "noble", "religious", "academic", "military", "mercantile"];

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function makeRng(seed?: string): () => number {
  if (!seed) return Math.random;
  let s = 0;
  for (const c of seed) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function generateNpc(opts: {
  culture?: string;
  region?: string;
  role?: string;
  seed?: string;
}): GeneratedNpc {
  const rng = makeRng(opts.seed);
  const cultureKey = (opts.culture ?? "generic").toLowerCase();
  const table = NAMES[cultureKey] ?? NAMES.generic!;
  const given = pick(rng, table.given);
  const family = pick(rng, table.family);
  const role = opts.role?.trim() || pick(rng, ROLES);
  const quirk = pick(rng, QUIRKS);
  const hook = pick(rng, HOOKS);
  const baseTags = [pick(rng, TAGS)];
  if (opts.region) baseTags.push(opts.region.toLowerCase());
  if (opts.culture) baseTags.push(opts.culture.toLowerCase());
  return {
    name: `${given} ${family}`,
    role,
    quirk,
    hook,
    tags: Array.from(new Set(baseTags)),
  };
}
