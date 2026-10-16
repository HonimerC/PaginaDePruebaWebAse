/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Source Sans 3"', '"Source Sans Pro"', "system-ui", "sans-serif"],
        serif: ['"Playfair Display"', "Georgia", "serif"]
      },
      colors: {
        forest: "#153e34",
        deep: "#102e27",
        coal: "#252b28",
        ivory: "#f7f5ef",
        wood: "#bd9871",
        copper: "#a76c47",
        line: "#d3d1c7"
      }
    }
  },
  plugins: []
};
