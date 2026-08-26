import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        canvas: {
          DEFAULT: "var(--canvas)",
          soft: "var(--canvas-soft)",
          textSoft: "var(--canvas-text-soft)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
          muted: "var(--card-muted)",
          feature: "var(--card-feature)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          soft: "var(--primary-soft)",
          deep: "var(--primary-deep)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        ink: {
          DEFAULT: "var(--ink)",
          strong: "var(--ink-strong)",
        },
        body: "var(--body)",
        mute: "var(--mute)",
        hairline: {
          DEFAULT: "var(--hairline)",
          soft: "var(--hairline-soft)",
        },
        clay: {
          DEFAULT: "#d97757",
          deep: "#c6613f",
          soft: "#e28e73",
        },
        ivory: {
          canvas: "#f0eee6",
          card: "#faf9f5",
          manilla: "#f5e3c7",
          oat: "#e3dacc",
        },
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
        pill: "9999px",
        full: "9999px",
      },
      fontFamily: {
        sans: ["Kalam-Regular", "Kalam-Variable", "cursive", "sans-serif"],
        kalam: ["Kalam-Regular", "Kalam-Variable", "cursive", "sans-serif"],
        "kalam-bold": ["Kalam-Bold", "cursive", "sans-serif"],
        "kalam-light": ["Kalam-Light", "cursive", "sans-serif"],
        "kalam-var": ["Kalam-Variable", "cursive", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        display: ["Kalam-Bold", "Kalam-Variable", "cursive", "sans-serif"],
      },
      animation: {
        "cursor-blink": "cursor-blink 1s step-end infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        "cursor-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
