const { fontFamily } = require("tailwindcss/defaultTheme");

module.exports = {
  mode: "jit",
  darkMode: "class",
  purge: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Assistant", "Heebo", "Inter var", ...fontFamily.sans],
      },
      borderRadius: {
        DEFAULT: "12px",
        secondary: "8px",
        container: "20px",
        card: "16px",
      },
      boxShadow: {
        DEFAULT: "0 2px 12px rgba(0, 0, 0, 0.04)",
        soft: "0 4px 20px rgba(0, 0, 0, 0.06)",
        card: "0 2px 8px rgba(0, 0, 0, 0.03)",
        glass: "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
        top: "0 -4px 12px rgba(0, 0, 0, 0.03)",
      },
      colors: {
        primary: {
          DEFAULT: "#171717", // Charcoal for a professional look
          hover: "#262626",
        },
        success: {
          DEFAULT: "#10b981", // Emerald
          soft: "#ecfdf5",
          dark: "#065f46",
        },
        danger: {
          DEFAULT: "#e11d48", // Soft Crimson
          soft: "#fff1f2",
          dark: "#9f1239",
        },
        slate: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
      },
      spacing: {
        "8": "8px",
        "16": "16px",
        "24": "24px",
        "32": "32px",
      },
    },
  },
  variants: {
    extend: {
      boxShadow: ["hover", "active"],
      scale: ["active"],
    },
  },
};
