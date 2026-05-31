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
        ink: "#1a1a1a",
        paper: "#fafaf7",
        accent: "#c8102e", // 한국 전통 단청 적색 계열 포인트
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
