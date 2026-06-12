import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SpellParseError,
  htmlToMarkdown,
  isUnofficial,
  parseSpellDetailPage,
  parseSpellListPage,
} from "../../../src/lib/spell-import/parse.js";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "fixtures", "wikidot");
const fixture = (name: string) => readFileSync(join(fixturesDir, name), "utf8");

test("parseSpellListPage extracts slugs with levels from tab ids and dedupes", () => {
  const links = parseSpellListPage(fixture("spells-list.html"));
  assert.deepEqual(
    links.map((l) => [l.slug, l.name, l.level]),
    [
      ["fire-bolt", "Fire Bolt", 0],
      ["hand-of-radiance", "Hand of Radiance (UA)", 0],
      ["detect-magic", "Detect Magic", 1],
      ["fireball", "Fireball", 3], // duplicate fire-bolt row in the 3rd-level tab is dropped
    ],
  );
});

test("isUnofficial flags UA/HB-marked names only", () => {
  assert.equal(isUnofficial("Hand of Radiance (UA)"), true);
  assert.equal(isUnofficial("Booming Blade (HB)"), true);
  assert.equal(isUnofficial("Fireball"), false);
});

test("parseSpellDetailPage parses a leveled spell with higher levels and classes", () => {
  const spell = parseSpellDetailPage(fixture("spell-fireball.html"), {
    slug: "fireball",
    name: "Fireball",
    level: 3,
  });
  assert.equal(spell.name, "Fireball");
  assert.equal(spell.level, 3);
  assert.equal(spell.school, "evocation");
  assert.equal(spell.castingTime, "1 action");
  assert.equal(spell.range, "150 feet");
  assert.equal(spell.components, "V, S, M (a tiny ball of bat guano and sulfur)");
  assert.equal(spell.duration, "Instantaneous");
  assert.equal(spell.ritual, false);
  assert.equal(spell.concentration, false);
  assert.equal(spell.source, "Player's Handbook");
  assert.match(spell.description, /^A bright streak flashes/);
  assert.match(spell.description, /\n\nThe fire spreads around corners/);
  assert.match(spell.higherLevels ?? "", /^When you cast this spell using a spell slot of 4th/);
  // "(Optional)" suffix is stripped from class names.
  assert.deepEqual(spell.classes, ["Sorcerer", "Wizard", "Artificer"]);
});

test("parseSpellDetailPage parses ritual + concentration", () => {
  const spell = parseSpellDetailPage(fixture("spell-detect-magic.html"), {
    slug: "detect-magic",
    name: "Detect Magic",
    level: 1,
  });
  assert.equal(spell.level, 1);
  assert.equal(spell.school, "divination");
  assert.equal(spell.ritual, true);
  assert.equal(spell.concentration, true);
  assert.equal(spell.duration, "Concentration, up to 10 minutes");
  assert.equal(spell.higherLevels, null);
});

test("parseSpellDetailPage parses a cantrip and keeps bold text in the description", () => {
  const spell = parseSpellDetailPage(fixture("spell-fire-bolt.html"), {
    slug: "fire-bolt",
    name: "Fire Bolt",
    level: 0,
  });
  assert.equal(spell.level, 0);
  assert.equal(spell.school, "evocation");
  assert.equal(spell.ritual, false);
  // Bold inside the description is markdown, and never misread as a stat label.
  assert.match(spell.description, /\*\*1d10\*\*/);
  assert.equal(spell.castingTime, "1 action");
});

test("parseSpellDetailPage converts lists and tables in descriptions to markdown", () => {
  const spell = parseSpellDetailPage(fixture("spell-with-table.html"), {
    slug: "teleport",
    name: "Teleport",
    level: 7,
  });
  assert.match(spell.description, /- \*Permanent circle\* always works\./);
  assert.match(spell.description, /\| Familiarity \| Mishap \| On Target \|/);
  assert.match(spell.description, /\| --- \| --- \| --- \|/);
  assert.match(spell.description, /\| Very familiar \| 01-05 \| 25-100 \|/);
});

test("parseSpellDetailPage throws SpellParseError on a page without spell data", () => {
  assert.throws(
    () =>
      parseSpellDetailPage("<html><body><div id='page-content'><p>nothing here</p></div></body></html>", {
        slug: "broken",
        name: "Broken",
        level: 1,
      }),
    SpellParseError,
  );
});

test("htmlToMarkdown converts inline markup", () => {
  assert.equal(
    htmlToMarkdown("<p><strong>Bold</strong> and <em>italic</em> text</p>"),
    "**Bold** and *italic* text",
  );
  assert.equal(htmlToMarkdown("<ul><li>one</li><li>two</li></ul>"), "- one\n- two");
});
