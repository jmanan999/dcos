import type { Config } from "tailwindcss";

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
        /* ── Token-based (CSS variable) colors ─────────────────────── */
        background:  token("background"),
        foreground:  token("foreground"),
        card:        { DEFAULT: token("card"),        foreground: token("card-foreground") },
        popover:     { DEFAULT: token("popover"),     foreground: token("popover-foreground") },
        primary:     { DEFAULT: token("primary"),     foreground: token("primary-foreground"), hover: token("primary-hover") },
        accent:      { DEFAULT: token("accent"),      foreground: token("accent-foreground"),  hover: token("accent-hover"), light: token("accent-light") },
        secondary:   { DEFAULT: token("secondary"),   foreground: token("secondary-foreground") },
        muted:       { DEFAULT: token("muted"),       foreground: token("muted-foreground") },
        destructive: { DEFAULT: token("destructive"), foreground: token("destructive-foreground") },
        success:     { DEFAULT: token("success"),     foreground: token("success-foreground") },
        warning:     { DEFAULT: token("warning"),     foreground: token("warning-foreground") },
        info:        { DEFAULT: token("info"),        foreground: token("info-foreground") },
        border:      token("border"),
        input:       token("input"),
        ring:        token("ring"),
        severity: {
          critical: token("severity-critical"),
          high:     token("severity-high"),
          medium:   token("severity-medium"),
          low:      token("severity-low"),
        },
        sidebar: {
          DEFAULT:    token("sidebar"),
          foreground: token("sidebar-foreground"),
          muted:      token("sidebar-muted"),
          accent:     token("sidebar-accent"),
          border:     token("sidebar-border"),
        },

        /* ── IC Bold flat palette ───────────────────────────────────── */
        "ic-black":       "#080808",
        "ic-white":       "#FAFAFA",
        "ic-amber":       "#E8920A",
        "ic-amber-dk":    "#C07808",
        "ic-amber-lt":    "#FFF8EE",
        "ic-muted":       "#6B7280",
        "ic-border":      "#E5E7EB",
        "ic-border-dark": "#D1D5DB",

        /* ── Legacy surface tokens (kept for backward compat in pages) */
        "surface":                  "#FAFAFA",
        "surface-dim":              "#F5F5F5",
        "surface-bright":           "#FFFFFF",
        "surface-container-lowest": "#FFFFFF",
        "surface-container-low":    "#F9FAFB",
        "surface-container":        "#F3F4F6",
        "surface-container-high":   "#E5E7EB",
        "surface-container-highest":"#D1D5DB",
        "on-surface":               "#080808",
        "on-surface-variant":       "#6B7280",
        "inverse-surface":          "#1F2937",
        "inverse-on-surface":       "#F9FAFB",
        "outline":                  "#9CA3AF",
        "outline-variant":          "#E5E7EB",
        "primary-container":        "#1A1A1A",
        "on-primary-container":     "#F5F5F5",
      },
      spacing: {
        "margin-desktop": "64px",
        "margin-tablet":  "32px",
        "margin-mobile":  "16px",
        "gutter":         "24px",
        "container-max":  "1280px",
      },
      borderRadius: {
        /* IC Bold: everything is 0 */
        none:    "0px",
        sm:      "0px",
        DEFAULT: "0px",
        md:      "0px",
        lg:      "0px",
        xl:      "2px",
        "2xl":   "4px",
        full:    "9999px",
      },
      fontFamily: {
        sans:        ["var(--font-inter)",         "Inter",         "system-ui", "sans-serif"],
        grotesk:     ["var(--font-space-grotesk)", "Space Grotesk", "system-ui", "sans-serif"],
        devanagari:  ["Noto Sans Devanagari", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
        /* IC Bold typographic scale */
        "display-xl":  ["80px",  { lineHeight: "80px",  letterSpacing: "-0.03em", fontWeight: "900" }],
        "display-lg":  ["64px",  { lineHeight: "68px",  letterSpacing: "-0.03em", fontWeight: "800" }],
        "headline-xl": ["48px",  { lineHeight: "52px",  letterSpacing: "-0.025em",fontWeight: "800" }],
        "headline-lg": ["36px",  { lineHeight: "40px",  letterSpacing: "-0.02em", fontWeight: "800" }],
        "headline-md": ["28px",  { lineHeight: "32px",  letterSpacing: "-0.015em",fontWeight: "700" }],
        "headline-sm": ["22px",  { lineHeight: "28px",  letterSpacing: "-0.01em", fontWeight: "700" }],
        "body-lg":     ["18px",  { lineHeight: "28px",  letterSpacing: "0",       fontWeight: "400" }],
        "body-md":     ["16px",  { lineHeight: "24px",  letterSpacing: "0",       fontWeight: "400" }],
        "body-sm":     ["14px",  { lineHeight: "20px",  letterSpacing: "0",       fontWeight: "400" }],
        "label-caps":  ["11px",  { lineHeight: "16px",  letterSpacing: "0.12em",  fontWeight: "800" }],
        "label-md":    ["12px",  { lineHeight: "16px",  letterSpacing: "0.04em",  fontWeight: "600" }],
      },
      maxWidth: {
        "container-max": "1280px",
      },
      boxShadow: {
        /* IC Bold: borders only, no shadows */
        none: "none",
        xs:   "none",
        sm:   "none",
        md:   "none",
        lg:   "none",
        ring: "0 0 0 2px hsl(var(--ring))",
        "ring-amber": "0 0 0 2px hsl(var(--accent))",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up":   { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in":  { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "slide-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "amber-pulse": { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.4" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "fade-in":        "fade-in 0.25s ease-out",
        "slide-up":       "slide-up 0.3s ease-out",
        "amber-pulse":    "amber-pulse 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
