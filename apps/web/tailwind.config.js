/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f5f6fa",
          100: "#e8eaf1",
          200: "#c8cddb",
          300: "#a3aac0",
          400: "#7c849f",
          500: "#5a627d",
          600: "#454c63",
          700: "#363b4d",
          800: "#252a39",
          850: "#1c2230",
          900: "#141826",
          950: "#0b0e18",
        },
        accent: {
          500: "#7c6cff",
          600: "#6b59f0",
          700: "#5a48d6",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
