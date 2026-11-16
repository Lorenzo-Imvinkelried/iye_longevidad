import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sancor: {
          primary: "#a70355",
          "primary-dark": "#8c0347",
          magenta: "#a70355",
          "magenta-dark": "#8c0347",
          "magenta-tint": "#fdf9fb",
          "magenta-soft": "#faf0f5",
          "magenta-subtle": "#f4e1eb",
          surface: "#f6f6f7",
          border: "#eaeced",
          "border-strong": "#c4c9cd",
          heading: "#363f48",
          body: "#52606d",
          muted: "#67717c",
          danger: "#bf2020",
        },
      },
    },
  },
  plugins: [],
};
export default config;
