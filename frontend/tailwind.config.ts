import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base:       "var(--color-bg-base)",
          elevated:   "var(--color-bg-elevated)",
          card:       "var(--color-bg-card)",
          "card-hover": "var(--color-bg-card-hover)",
        },
        border: {
          subtle: "var(--color-border-subtle)",
          accent: "var(--color-border-accent)",
        },
        text: {
          primary:   "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          tertiary:  "var(--color-text-tertiary)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          light:   "var(--color-accent-light)",
          dim:     "var(--color-accent-dim)",
        },
        success: "var(--color-success)",
        warn:    "var(--color-warn)",
        danger:  "var(--color-danger)",
      },
      fontFamily: {
        geist: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono:  ["var(--font-geist-mono)", "ui-monospace", "monospace"],
        noto:  ["var(--font-noto-devanagari)", "var(--font-noto-telugu)", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        pill: "9999px",
        orb:  "24px",
      },
    },
  },
  plugins: [],
};
export default config;
