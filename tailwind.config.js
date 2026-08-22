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
        background: "var(--color-canvas)",
        foreground: "var(--color-text-primary)",
        canvas: "var(--color-canvas)",
        surface: {
          DEFAULT: "var(--color-surface)",
          subtle: "var(--color-surface-subtle)",
          raised: "var(--color-surface-raised)",
          inset: "var(--color-surface-inset)",
          muted: "var(--color-surface-muted)",
        },
        content: {
          DEFAULT: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
          disabled: "var(--color-text-disabled)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          hover: "var(--color-accent-hover)",
          active: "var(--color-accent-active)",
          soft: "var(--color-accent-soft)",
          text: "var(--color-accent-text)",
        },
        border: {
          DEFAULT: "var(--color-border-default)",
          subtle: "var(--color-border-subtle)",
          strong: "var(--color-border-strong)",
        },
        status: {
          success: "var(--color-status-success)",
          'success-surface': "var(--color-status-success-surface)",
          warning: "var(--color-status-warning)",
          'warning-surface': "var(--color-status-warning-surface)",
          danger: "var(--color-status-danger)",
          'danger-surface': "var(--color-status-danger-surface)",
          info: "var(--color-status-info)",
          'info-surface': "var(--color-status-info-surface)",
        },
        channel: {
          whatsapp: "var(--color-whatsapp)",
          youtube: "var(--color-youtube)",
          instagram: "var(--color-instagram)",
          phone: "var(--color-phone)",
          web: "var(--color-web)",
        },
        brand: {
          cobalt: "var(--color-accent)",
          emerald: "#10b981",
          gold: "var(--color-accent)",
          dark: "var(--color-canvas)",
          slate: "var(--color-surface)",
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'Avenir Next', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'Space Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Geist Mono', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      borderRadius: {
        control: 'var(--radius-control)',
        card: 'var(--radius-card)',
        panel: 'var(--radius-panel)',
      },
    },
  },
  plugins: [],
};
