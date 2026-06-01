/** @type {import('tailwindcss').Config} */

// Build a Tailwind color scale whose every stop resolves from a CSS variable
// holding an "R G B" channel triple, so themes can be swapped at runtime while
// `<alpha-value>` opacity utilities keep working.
const scale = (name, stops) =>
  Object.fromEntries(stops.map((s) => [s, `rgb(var(--${name}-${s}) / <alpha-value>)`]));

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: scale("ink", [50, 100, 200, 300, 400, 500, 600, 700, 800, 850, 900, 950]),
        accent: scale("accent", [500, 600, 700]),
        "accent-fg": "rgb(var(--accent-fg) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
};
