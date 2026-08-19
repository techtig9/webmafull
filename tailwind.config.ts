import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B0E14",
        paper: "#F7F5F0",
        signal: "#5B6CFF",
        signal2: "#00D4B8",
        amber: "#FF8A3D",
        violet: "#8B5CF6",
        coral: "#FB7185",
        line: "#22283A",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        accent: ["var(--font-accent)", "Georgia", "serif"],
      },
      backgroundImage: {
        "grid-glow":
          "radial-gradient(circle at 20% 0%, rgba(91,108,255,0.25), transparent 40%), radial-gradient(circle at 80% 10%, rgba(0,212,184,0.18), transparent 45%)",
      },
    },
  },
  plugins: [],
};

export default config;
