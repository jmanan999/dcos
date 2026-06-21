import type { Config } from "tailwindcss";

/** Map a semantic HSL token to a Tailwind color that supports opacity modifiers. */
const token = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        /* ── Token-based (CSS variable) colors ────────────────────── */
        background: token("background"),
        foreground: token("foreground"),
        card: { DEFAULT: token("card"), foreground: token("card-foreground") },
        popover: { DEFAULT: token("popover"), foreground: token("popover-foreground") },
        primary: {
          DEFAULT: token("primary"),
          foreground: token("primary-foreground"),
          hover: token("primary-hover"),
        },
        secondary: { DEFAULT: token("secondary"), foreground: token("secondary-foreground") },
        muted: { DEFAULT: token("muted"), foreground: token("muted-foreground") },
        accent: { DEFAULT: token("accent"), foreground: token("accent-foreground") },
        destructive: { DEFAULT: token("destructive"), foreground: token("destructive-foreground") },
        success: { DEFAULT: token("success"), foreground: token("success-foreground") },
        warning: { DEFAULT: token("warning"), foreground: token("warning-foreground") },
        info: { DEFAULT: token("info"), foreground: token("info-foreground") },
        border: token("border"),
        input: token("input"),
        ring: token("ring"),
        severity: {
          critical: token("severity-critical"),
          high:     token("severity-high"),
          medium:   token("severity-medium"),
          low:      token("severity-low"),
        },
        sidebar: {
          DEFAULT:  token("sidebar"),
          foreground: token("sidebar-foreground"),
          muted:    token("sidebar-muted"),
          accent:   token("sidebar-accent"),
          border:   token("sidebar-border"),
        },

        /* ── Global Sovereign flat colors (Stitch-compatible names) ── */
        "surface":                  "#faf8ff",
        "surface-dim":              "#d2d9f4",
        "surface-bright":           "#ffffff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low":    "#f2f3ff",
        "surface-container":        "#eaedff",
        "surface-container-high":   "#e2e7ff",
        "surface-container-highest":"#dae2fd",
        "on-surface":               "#131b2e",
        "on-surface-variant":       "#434750",
        "inverse-surface":          "#283044",
        "inverse-on-surface":       "#eef0ff",
        "outline":                  "#737781",
        "outline-variant":          "#c3c6d2",
        "surface-tint":             "#345e9f",
        "primary-container":        "#003b7a",
        "on-primary-container":     "#80a7ed",
        "inverse-primary":          "#aac7ff",
        "on-primary":               "#ffffff",
        "secondary-container":      "#d5e3fc",
        "on-secondary-container":   "#57657a",
        "tertiary":                 "#17273b",
        "tertiary-container":       "#2d3d52",
        "on-tertiary-container":    "#97a8c0",
        "error-container":          "#ffdad6",
        "on-error-container":       "#93000a",
        "primary-fixed":            "#d6e3ff",
        "primary-fixed-dim":        "#aac7ff",
        "on-primary-fixed":         "#001b3e",
        "on-primary-fixed-variant": "#154685",
        "surface-variant":          "#dae2fd",
      },
      spacing: {
        /* Stitch layout tokens */
        "margin-desktop": "48px",
        "margin-tablet":  "32px",
        "margin-mobile":  "16px",
        "gutter":         "24px",
        "container-max":  "1280px",
      },
      borderRadius: {
        sm:      "var(--radius)",
        DEFAULT: "var(--radius)",
        md:      "var(--radius)",
        lg:      "var(--radius)",
        xl:      "calc(var(--radius) + 4px)",
        "2xl":   "calc(var(--radius) + 8px)",
        none:    "0px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        devanagari: ["Noto Sans Devanagari", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
        /* Stitch typography scale */
        "headline-xl":       ["48px", { lineHeight: "56px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-xl-mobile":["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg":       ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "headline-md":       ["24px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-sm":       ["20px", { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "body-lg":           ["18px", { lineHeight: "28px", letterSpacing: "0",       fontWeight: "400" }],
        "body-md":           ["16px", { lineHeight: "24px", letterSpacing: "0",       fontWeight: "400" }],
        "body-sm":           ["14px", { lineHeight: "20px", letterSpacing: "0",       fontWeight: "400" }],
        "label-caps":        ["12px", { lineHeight: "16px", letterSpacing: "0.1em",   fontWeight: "700" }],
        "label-md":          ["12px", { lineHeight: "16px", letterSpacing: "0.02em",  fontWeight: "500" }],
      },
      maxWidth: {
        "container-max": "1280px",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(16 24 40 / 0.04)",
        sm: "0 1px 3px 0 rgb(16 24 40 / 0.08), 0 1px 2px -1px rgb(16 24 40 / 0.06)",
        md: "0 4px 12px -2px rgb(16 24 40 / 0.08), 0 2px 6px -2px rgb(16 24 40 / 0.05)",
        lg: "0 12px 28px -6px rgb(16 24 40 / 0.12), 0 4px 10px -4px rgb(16 24 40 / 0.06)",
        ring: "0 0 0 1px hsl(var(--border))",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up":   { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in":  { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "slide-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "fade-in":  "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
