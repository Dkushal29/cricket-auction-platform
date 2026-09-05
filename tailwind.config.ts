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
        panel: "#1B2229",
        line: "#2B343C",
        brass: "#C7A046",
        "team-a": "#3E7CB1",
        "team-b": "#B85C38",
        "text-primary": "#EDEAE1",
        "text-muted": "#8B939A",
      },
      fontFamily: {
        hero: ["'Big Shoulders Display'", "sans-serif"],
        ui: ["'IBM Plex Sans'", "sans-serif"],
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
