import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        elevacx: {
          header: "#2E1065",
          hero: "#7C5CBF",
          bg: "#4C1D95",
          bgDark: "#3B0764",
          accentFrom: "#C026D3",
          accentTo: "#7C3AED",
          panel: "#1A0E2E",
          panelBorder: "#A78BFA",
          inputBg: "#120A22",
          inputBorder: "#4C1D95",
          inputFocus: "#C026D3",
          text: "#FFFFFF",
          placeholder: "#9CA3AF",
          required: "#F87171",
        },
      },
      backgroundImage: {
        "elevacx-gradient":
          "linear-gradient(180deg, #7C5CBF 0%, #4C1D95 50%, #3B0764 100%)",
        "elevacx-accent-gradient":
          "linear-gradient(135deg, #C026D3 0%, #7C3AED 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
