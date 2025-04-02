/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#4da6ff',
          DEFAULT: '#0066cc',
          dark: '#004c99',
        },
        secondary: {
          light: '#ffb84d',
          DEFAULT: '#ff9900',
          dark: '#cc7a00',
        },
      }
    },
  },
  plugins: [],
}
