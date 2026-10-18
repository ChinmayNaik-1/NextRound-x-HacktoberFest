/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#3186FF",
          red: "#FC413D",
          green: "#00B95C",
          yellow: "#FBBC04",
          yellowLight: "#FFE432",
          purple: "#749BFF",
          dark: "#1A1A1A",
          surfaceDark: "#1C1C1E"
        }
      },
      fontFamily: {
        sans: ["'Google Sans Flex'", "'Google Sans'", "sans-serif"],
        mono: ["'Google Sans Code'", "monospace"],
      },
      borderRadius: {
        pill: "999px",
        card: "16px",
      },
      boxShadow: {
        card: "0 2px 12px rgba(0,0,0,0.06)",
        elevated: "0 8px 32px rgba(0,0,0,0.12)",
        glowBlue: "0 0 24px rgba(49, 134, 255, 0.35)",
        glowGreen: "0 0 24px rgba(0, 185, 92, 0.35)",
        glowRed: "0 0 24px rgba(252, 65, 61, 0.35)",
      }
    },
  },
  plugins: [],
}
