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
        ink: "#10151A",
        "stadium-navy": "#0A0F16",
        panel: "#131A22",
        "panel-dark": "#10151A",
        "panel-border": "#232C36",
        line: "#2B343C",
        gold: "#D9A94E",
        "gold-deep": "#B9862E",
        "live-green": "#34D399",
        brass: "#C7A046",
        "team-a": "#3E7CB1",
        "team-b": "#B85C38",
        "text-primary": "#F5F3EE",
        "text-muted": "#8B93A0",
      },
      fontFamily: {
        hero: ["'Big Shoulders Display'", "sans-serif"],
        ui: ["'IBM Plex Sans'", "sans-serif"],
        script: ["'Caveat'", "cursive"],
      },
      borderRadius: {
        DEFAULT: "4px",
        sm: "2px",
        md: "4px",
        lg: "4px",
        xl: "4px",
        "2xl": "4px",
        "3xl": "4px",
      },
    },
  },
  plugins: [],
};

export default config;
