/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        kraft: {
          50: "#faf6ef",
          100: "#f1e7d3",
          200: "#e3cda5",
          300: "#d2ad72",
          400: "#c08e4c",
          500: "#a8753b",
          600: "#8b5d31",
          700: "#6f4929",
          800: "#523622",
          900: "#3a261a",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
