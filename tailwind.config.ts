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
          primary: "#0a4494",
          "primary-dark": "#08397c",
          magenta: "#a70355",
          "magenta-dark": "#8c0347",
          "magenta-tint": "#fdf9fb",
          "magenta-soft": "#faf0f5",
          surface: "#f6f6f7",
          border: "#eaeced",
          heading: "#363f48",
          body: "#52606d",
          success: "#168003",
          danger: "#bf2020",
        },
      },
    },
  },
  plugins: [],
};
export default config;
