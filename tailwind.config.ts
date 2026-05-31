import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#2a2530",
        paper: "#fbf7f4",
        accent: "#3b82f6", // stocknews-cyan 블루 포인트
        "accent-soft": "#ffe9e1",
        "accent-ink": "#d2491f",
        violet: "#7c6bff",
      },
      borderRadius: {
        "3xl": "1.5rem",
      },
      boxShadow: {
        soft: "0 8px 24px rgba(42,37,48,.06)",
        "soft-lg": "0 18px 40px rgba(42,37,48,.12)",
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "72ch",
          },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
