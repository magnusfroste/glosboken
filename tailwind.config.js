/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
      colors: {
        ink: "#0f172a",
        brand: { DEFAULT: "#0d9488", soft: "#ccfbf1", dark: "#0f766e" },
      },
    },
  },
  plugins: [],
};
