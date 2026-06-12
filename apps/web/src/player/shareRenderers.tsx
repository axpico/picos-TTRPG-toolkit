import type { ComponentType } from "react";
import clsx from "clsx";
import { abilityMod, ABILITY_KEYS, formatMod, type StatBlock } from "@toolkit/shared";
import { Markdown } from "../components/Markdown.js";

/**
 * Client side of the generic share engine. Each shareable widget registers a
 * player-view renderer here keyed by module type; `PlayerView` looks them up for
 * every `PlayerState.widgets` entry. Unknown types fall back to a generic card,
 * so a new widget is live the moment it has a server projector — even before a
 * bespoke renderer exists.
 */
export interface ShareRendererProps {
  data: unknown;
  widgetKey: string;
}

const renderers = new Map<string, ComponentType<ShareRendererProps>>();

export function registerShareRenderer(type: string, C: ComponentType<ShareRendererProps>): void {
  renderers.set(type, C);
}

export function getShareRenderer(type: string): ComponentType<ShareRendererProps> {
  return renderers.get(type) ?? FallbackCard;
}

const Section = ({ title, children }: { title?: string; children: React.ReactNode }) => (
  <section className="card p-4">
    {title && (
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-300">{title}</h2>
    )}
    {children}
  </section>
);

// --- NPC spotlight ----------------------------------------------------------
interface NpcShare {
  name: string;
  role: string | null;
  quirk: string | null;
  tags: string[];
  portraitAssetId: string | null;
}
function NpcCard({ data }: ShareRendererProps) {
  const n = data as NpcShare;
  return (
    <Section title="Now appearing">
      <div className="flex items-start gap-3">
        {n.portraitAssetId ? (
          <img
            src={`/api/files/${n.portraitAssetId}`}
            alt={n.name}
            className="h-16 w-16 shrink-0 rounded-md object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-ink-800 text-2xl">
            🎭
          </div>
        )}
        <div className="min-w-0">
          <div className="display text-lg font-semibold text-ink-50">{n.name}</div>
          {n.role && <div className="text-sm text-ink-300">{n.role}</div>}
          {n.quirk && <div className="mt-1 text-sm italic text-ink-400">“{n.quirk}”</div>}
          {n.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {n.tags.map((t) => (
                <span key={t} className="chip">{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

// --- Bestiary reveal --------------------------------------------------------
interface MonsterShare {
  name: string;
  type: string | null;
  environment: string | null;
  challenge: string | null;
  tags: string[];
  stats: StatBlock;
}
function StatChips({ stats }: { stats: StatBlock }) {
  const chips: string[] = [];
  if (stats.ac != null) chips.push(`AC ${stats.ac}`);
  if (stats.hp != null) chips.push(`HP ${stats.hp}${stats.hpMax != null ? `/${stats.hpMax}` : ""}`);
  if (stats.speed) chips.push(stats.speed);
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <span key={c} className="chip">{c}</span>
      ))}
    </div>
  );
}
function MonsterCard({ data }: ShareRendererProps) {
  const m = data as MonsterShare;
  const subtitle = [m.type, m.environment, m.challenge ? `CR ${m.challenge}` : null]
    .filter(Boolean)
    .join(" · ");
  const abilities = ABILITY_KEYS.filter((k) => m.stats.abilities[k] != null);
  const entries = [...m.stats.traits, ...m.stats.actions];
  return (
    <Section title="Creature">
      <div className="display text-lg font-semibold text-ink-50">{m.name}</div>
      {subtitle && <div className="mb-2 text-sm text-ink-400">{subtitle}</div>}
      <StatChips stats={m.stats} />
      {abilities.length > 0 && (
        <div className="mt-3 grid grid-cols-6 gap-1 text-center text-xs">
          {abilities.map((k) => {
            const score = m.stats.abilities[k]!;
            return (
              <div key={k} className="rounded bg-ink-800 py-1">
                <div className="uppercase text-ink-500">{k}</div>
                <div className="font-mono text-ink-100">
                  {score} <span className="text-ink-400">({formatMod(abilityMod(score))})</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {entries.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-sm">
          {entries.map((e) => (
            <li key={e.id}>
              <span className="font-semibold text-ink-100">{e.name}.</span>{" "}
              <span className="text-ink-300">{e.desc}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

// --- Grimoire / spell reveal --------------------------------------------------
interface SpellShare {
  name: string;
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
function SpellCard({ data }: ShareRendererProps) {
  const s = data as SpellShare;
  const subtitle =
    s.level === 0
      ? `${s.school ?? "magic"} cantrip`
      : `Level ${s.level}${s.school ? ` ${s.school}` : ""}`;
  const props: [string, string | null][] = [
    ["Casting time", s.castingTime],
    ["Range", s.range],
    ["Components", s.components],
    ["Duration", s.duration],
  ];
  return (
    <Section title="Spell">
      <div className="display text-lg font-semibold text-ink-50">{s.name}</div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-sm capitalize text-ink-400">
        <span>{subtitle}</span>
        {s.ritual && <span className="chip">Ritual</span>}
        {s.concentration && <span className="chip">Concentration</span>}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        {props
          .filter(([, v]) => v)
          .map(([label, v]) => (
            <div key={label}>
              <span className="text-ink-500">{label}: </span>
              <span className="text-ink-200">{v}</span>
            </div>
          ))}
      </div>
      {s.description && <Markdown className="mt-3 text-sm text-ink-300">{s.description}</Markdown>}
      {s.higherLevels && (
        <p className="mt-2 text-sm text-ink-300">
          <span className="font-semibold text-ink-100">At higher levels.</span> {s.higherLevels}
        </p>
      )}
      {s.classes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {s.classes.map((c) => (
            <span key={c} className="chip">{c}</span>
          ))}
        </div>
      )}
    </Section>
  );
}

// --- Shop -------------------------------------------------------------------
interface ShopShare {
  name: string;
  items: {
    id: string;
    name: string;
    type: string | null;
    price: number | null;
    stock: number | null;
    rarity: string | null;
    tags: string[];
  }[];
}
function ShopCard({ data }: ShareRendererProps) {
  const s = data as ShopShare;
  return (
    <Section title={`Shop — ${s.name}`}>
      {s.items.length === 0 ? (
        <p className="text-sm text-ink-400">Nothing in stock.</p>
      ) : (
        <ul className="divide-y divide-ink-800 text-sm">
          {s.items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-3 py-1.5">
              <span className="min-w-0">
                <span className="font-medium text-ink-100">{it.name}</span>
                {it.rarity && <span className="ml-2 text-xs text-ink-500">{it.rarity}</span>}
              </span>
              <span className="flex shrink-0 items-center gap-3 font-mono text-xs text-ink-300">
                {it.stock != null && <span className="text-ink-500">×{it.stock}</span>}
                {it.price != null && <span className="text-accent-400">{it.price}g</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

// --- Sessions / handout -----------------------------------------------------
interface SessionShare {
  title: string;
  date: string | null;
  summary: string | null;
  externalLinks: { label: string; href: string }[];
}
function SessionCard({ data }: ShareRendererProps) {
  const s = data as SessionShare;
  return (
    <Section title="Session notes">
      <div className="display text-lg font-semibold text-ink-50">{s.title}</div>
      {s.date && (
        <div className="text-xs text-ink-500">{new Date(s.date).toLocaleDateString()}</div>
      )}
      {s.summary && <p className="mt-2 whitespace-pre-wrap text-sm text-ink-300">{s.summary}</p>}
      {s.externalLinks.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {s.externalLinks.map((l) => (
            <li key={l.href}>
              <a className="text-accent-400 hover:underline" href={l.href} target="_blank" rel="noreferrer">
                {l.label} ↗
              </a>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

// --- Session Log feed -------------------------------------------------------
interface LogShare {
  id: string;
  kind: string;
  message: string;
  createdAt: string;
}
function LogCard({ data }: ShareRendererProps) {
  const entries = data as LogShare[];
  return (
    <Section title="Session log">
      <ul className="space-y-1 text-sm">
        {entries.map((e) => (
          <li key={e.id} className="flex items-baseline gap-2 text-ink-300">
            <span className="shrink-0 font-mono text-[10px] uppercase text-ink-600">
              {new Date(e.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span>{e.message}</span>
          </li>
        ))}
        {entries.length === 0 && <li className="text-ink-500">No entries yet.</li>}
      </ul>
    </Section>
  );
}

// --- Sticky note ------------------------------------------------------------
interface StickyShare {
  text: string;
  title: string | null;
  color: string | null;
  fontSize: string | null;
}
function StickyCard({ data }: ShareRendererProps) {
  const s = data as StickyShare;
  const sizeClass = s.fontSize === "sm" ? "text-xs" : s.fontSize === "lg" ? "text-base" : "text-sm";
  return (
    <section
      className="rounded-md p-4 text-black shadow-inner"
      style={{ backgroundColor: s.color ?? "#fde68a" }}
    >
      {s.title && <div className="mb-1 font-bold">{s.title}</div>}
      <div className={clsx("whitespace-pre-wrap", sizeClass)}>{s.text}</div>
    </section>
  );
}

// --- Generic fallback -------------------------------------------------------
function FallbackCard({ widgetKey }: ShareRendererProps) {
  return (
    <Section title="Shared">
      <p className="text-sm text-ink-400">The GM is sharing “{widgetKey.split(":")[0]}”.</p>
    </Section>
  );
}

registerShareRenderer("npc", NpcCard);
registerShareRenderer("bestiary", MonsterCard);
registerShareRenderer("spells", SpellCard);
registerShareRenderer("shop", ShopCard);
registerShareRenderer("sessions", SessionCard);
registerShareRenderer("log", LogCard);
registerShareRenderer("sticky", StickyCard);
