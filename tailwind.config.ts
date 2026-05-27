import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#1B2A4A", light: "#2C4A7C" },
        status: {
          green: "#16A34A",
          "green-bg": "#DCFCE7",
          amber: "#D97706",
          "amber-bg": "#FEF3C7",
          red: "#DC2626",
          "red-bg": "#FEE2E2",
          blue: "#2563EB",
          "blue-bg": "#DBEAFE",
          purple: "#7C3AED",
          "purple-bg": "#EDE9FE",
          grey: "#9CA3AF",
          "grey-bg": "#F3F4F6"
        },
        page: { bg: "#F5F6F8" },
        border: { DEFAULT: "#E2E5EA" },
        text: { primary: "#2D3748", secondary: "#6B7280" },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
    },
  },
  plugins: [],
} satisfies Config

export default config
