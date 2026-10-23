const path = require("path")

module.exports = {
  darkMode: "class",
  presets: [require("@medusajs/ui-preset")],
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/modules/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      transitionProperty: {
        width: "width margin",
        height: "height",
        bg: "background-color",
        display: "display opacity",
        visibility: "visibility",
        padding: "padding-top padding-right padding-bottom padding-left",
      },
      // DevCart tokens. The CSS variables live in src/styles/globals.css.
      colors: {
        stock: "rgb(var(--dc-stock) / <alpha-value>)",
        ink: "rgb(var(--dc-ink) / <alpha-value>)",
        "riso-blue": "rgb(var(--dc-riso-blue) / <alpha-value>)",
        "riso-pink": "rgb(var(--dc-riso-pink) / <alpha-value>)",
        "riso-yellow": "rgb(var(--dc-riso-yellow) / <alpha-value>)",
        "riso-green": "rgb(var(--dc-riso-green) / <alpha-value>)",
        grey: {
          0: "#FFFFFF",
          5: "#F9FAFB",
          10: "#F3F4F6",
          20: "#E5E7EB",
          30: "#D1D5DB",
          40: "#9CA3AF",
          50: "#6B7280",
          60: "#4B5563",
          70: "#374151",
          80: "#1F2937",
          90: "#111827",
        },
      },
      borderRadius: {
        // The DevCart system is square; `square` and the default are both 0 so a
        // bare `rounded` cannot accidentally soften a plate.
        square: "var(--dc-radius)",
        DEFAULT: "var(--dc-radius)",
        none: "0px",
        soft: "2px",
        base: "4px",
        rounded: "8px",
        large: "16px",
        circle: "9999px",
      },
      maxWidth: {
        "8xl": "100rem",
      },
      spacing: {
        gutter: "var(--dc-gutter)",
        section: "var(--dc-section)",
        content: "var(--dc-content)",
      },
      screens: {
        "2xsmall": "320px",
        xsmall: "512px",
        small: "1024px",
        medium: "1280px",
        large: "1440px",
        xlarge: "1680px",
        "2xlarge": "1920px",
      },
      /*
       * DevCart type scale, 1.25 ratio on a 16px base: 12 / 14 / 16 / 20 / 25 /
       * 31 / 39 / 49 / 61. Named by role rather than by size so a heading cannot
       * silently become the wrong voice. Tailwind's own numeric scale is left
       * untouched for the starter's existing pages.
       */
      fontSize: {
        "3xl": "2rem",
        micro: ["0.75rem", { lineHeight: "1rem" }],
        small: ["0.875rem", { lineHeight: "1.25rem" }],
        body: ["1rem", { lineHeight: "1.5rem" }],
        lead: ["1.25rem", { lineHeight: "1.75rem" }],
        h3: ["1.5625rem", { lineHeight: "2rem" }],
        h2: ["1.9375rem", { lineHeight: "2.25rem" }],
        h1: ["2.4375rem", { lineHeight: "2.75rem" }],
        display: ["3.0625rem", { lineHeight: "3.25rem" }],
        hero: ["3.8125rem", { lineHeight: "4rem" }],
      },
      fontFamily: {
        // Display: Bricolage Grotesque — headings only.
        display: [
          "var(--font-display)",
          "Georgia",
          "serif",
        ],
        // Body and UI: IBM Plex Sans. Overrides the starter's Inter stack.
        sans: [
          "var(--font-body)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        // Machine data only: SKUs, specs, order numbers.
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      keyframes: {
        ring: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "fade-in-right": {
          "0%": {
            opacity: "0",
            transform: "translateX(10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateX(0)",
          },
        },
        "fade-in-top": {
          "0%": {
            opacity: "0",
            transform: "translateY(-10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "fade-out-top": {
          "0%": {
            height: "100%",
          },
          "99%": {
            height: "0",
          },
          "100%": {
            visibility: "hidden",
          },
        },
        "accordion-slide-up": {
          "0%": {
            height: "var(--radix-accordion-content-height)",
            opacity: "1",
          },
          "100%": {
            height: "0",
            opacity: "0",
          },
        },
        "accordion-slide-down": {
          "0%": {
            "min-height": "0",
            "max-height": "0",
            opacity: "0",
          },
          "100%": {
            "min-height": "var(--radix-accordion-content-height)",
            "max-height": "none",
            opacity: "1",
          },
        },
        enter: {
          "0%": { transform: "scale(0.9)", opacity: 0 },
          "100%": { transform: "scale(1)", opacity: 1 },
        },
        leave: {
          "0%": { transform: "scale(1)", opacity: 1 },
          "100%": { transform: "scale(0.9)", opacity: 0 },
        },
        "slide-in": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(0)" },
        },
      },
      animation: {
        ring: "ring 2.2s cubic-bezier(0.5, 0, 0.5, 1) infinite",
        "fade-in-right":
          "fade-in-right 0.3s cubic-bezier(0.5, 0, 0.5, 1) forwards",
        "fade-in-top": "fade-in-top 0.2s cubic-bezier(0.5, 0, 0.5, 1) forwards",
        "fade-out-top":
          "fade-out-top 0.2s cubic-bezier(0.5, 0, 0.5, 1) forwards",
        "accordion-open":
          "accordion-slide-down 300ms cubic-bezier(0.87, 0, 0.13, 1) forwards",
        "accordion-close":
          "accordion-slide-up 300ms cubic-bezier(0.87, 0, 0.13, 1) forwards",
        enter: "enter 200ms ease-out",
        "slide-in": "slide-in 1.2s cubic-bezier(.41,.73,.51,1.02)",
        leave: "leave 150ms ease-in forwards",
      },
    },
  },
  plugins: [require("tailwindcss-radix")()],
}
