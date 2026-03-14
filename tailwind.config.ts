import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        appbg: "#060f2a",
      },
      boxShadow: {
        glow: "0 18px 40px rgba(2, 8, 30, 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
