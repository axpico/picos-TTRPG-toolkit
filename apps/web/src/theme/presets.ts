/**
 * Theme presets. Each defines the full `ink` ramp (12 stops, low index = text,
 * high index = surface) + a 3-stop `accent`, a foreground color for accent
 * surfaces, and a font stack trio. Light themes simply provide a ramp whose
 * luminance is inverted (high indices are the light surfaces), which keeps every
 * existing `bg-ink-900` / `text-ink-50` usage coherent without markup changes.
 *
 * Colors are "R G B" channel triples (consumed via `rgb(var(--x) / <alpha>)`).
 */

export interface ThemeTokens {
  /** 12 stops in order: 50,100,200,300,400,500,600,700,800,850,900,950 */
  ink: string[];
  /** 3 stops: 500,600,700 */
  accent: string[];
  /** Foreground used on filled accent surfaces (e.g. primary buttons). */
  accentFg: string;
}

export interface ThemeFonts {
  display: string;
  body: string;
  mono: string;
}

export type ThemeMode = "dark" | "light";

export interface ThemePreset {
  id: string;
  label: string;
  mode: ThemeMode;
  tokens: ThemeTokens;
  fonts: ThemeFonts;
}

const SERIF = "ui-serif, Georgia, serif";
const SANS = "ui-sans-serif, system-ui, sans-serif";
const MONO = "ui-monospace, monospace";

export const FONT = {
  cinzel: `"Cinzel", ${SERIF}`,
  cormorant: `"Cormorant Garamond", ${SERIF}`,
  fraunces: `"Fraunces", ${SERIF}`,
  spectral: `"Spectral", ${SERIF}`,
  plex: `"IBM Plex Sans", ${SANS}`,
  jetbrains: `"JetBrains Mono", ${MONO}`,
};

/** Selectable font stacks for the custom-theme editor. */
export const FONT_OPTIONS: { label: string; stack: string }[] = [
  { label: "Cormorant", stack: FONT.cormorant },
  { label: "Cinzel", stack: FONT.cinzel },
  { label: "Fraunces", stack: FONT.fraunces },
  { label: "Spectral", stack: FONT.spectral },
  { label: "IBM Plex Sans", stack: FONT.plex },
  { label: "JetBrains Mono", stack: FONT.jetbrains },
];

