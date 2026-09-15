import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F7F7F5",
        surface: "#FFFFFF",
        surface2: "#FBFBFA",
        border: "rgba(15,15,15,0.08)",
        "border-strong": "rgba(15,15,15,0.14)",
        text: "#37352F",
        "text-2": "#787774",
        "text-3": "#9B9A97",
        accent: "#0071E3",
      },
      fontFamily: {
        sans: [
          "-apple-system", "BlinkMacSystemFont", "SF Pro Text", "PingFang SC",
          "Helvetica Neue", "Microsoft YaHei", "Arial", "sans-serif",
        ],
        mono: ["ui-monospace", "SF Mono", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
