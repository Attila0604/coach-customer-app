import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-serif)", "Oswald", "Impact", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        // Hinweis: Token-Namen aus Effizienzgründen beibehalten, Werte auf das
        // RGYM-Stahl-/Silber-Design umgestellt. "gold" = Stahlblau-Akzent.
        ink: {
          900: "#10151D",
          800: "#1B232F",
        },
        bone: {
          DEFAULT: "#E7ECF2",
          muted: "#9AA6B4",
          faint: "#5E6B7A",
        },
        gold: {
          DEFAULT: "#8FAAC6",
          soft: "#C9D2DB",
          deep: "#6E8295",
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
