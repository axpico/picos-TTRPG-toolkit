# Writing themes

This app is fully themeable at runtime. A **theme** is just a set of CSS custom
properties applied to `<html>`. Because every screen and widget is built on the
shared `ink-*` / `accent-*` Tailwind scales (which resolve from those variables),
swapping a theme recolors the **entire app — including all widgets — with no
markup changes**.

This guide explains the model and walks through adding a new preset.

---

## How it fits together

| File | Role |
|---|---|
| `presets.ts` | The list of built-in themes (`PRESETS`) and the `ThemePreset` shape. **Add new themes here.** |
| `tokens.ts` | Pure helpers: `presetToVars()` turns a preset into the CSS variables, plus `tripleToHex` / `hexToTriple` for the editor. |
| `useTheme.ts` | Zustand store: applies the selected preset/custom theme to `<html>` and persists it to `localStorage`. |
| `ThemePanel.tsx` | The `<ThemeControl/>` button + modal: preset grid and the custom-theme editor. |
| `tailwind.css` | The `:root` default-theme variables (first-paint fallback) and the component classes (`.btn`, `.card`, …). |
| `tailwind.config.js` | Maps `ink`/`accent`/fonts to the CSS variables via `rgb(var(--x) / <alpha-value>)`. |
| `../../index.html` | A pre-paint `<script>` that applies the saved theme before React mounts (prevents a flash). |

New presets appear **automatically** in the theme panel and the custom editor —
you only edit `presets.ts`.

---

## The token model

A `ThemePreset` (see `presets.ts`):

```ts
{
  id: "mocha",                 // unique, kebab-case; used in localStorage + data-theme
  label: "Catppuccin Mocha",   // shown in the picker
  mode: "dark",                // "dark" | "light" — see "Light themes" below
  tokens: {
    ink:   [ /* 12 stops */ ], // the neutral ramp
    accent:[ /* 3 stops  */ ], // the brand/highlight color
    accentFg: "…",             // text color placed on filled accent surfaces
  },
  fonts: { display, body, mono },
}
```

### Colors are `"R G B"` channel triples

Every color is a string of three space-separated 0–255 channels, e.g.
`"205 214 244"` — **not** hex, **not** `rgb(...)`. Tailwind consumes them as
`rgb(var(--ink-900) / <alpha-value>)`, which is what keeps opacity utilities like
`bg-accent-500/10` and `border-ink-700/80` working.

> Authoring in hex? Convert with the helper in `tokens.ts`:
> `hexToTriple("#cdd6f4") === "205 214 244"`. Or just use the in-app **Customize**
> editor (it shows color pickers) and read the values back from `localStorage`.

### The `ink` ramp (12 stops)

The stops, in array order, map to these Tailwind keys (`INK_KEYS` in `tokens.ts`):

```
index:  0    1    2    3    4    5    6    7    8    9    10   11
key:    50   100  200  300  400  500  600  700  800  850  900  950
```

The codebase uses them by **role**, so a ramp must be monotonic in luminance:

- **Low indices (50–200)** → foreground **text** (`text-ink-50`, `text-ink-200`).
- **Mid (300–600)** → muted text, borders, subtle fills (`text-ink-400`, `border-ink-700`).
- **High (800–950)** → **surfaces and the page background** (`bg-ink-850`, `bg-ink-950`).

For a **dark** theme: `50` is near-white, `950` is near-black.

### The `accent` ramp (3 stops) + `accentFg`

`accent` is `[500, 600, 700]`. Buttons use `bg-accent-600` with `hover:bg-accent-500`,
so order them **brightest → darkest**: `500` is the brightest, `700` the darkest.
`text-accent-500` is also used for highlighted text, so `500` should read against
dark surfaces.

`accentFg` is the text color drawn **on top of** a filled accent button
(`.btn-primary { color: rgb(var(--accent-fg)) }`). Choose for contrast:

- Bright/pastel accent (gold, lime, mauve) → **dark** `accentFg` (e.g. the theme's `crust`).
- Dark/saturated accent (crimson, deep violet) → **light** `accentFg`.

### Fonts

`fonts` are full CSS font-stack strings. Reuse the shared `FONT` constants in
`presets.ts` (`cinzel`, `cormorant`, `fraunces`, `spectral`, `plex`, `jetbrains`).
`display` is for wordmarks/headings (the `.display` class and `font-display`),
`body` is the default UI font, `mono` is for dice/numbers.

To use a **brand-new** font (self-hosted so it works offline on the LAN):
1. `npm i @fontsource/<family> -w apps/web`
2. Import the weights you need in `apps/web/src/main.tsx`
   (e.g. `import "@fontsource/eb-garamond/500.css";`).
3. Add it to `FONT` and `FONT_OPTIONS` in `presets.ts` so presets and the editor can use it.

---

## Light themes (the inversion trick)

There is no separate light stylesheet. A light theme is simply an `ink` ramp whose
**luminance is inverted**, plus `mode: "light"`:

- `50` = the **darkest** color (your text)
- `950` = the **lightest** color (your background)

Because the app references stops by role (`bg-ink-950` for the page, `text-ink-50`
for text), flipping the ramp makes everything read correctly. See `cartographer`,
`latte`, and `celestial` for worked examples.

> The app uses **no** Tailwind `dark:` variants, so light themes are safe and need
> no extra handling. `mode` is currently informational (exposed as
> `<html data-mode>`); keep it accurate for future use and clarity.

---

## Add a preset — step by step

1. **Pick your palette.** A neutral ramp + one accent. Tools like
   [Catppuccin's palette](https://catppuccin.com/palette) or any palette generator
   work; you need ~12 neutral steps and 3 accent steps.
2. **Convert to triples** (`hexToTriple`, or the in-app editor).
3. **Append to `PRESETS`** in `presets.ts`:

   ```ts
   {
     id: "ember-court",
     label: "Ember Court",
     mode: "dark",
     tokens: {
       ink: [
         "246 236 230", "236 220 210", "215 188 171", "182 145 124", "143 107 87",
         "109 79 64", "79 58 47", "58 43 35", "40 29 24", "31 22 18", "21 14 11", "12 7 6",
       ],
       accent: ["255 106 61", "237 79 34", "196 58 22"],
       accentFg: "12 7 6",
     },
     fonts: { display: FONT.cinzel, body: FONT.spectral, mono: FONT.jetbrains },
   },
   ```

4. **(Only if it's the new default)** set `DEFAULT_PRESET_ID` and update the `:root`
   block in `tailwind.css` to match — that block is the no-JS / first-paint fallback
   and must mirror the default preset.
5. **Verify** (below). Done — it shows up in **◐ Theme** automatically.

---

## Custom themes (no code)

End users don't need to touch code: **◐ Theme → Customize** forks the current preset,
exposes color pickers (background, surface, border, text, accent) and font selects,
applies changes live, and saves to `localStorage`
(`ttrpg-theme` = selection, `ttrpg-theme-vars` = resolved variables). `presets.ts`
is the right place only for themes you want to **ship** to everyone.

---

## Verify

```sh
npm run check -w apps/web   # tsc
npm test    -w apps/web     # incl. test/theme/presets.test.ts
```

`presets.test.ts` enforces the invariants for every preset: a full 12-stop `ink`
ramp, 3 `accent` stops, all colors valid `"R G B"` triples, the three font slots
present, and unique ids. If you add a preset, that test will guard it.

Then run the app and eyeball it:

```sh
npm run dev
```

Open the theme panel and switch to your preset. Check that **text is readable on
every surface**, the **primary button** (accent + `accentFg`) has enough contrast,
and — for light themes — that surfaces/text aren't inverted.