export const PRESETS: ThemePreset[] = [
  {
    id: "midnight",
    label: "Midnight",
    mode: "dark",
    tokens: {
      ink: [
        "244 246 251", "230 233 242", "198 204 220", "160 168 192", "121 130 158",
        "88 96 123", "66 73 97", "51 57 80", "35 40 57", "26 31 44", "18 22 34", "9 11 19",
      ],
      accent: ["52 211 166", "31 185 140", "22 148 114"],
      accentFg: "8 12 16",
    },
    fonts: { display: FONT.cormorant, body: FONT.plex, mono: FONT.jetbrains },
  },
  {
    id: "arcane",
    label: "Arcane Grimoire",
    mode: "dark",
    tokens: {
      ink: [
        "243 234 215", "232 220 194", "210 193 160", "176 154 115", "138 117 83",
        "107 90 64", "79 66 48", "59 49 36", "42 35 25", "33 27 19", "24 19 13", "14 11 7",
      ],
      accent: ["217 164 65", "194 136 42", "168 93 34"],
      accentFg: "24 19 13",
    },
    fonts: { display: FONT.cinzel, body: FONT.spectral, mono: FONT.jetbrains },
  },
  {
    id: "cartographer",
    label: "Cartographer",
    mode: "light",
    tokens: {
      ink: [
        "44 32 20", "58 44 28", "80 65 44", "107 89 66", "138 120 96",
        "168 148 120", "195 179 147", "216 201 166", "231 220 192", "239 230 207", "243 236 216", "247 241 225",
      ],
      accent: ["42 133 127", "31 111 107", "21 87 83"],
      accentFg: "247 241 225",
    },
    fonts: { display: FONT.cormorant, body: FONT.spectral, mono: FONT.jetbrains },
  },
  {
    id: "tactical",
    label: "Tactical Console",
    mode: "dark",
    tokens: {
      ink: [
        "233 238 240", "214 222 225", "179 191 196", "139 154 160", "103 118 125",
        "75 88 94", "55 66 71", "40 48 52", "26 32 36", "20 26 29", "14 19 22", "7 10 12",
      ],
      accent: ["182 255 58", "155 232 31", "121 193 15"],
      accentFg: "14 19 22",
    },
    fonts: { display: FONT.jetbrains, body: FONT.plex, mono: FONT.jetbrains },
  },
  {
    id: "noir",
    label: "Refined Noir",
    mode: "dark",
    tokens: {
      ink: [
        "242 242 244", "228 228 232", "197 197 204", "159 159 168", "120 120 127",
        "87 87 93", "65 65 70", "49 49 53", "32 32 35", "24 24 27", "17 17 19", "8 8 10",
      ],
      accent: ["194 65 95", "168 48 80", "135 34 61"],
      accentFg: "245 245 247",
    },
    fonts: { display: FONT.fraunces, body: FONT.plex, mono: FONT.jetbrains },
  },

  // Catppuccin — the community pastel palette (https://catppuccin.com/palette).
  // The ink ramp maps text → subtext → overlay → surface → base → mantle → crust;
  // the accent is each flavor's "mauve" with two hand-darkened steps for 600/700.
  {
    id: "mocha",
    label: "Catppuccin Mocha",
    mode: "dark",
    tokens: {
      ink: [
        "205 214 244", "186 194 222", "166 173 200", "147 153 178", "127 132 156",
        "108 112 134", "88 91 112", "69 71 90", "49 50 68", "30 30 46", "24 24 37", "17 17 27",
      ],
      accent: ["203 166 247", "175 143 212", "146 120 178"],
      accentFg: "17 17 27",
    },
    fonts: { display: FONT.fraunces, body: FONT.plex, mono: FONT.jetbrains },
  },
  {
    id: "macchiato",
    label: "Catppuccin Macchiato",
    mode: "dark",
    tokens: {
      ink: [
        "202 211 245", "184 192 224", "165 173 203", "147 154 183", "128 135 162",
        "110 115 141", "91 96 120", "73 77 100", "54 58 79", "36 39 58", "30 32 48", "24 25 38",
      ],
      accent: ["198 160 246", "170 138 212", "143 115 177"],
      accentFg: "24 25 38",
    },
    fonts: { display: FONT.fraunces, body: FONT.plex, mono: FONT.jetbrains },
  },
  {
    id: "frappe",
    label: "Catppuccin Frappé",
    mode: "dark",
    tokens: {
      ink: [
        "198 208 245", "181 191 226", "165 173 206", "148 156 187", "131 139 167",
        "115 121 148", "98 104 128", "81 87 109", "65 69 89", "48 52 70", "41 44 60", "35 38 52",
      ],
      accent: ["202 158 230", "174 136 198", "145 114 166"],
      accentFg: "35 38 52",
    },
    fonts: { display: FONT.fraunces, body: FONT.plex, mono: FONT.jetbrains },
  },
  {
    id: "latte",
    label: "Catppuccin Latte",
    mode: "light",
    tokens: {
      ink: [
        "76 79 105", "92 95 119", "108 111 133", "124 127 147", "140 143 161",
        "156 160 176", "172 176 190", "188 192 204", "204 208 218", "220 224 232", "230 233 239", "239 241 245",
      ],
      accent: ["136 57 239", "117 49 206", "98 41 172"],
      accentFg: "239 241 245",
    },
    fonts: { display: FONT.fraunces, body: FONT.plex, mono: FONT.jetbrains },
  },
];

export const DEFAULT_PRESET_ID = "midnight";

export function getPreset(id: string): ThemePreset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0]!;
}
