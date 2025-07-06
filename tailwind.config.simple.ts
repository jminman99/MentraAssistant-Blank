import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

export default {
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {},
  },
  plugins: [typography],
} satisfies Config;