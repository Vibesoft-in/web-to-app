import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mavora: ['"Manrope"', "sans-serif"],
        mavoraMono: ['"Geist Mono"', "monospace"],
        sans: [
          '"Plus Jakarta Sans"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        serif: [
          '"Playfair Display"',
          "Georgia",
          '"Times New Roman"',
          "serif",
        ],
      },
      colors: {
        // AppifyHub / webtoapp.livaan.in Warm Editorial Palette
        brand: {
          50: "#FBF9F7",
          100: "#F3EEE7", // --bg-bubble
          200: "#EFEAE2", // --btn-bg
          300: "#DBD2C5", // btn hover
          400: "#C2A88F", // secondary bronze
          500: "#A68A70", // --accent-light-bronze
          600: "#78593D", // --accent-bronze (Primary action)
          700: "#63472E", // hover dark bronze
          800: "#4A3422",
          900: "#1C1917", // --text-heading
          950: "#1A1613",
        },
        // Re-map indigo to the bronze palette so existing UI elements automatically inherit the new theme
        indigo: {
          50: "#FBF9F7",
          100: "#F3EEE7",
          200: "#EFEAE2",
          300: "#DBD2C5",
          400: "#C2A88F",
          500: "#A68A70",
          600: "#78593D",
          700: "#63472E",
          800: "#4A3422",
          900: "#1C1917",
          950: "#1A1613",
        },
        // Re-map violet to complementary bronze tones
        violet: {
          50: "#FAF5EE",
          100: "#F3EDE5",
          200: "#E8DDD0",
          300: "#D5C7B8",
          400: "#C2A88F",
          500: "#A68A70",
          600: "#78593D",
          700: "#63472E",
          800: "#523A25",
          900: "#1C1917",
        },
        // Re-map slate to warm stone/cream neutrals from webtoapp.livaan.in
        slate: {
          50: "#F7F5F0",  // --bg-strip
          100: "#F3EEE7", // --bg-bubble
          200: "#EBE6DF", // --border-subtle
          300: "#E2DBD0", // --border-line
          400: "#A8A199",
          500: "#7E756B", // --text-muted
          600: "#57514B", // --text-body
          700: "#403A32",
          800: "#292524",
          900: "#1C1917", // --text-heading
          950: "#121212",
        },
        // Direct named tokens from webtoapp.livaan.in
        bronze: {
          DEFAULT: "#78593D",
          light: "#A68A70",
          dark: "#63472E",
          secondary: "#C2A88F",
          subtle: "#EFEAE2",
        },
        warm: {
          page: "#FFFFFF",
          strip: "#F7F5F0",
          card: "#FFFFFF",
          tinted: "#F9F7F4",
          bubble: "#F3EEE7",
          btn: "#EFEAE2",
          btnHover: "#DBD2C5",
          subtle: "#EBE6DF",
          line: "#E2DBD0",
          heading: "#1C1917",
          body: "#57514B",
          muted: "#7E756B",
        },
      },
    },
  },
  plugins: [],
};
export default config;

