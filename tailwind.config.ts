/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#001731',
        golden: '#D5A91C',
        accent: '#0E7C7B',
      },
      fontFamily: {
        prata: ['"Prata"', 'serif'],
        roboto: ['"Roboto"', 'sans-serif'],
        jost: ['"Jost"', 'sans-serif'],
      },
      screens: {
        'xs': '480px',
      },
    },
  },
  plugins: [],
}