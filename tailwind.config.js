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
      colors: {
        // Stitch Primary Tokens
        primary: {
          DEFAULT: "#012d1d",
          container: "#1b4332",
          surface: "#E8F5E9",
          border: "#A3D9B1",
          fixed: "#c1ecd4",
          "fixed-dim": "#a5d0b9",
          light: "#2D6A4F",
          dark: "#081C15",
        },
        "on-primary": "#ffffff",
        "on-primary-container": "#86af99",
        "on-primary-fixed": "#002114",
        "on-primary-fixed-variant": "#274e3d",
        "inverse-primary": "#a5d0b9",

        // Stitch Secondary Tokens
        secondary: {
          DEFAULT: "#2c694e",
          container: "#aeeecb",
          fixed: "#b1f0ce",
          "fixed-dim": "#95d4b3",
          light: "#3f6653",
        },
        "on-secondary": "#ffffff",
        "on-secondary-container": "#316e52",
        "on-secondary-fixed": "#002114",
        "on-secondary-fixed-variant": "#0e5138",

        // Stitch Tertiary / Accent Tokens (Terracotta & Amber)
        tertiary: {
          DEFAULT: "#3e1e00",
          container: "#5e3000",
          fixed: "#ffdcc3",
          "fixed-dim": "#ffb77d",
        },
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#f48c24",
        "on-tertiary-fixed": "#2f1500",
        "on-tertiary-fixed-variant": "#6e3900",
        accent: {
          DEFAULT: "#D97706",
          hover: "#B45309",
          subtle: "#FEF3C7",
          border: "#FCD34D",
          text: "#92400E",
        },

        // Stitch Neutral / Surface Tokens
        background: "#fef9f0",
        "on-background": "#1d1c17",
        canvas: "#FBFBF9",
        alabaster: "#FBFBF9",
        sandstone: "#E5E0D8",

        surface: {
          DEFAULT: "#ffffff",
          bright: "#fef9f0",
          dim: "#ded9d1",
          variant: "#e7e2da",
          subtle: "#F3EFEA",
          muted: "#EFEAE1",
          inset: "#F8F6F0",
        },
        "surface-bright": "#fef9f0",
        "surface-dim": "#ded9d1",
        "surface-variant": "#e7e2da",
        "surface-tint": "#3f6653",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f8f3eb",
        "surface-container": "#f2ede5",
        "surface-container-high": "#ede7df",
        "surface-container-highest": "#e7e2da",

        "on-surface": "#1d1c17",
        "on-surface-variant": "#414844",
        "inverse-surface": "#32302b",
        "inverse-on-surface": "#f5f0e8",

        // Stitch Outline & Borders
        outline: "#717973",
        "outline-variant": "#c1c8c2",
        "border-sandstone": "#E5E0D8",
        border: {
          DEFAULT: "#E5E0D8",
          subtle: "#F0EBE1",
          strong: "#D1C7B7",
        },

        // Status Colors
        error: {
          DEFAULT: "#ba1a1a",
          container: "#ffdad6",
        },
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
        status: {
          success: "#15803D",
          "success-bg": "#DCFCE7",
          warning: "#B45309",
          "warning-bg": "#FEF3C7",
          danger: "#B91C1C",
          "danger-bg": "#FEE2E2",
          info: "#1D4ED8",
          "info-bg": "#DBEAFE",
        },

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

