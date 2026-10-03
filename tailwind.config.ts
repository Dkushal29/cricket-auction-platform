import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#070B12",
        surface: "#0D131C",
        "surface-raised": "#121A24",
        "stadium-navy": "#070B12",
        panel: "#0D131C",
        "panel-dark": "#070B12",
        "panel-border": "#202B38",
        line: "#202B38",
        gold: "#E5AE3F",
        "gold-bright": "#F4C65E",
        "gold-deep": "#B9862E",
        brass: "#E5AE3F",
        "live-green": "#28D17C",
        danger: "#FF5C5C",
        info: "#4DA3FF",
        "team-a": "#3E7CB1",
        "team-b": "#B85C38",
        "text-primary": "#F5F7FA",
        "text-muted": "#8B98A8",
      },
      fontFamily: {
        hero: ["'Bebas Neue'", "'Big Shoulders Display'", "sans-serif"],
        display: ["'Bebas Neue'", "'Big Shoulders Display'", "sans-serif"],
        ui: ["'Inter'", "'IBM Plex Sans'", "sans-serif"],
        sans: ["'Inter'", "'IBM Plex Sans'", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "4px",
        sm: "2px",
        md: "4px",
        lg: "6px",
        xl: "8px",
      },
    },
  },
  plugins: [],
};

export default config;
