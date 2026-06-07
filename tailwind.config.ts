import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        shell: {
          base: "rgb(var(--color-shell-base) / <alpha-value>)",
          panel: "rgb(var(--color-shell-panel) / <alpha-value>)",
          panelStrong: "rgb(var(--color-shell-panel-strong) / <alpha-value>)",
          border: "rgb(var(--color-shell-border) / <alpha-value>)"
        },
        ink: {
          DEFAULT: "rgb(var(--color-ink) / <alpha-value>)",
          soft: "rgb(var(--color-ink-soft) / <alpha-value>)",
          faint: "rgb(var(--color-ink-faint) / <alpha-value>)"
        },
        brand: {
          DEFAULT: "rgb(var(--color-brand) / <alpha-value>)",
          deep: "rgb(var(--color-brand-deep) / <alpha-value>)",
          accent: "rgb(var(--color-brand-accent) / <alpha-value>)",
          warm: "rgb(var(--color-brand-warm) / <alpha-value>)"
        },
        success: {
          DEFAULT: "rgb(var(--color-success) / <alpha-value>)"
        },
        warning: {
          DEFAULT: "rgb(var(--color-warning) / <alpha-value>)"
        },
        danger: {
          DEFAULT: "rgb(var(--color-danger) / <alpha-value>)"
        }
      },
      boxShadow: {
        shell: "0 24px 60px rgba(17, 27, 46, 0.12)",
        card: "0 18px 30px rgba(17, 27, 46, 0.08)",
        glow: "0 20px 50px rgba(32, 110, 170, 0.16)"
      },
      borderRadius: {
        shell: "30px",
        card: "22px"
      },
      fontFamily: {
        display: ["Sora", "Segoe UI", "sans-serif"],
        body: ["Manrope", "Segoe UI", "sans-serif"]
      },
      backgroundImage: {
        "shell-gradient":
          "linear-gradient(180deg, rgba(251, 247, 240, 1) 0%, rgba(243, 236, 223, 1) 55%, rgba(226, 215, 197, 1) 100%)",
        "brand-gradient":
          "linear-gradient(135deg, rgba(21, 37, 60, 1) 0%, rgba(34, 84, 140, 1) 100%)"
      }
    }
  },
  plugins: []
} satisfies Config;
