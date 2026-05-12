import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          900: "#0F0E0C",
          800: "#1A1815",
        },
        bone: {
          DEFAULT: "#F2EFE8",
          muted: "#8C8780",
          faint: "#6B6760",
        },
        gold: {
          DEFAULT: "#C9A961",
          soft: "#D4B66E",
          deep: "#9D8554",
        },
      },
      letterSpacing: {
        caps: "0.16em",
      },
    },
  },
  plugins: [],
};

export default config;
