import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "var(--canvas)",
          soft: "var(--canvas-soft)",
          "text-soft": "var(--canvas-text-soft)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          soft: "var(--primary-soft)",
          deep: "var(--primary-deep)",
        },
        on: {
          primary: "var(--on-primary)",
        },
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
        
        // Shadcn/default UI mappings
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
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
      },
      borderRadius: {
        none: "0px",
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "8px",
        pill: "9999px",
        full: "9999px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        "display-xl": ["60px", { lineHeight: "60px", letterSpacing: "-0.65px", fontWeight: "400" }],
        "display-lg": ["36px", { lineHeight: "40px", letterSpacing: "-0.9px", fontWeight: "400" }],
        "display-md": ["24px", { lineHeight: "32px", letterSpacing: "-0.6px", fontWeight: "700" }],
        "display-sm": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "eyebrow-mono": ["14px", { lineHeight: "20px", letterSpacing: "2.52px", fontWeight: "600" }],
        "eyebrow-uppercase": ["18px", { lineHeight: "28px", letterSpacing: "0.45px", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "26px", fontWeight: "400" }],
        "body-md-strong": ["16px", { lineHeight: "24px", fontWeight: "600" }],
        "body-sm": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-sm-strong": ["14px", { lineHeight: "23px", fontWeight: "600" }],
        caption: ["12px", { lineHeight: "16px", fontWeight: "400" }],
        "caption-strong": ["12px", { lineHeight: "16px", fontWeight: "500" }],
        code: ["13px", { lineHeight: "18px", fontWeight: "400" }],
        "code-strong": ["13px", { lineHeight: "16px", fontWeight: "550" }],
        "button-md": ["16px", { lineHeight: "24px", fontWeight: "600" }],
      },
      spacing: {
        xxs: "2px",
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
        "4xl": "40px",
        "5xl": "48px",
        "6xl": "64px",
      },
      transitionTimingFunction: {
        "out-strong": "cubic-bezier(0.23, 1, 0.32, 1)",
        "in-out-strong": "cubic-bezier(0.77, 0, 0.175, 1)",
        "drawer": "cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
