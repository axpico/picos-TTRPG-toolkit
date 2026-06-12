import * as cheerio from "cheerio";
import type { Cheerio, CheerioAPI } from "cheerio";
import type { AnyNode, Element } from "domhandler";

/**
 * Pure HTML parsers for dnd5e.wikidot.com spell pages. No I/O here — the
 * importer feeds in fetched HTML so everything stays unit-testable with
 * fixture files.
 */

export interface SpellLink {
  slug: string;
  name: string;
  level: number;
}

export interface ParsedSpell {
  name: string;
  slug: string;
  level: number;
  school: string | null;
  castingTime: string | null;
  range: string | null;
  components: string | null;
  duration: string | null;
  description: string;
  higherLevels: string | null;
  classes: string[];
  ritual: boolean;
  concentration: boolean;
  source: string | null;
}

export class SpellParseError extends Error {
  readonly slug: string;

  constructor(slug: string, message: string) {
    super(`spell:${slug}: ${message}`);
    this.name = "SpellParseError";
    this.slug = slug;
  }
}

/** Unearthed Arcana / homebrew entries are marked in the display name. */
export function isUnofficial(name: string): boolean {
  return /\((UA|HB)[^)]*\)/i.test(name);
}

const SLUG_RE = /\/spell:([^/?#]+)/;

/**
 * The spell index page holds one wikidot tab per level: bodies are
 * `div.yui-content > div#wiki-tab-0-N` where N is the spell level (0 =
 * cantrips). Each body contains a table whose first column links to
 * `/spell:<slug>` detail pages. Duplicate slugs are dropped (first wins).
 */
export function parseSpellListPage(html: string): SpellLink[] {
  const $ = cheerio.load(html);
  const links: SpellLink[] = [];
  $("#page-content div.yui-content > div").each((idx, body) => {
    const id = $(body).attr("id") ?? "";
    const tab = /wiki-tab-\d+-(\d+)$/.exec(id);
    const level = tab ? Number(tab[1]) : idx;
    $(body)
      .find('a[href*="/spell:"]')
      .each((_, a) => {
        const slug = SLUG_RE.exec($(a).attr("href") ?? "")?.[1];
        const name = $(a).text().trim();
        if (slug && name) links.push({ slug, name, level });
      });
  });
  const seen = new Set<string>();
  return links.filter((l) => (seen.has(l.slug) ? false : (seen.add(l.slug), true)));
}

const LEVELED_RE = /^(\d)(?:st|nd|rd|th)-level\s+([a-z][a-z\s-]*?)\s*(\(ritual\))?$/i;
const CANTRIP_RE = /^([a-z][a-z\s-]*?)\s+cantrip\s*(\(ritual\))?$/i;
const STAT_LABELS = new Set(["casting time", "range", "components", "duration"]);
const BLOCK_TAGS = new Set(["p", "ul", "ol", "blockquote", "table"]);

/**
 * A detail page's `#page-content` is a flat list of blocks: a "Source:"
 * paragraph, an <em> level/school line, a <strong>-labelled stat paragraph
 * (sometimes split in two), the description blocks, then optional
 * "At Higher Levels." and "Spell Lists." paragraphs. Parsing is label-driven,
 * not positional, so minor layout drift survives.
 */
export function parseSpellDetailPage(html: string, link: SpellLink): ParsedSpell {
  const $ = cheerio.load(html);
  const blocks = $("#page-content")
    .children()
    .toArray()
    .filter((el) => BLOCK_TAGS.has(el.tagName?.toLowerCase() ?? ""));
  if (blocks.length === 0) throw new SpellParseError(link.slug, "no #page-content blocks found");

  let source: string | null = null;
  let level: number | null = null;
  let school: string | null = null;
  let ritual = false;
  const stats: Record<string, string> = {};
  const descriptionParts: string[] = [];
  let higherLevels: string | null = null;
  let classes: string[] = [];

  for (const el of blocks) {
    const node = $(el);
    const text = node.text().replace(/\s+/g, " ").trim();
    if (el.tagName.toLowerCase() === "p") {
      if (source === null && /^Source:/i.test(text)) {
        source = text.replace(/^Source:\s*/i, "").trim() || null;
        continue;
      }
      if (level === null) {
        const leveled = LEVELED_RE.exec(text);
        const cantrip = CANTRIP_RE.exec(text);
        if (leveled) {
          level = Number(leveled[1]);
          school = normalizeSchool(leveled[2]!);
          ritual = Boolean(leveled[3]);
          continue;
        }
        if (cantrip) {
          level = 0;
          school = normalizeSchool(cantrip[1]!);
          ritual = Boolean(cantrip[2]);
          continue;
        }
      }
      if (/^At Higher Levels\.?/i.test(text)) {
        higherLevels = inlineToMarkdown(node, $).replace(/^\*{0,3}At Higher Levels\.?\*{0,3}\s*/i, "").trim() || null;
        continue;
      }
      if (/^Spell Lists\.?/i.test(text)) {
        classes = node
          .find("a")
          .toArray()
          .map((a) => $(a).text().replace(/\(Optional\)/gi, "").trim())
          .filter(Boolean);
        continue;
      }
      const labeled = extractLabeledStats(node, $);
      if (descriptionParts.length === 0 && Object.keys(labeled).length > 0) {
        Object.assign(stats, labeled);
        continue;
      }
    }
    descriptionParts.push(blockToMarkdown(el, $));
  }

  if (level === null) throw new SpellParseError(link.slug, "could not determine spell level/school");

  const duration = stats["duration"] ?? null;
  return {
    name: link.name,
    slug: link.slug,
    level,
    school,
    castingTime: stats["casting time"] ?? null,
    range: stats["range"] ?? null,
    components: stats["components"] ?? null,
    duration,
    description: descriptionParts.filter(Boolean).join("\n\n").trim(),
    higherLevels,
    classes,
    ritual,
    concentration: /^concentration/i.test(duration ?? ""),
    source,
  };
}

function normalizeSchool(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Stat paragraphs look like `<strong>Range:</strong> 150 feet<br>…`. Split on
 * the <strong> labels and keep only the known spell-stat ones, so bold text in
 * descriptions never gets misread as stats.
 */
function extractLabeledStats(p: Cheerio<Element>, $: CheerioAPI): Record<string, string> {
  const out: Record<string, string> = {};
  const parts = (p.html() ?? "").split(/<strong>/i).slice(1);
  for (const part of parts) {
    const end = part.search(/<\/strong>/i);
    if (end < 0) continue;
    const label = cheerio
      .load(part.slice(0, end))
      .root()
      .text()
      .replace(/:\s*$/, "")
      .trim()
      .toLowerCase();
    if (!STAT_LABELS.has(label)) continue;
    const value = cheerio
      .load(part.slice(end).replace(/^<\/strong>/i, ""))
      .root()
      .text()
      .replace(/^:\s*/, "")
      .replace(/\s+/g, " ")
      .trim();
    if (value) out[label] = value;
  }
  return out;
}

/** Convert a fragment of wikidot HTML (one or more blocks) to markdown. */
export function htmlToMarkdown(html: string): string {
  const $ = cheerio.load(`<div id="__md_root">${html}</div>`);
  return $("#__md_root")
    .children()
    .toArray()
    .map((el) => blockToMarkdown(el, $))
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function blockToMarkdown(el: Element, $: CheerioAPI): string {
  const tag = el.tagName.toLowerCase();
  const node = $(el);
  if (tag === "ul" || tag === "ol") {
    return node
      .children("li")
      .toArray()
      .map((li, i) => {
        const bullet = tag === "ol" ? `${i + 1}.` : "-";
        return `${bullet} ${inlineToMarkdown($(li), $)}`;
      })
      .join("\n");
  }
  if (tag === "table") return tableToMarkdown(node, $);
  if (tag === "blockquote") {
    return inlineToMarkdown(node, $)
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
  }
  return inlineToMarkdown(node, $);
}

function tableToMarkdown(table: Cheerio<Element>, $: CheerioAPI): string {
  const rows = table.find("tr").toArray();
  if (rows.length === 0) return "";
  const cells = (row: Element) =>
    $(row)
      .children("th, td")
      .toArray()
      .map((c) => inlineToMarkdown($(c), $).replace(/\n/g, " ").replace(/\|/g, "\\|").trim());
  const header = cells(rows[0]!);
  const lines = [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...rows.slice(1).map((r) => `| ${cells(r).join(" | ")} |`),
  ];
  return lines.join("\n");
}

function inlineToMarkdown(node: Cheerio<AnyNode>, $: CheerioAPI): string {
  let out = "";
  for (const child of node.contents().toArray()) {
    if (child.type === "text") {
      out += (child as { data?: string }).data ?? "";
      continue;
    }
    if (child.type !== "tag") continue;
    const el = child as Element;
    const tag = el.tagName.toLowerCase();
    const inner = () => inlineToMarkdown($(el), $);
    if (tag === "br") out += "\n";
    else if (tag === "strong" || tag === "b") out += wrap(inner(), "**");
    else if (tag === "em" || tag === "i") out += wrap(inner(), "*");
    else out += inner();
  }
  return out.replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").trim();
}

function wrap(text: string, marker: string): string {
  const trimmed = text.trim();
  return trimmed ? `${marker}${trimmed}${marker}` : "";
}
