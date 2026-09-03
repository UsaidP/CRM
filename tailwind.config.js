/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        xs: "400px",
      },
      colors: {
        // Portal gold accent tokens (verified-advisory brand gold)
        gold: {
          DEFAULT: "#8C641E",
          light: "#B38A38",
          lighter: "#DFBA73",
        },
        // Dynamic Canvas & Background
        canvas: "var(--color-canvas)",
        background: "var(--color-canvas)",
        "on-background": "var(--color-ink)",
        alabaster: "var(--color-canvas)",
        sandstone: "var(--color-border)",

        // Dynamic Surfaces
        surface: {
          DEFAULT: "var(--color-surface)",
          bright: "var(--color-surface-raised)",
          dim: "var(--color-surface-muted)",
          variant: "var(--color-surface-subtle)",
          subtle: "var(--color-surface-subtle)",
          muted: "var(--color-surface-muted)",
          inset: "var(--color-surface-inset)",
          raised: "var(--color-surface-raised)",
        },
        "surface-bright": "var(--color-surface-raised)",
        "surface-dim": "var(--color-surface-muted)",
        "surface-variant": "var(--color-surface-subtle)",
        "surface-tint": "var(--color-primary-light)",
        "surface-container-lowest": "var(--color-surface)",
        "surface-container-low": "var(--color-surface-subtle)",
        "surface-container": "var(--color-surface-subtle)",
        "surface-container-high": "var(--color-surface-muted)",
        "surface-container-highest": "var(--color-surface-muted)",

        // Typography Content Tokens
        content: {
          DEFAULT: "var(--color-ink)",
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
          disabled: "var(--color-text-disabled)",
          inverse: "var(--color-text-inverse)",
        },
        "on-surface": "var(--color-ink)",
        "on-surface-variant": "var(--color-text-secondary)",
        "inverse-surface": "var(--color-surface-raised)",
        "inverse-on-surface": "var(--color-ink)",

        // Hairlines & Borders
        outline: "var(--color-border)",
        "outline-variant": "var(--color-border-subtle)",
        "border-sandstone": "var(--color-border)",
        border: {
          DEFAULT: "var(--color-border)",
          subtle: "var(--color-border-subtle)",
          strong: "var(--color-border-strong)",
        },

        // Primary Brand (Cypress Forest Green)
        primary: {
          DEFAULT: "var(--color-primary)",
          container: "var(--color-primary-dark)",
          surface: "var(--color-primary-surface)",
          border: "var(--color-primary-border)",
          fixed: "var(--color-primary-surface)",
          "fixed-dim": "var(--color-primary-light)",
          light: "var(--color-primary-light)",
          dark: "var(--color-primary-dark)",
        },
        "on-primary": "var(--color-action-on-primary)",
        "on-primary-container": "var(--color-text-inverse)",
        "on-primary-fixed": "#002114",
        "on-primary-fixed-variant": "#274e3d",
        "inverse-primary": "var(--color-primary-light)",

        // Secondary Brand
        secondary: {
          DEFAULT: "var(--color-primary-light)",
          container: "var(--color-primary-surface)",
          fixed: "var(--color-primary-surface)",
          "fixed-dim": "var(--color-primary-light)",
          light: "var(--color-primary-light)",
        },
        "on-secondary": "#ffffff",
        "on-secondary-container": "var(--color-primary)",

        // Accent Brand (Warm Ochre & Amber)
        accent: {
          DEFAULT: "var(--color-accent)",
          hover: "var(--color-accent-hover)",
          active: "var(--color-accent-active)",
          soft: "var(--color-accent-soft)",
          subtle: "var(--color-accent-subtle)",
          text: "var(--color-accent-text)",
          border: "var(--color-accent-hover)",
        },

        // Status Feedback Tokens
        status: {
          success: "var(--color-status-success)",
          "success-surface": "var(--color-status-success-surface)",
          "success-bg": "var(--color-status-success-surface)",
          warning: "var(--color-status-warning)",
          "warning-surface": "var(--color-status-warning-surface)",
          "warning-bg": "var(--color-status-warning-surface)",
          danger: "var(--color-status-danger)",
          "danger-surface": "var(--color-status-danger-surface)",
          "danger-bg": "var(--color-status-danger-surface)",
          info: "var(--color-status-info)",
          "info-surface": "var(--color-status-info-surface)",
          "info-bg": "var(--color-status-info-surface)",
        },

        // Legacy / Fallback Status Colors
        error: {
          DEFAULT: "var(--color-status-danger)",
          container: "var(--color-status-danger-surface)",
        },
        "on-error": "#ffffff",
        "on-error-container": "var(--color-status-danger)",

        // Social / Channel Attribution
        channel: {
          youtube: "#FF0000",
          instagram: "#E4405F",
          whatsapp: "#25D366",
          phone: "#0284C7",
          qr: "#D97706",
          web: "#1B4332",
        },
      },
      fontFamily: {
        "display-sm": ["Plus Jakarta Sans", "sans-serif"],
        "headline-sm": ["Plus Jakarta Sans", "sans-serif"],
        "body-md": ["Plus Jakarta Sans", "Inter", "sans-serif"],
        "body-sm": ["Plus Jakarta Sans", "Inter", "sans-serif"],
        "label-bold": ["Plus Jakarta Sans", "sans-serif"],
        "data-mono": ["JetBrains Mono", "Geist Mono", "monospace"],
        "timer-lg": ["JetBrains Mono", "Geist Mono", "monospace"],
        display: ["Plus Jakarta Sans", "sans-serif"],
        sans: ["Plus Jakarta Sans", "Inter", "sans-serif"],
        serif: ["var(--font-serif)", "Playfair Display", "Cormorant Garamond", "Georgia", "serif"],
        mono: ["JetBrains Mono", "Geist Mono", "monospace"],
      },
      fontSize: {
        "display-sm": ["24px", { lineHeight: "32px", fontWeight: "700" }],
        "headline-sm": ["18px", { lineHeight: "24px", fontWeight: "600" }],
        "data-mono": ["14px", { lineHeight: "20px", fontWeight: "500" }],
        "timer-lg": ["20px", { lineHeight: "24px", fontWeight: "600" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-sm": ["13px", { lineHeight: "18px", fontWeight: "400" }],
        "label-bold": ["12px", { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "600" }],
      },
      spacing: {
        "4.5": "1.125rem",
        "5.5": "1.375rem",
        13: "3.25rem",
        18: "4.5rem",
        "row-height": "40px",
        gutter: "16px",
        "margin-page": "24px",
        "stack-xs": "4px",
        "stack-sm": "8px",
        "stack-md": "12px",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        sm: "0.125rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      boxShadow: {
        stitch: "0 1px 3px 0 rgba(1, 45, 29, 0.05), 0 1px 2px 0 rgba(1, 45, 29, 0.03)",
        "stitch-md": "0 4px 6px -1px rgba(1, 45, 29, 0.08), 0 2px 4px -2px rgba(1, 45, 29, 0.04)",
        "stitch-lg": "0 10px 15px -3px rgba(1, 45, 29, 0.1), 0 4px 6px -4px rgba(1, 45, 29, 0.05)",
      },
    },
  },
  plugins: [],
};

