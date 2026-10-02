/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#00FF41",
        "brand-light": "#0e7a32",
        ink: "#0d1116",
        surface: { dark: "#030806", light: "#f0fdf7" },
      },
      fontFamily: {
        sans: ["Lato", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"Courier Prime"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
