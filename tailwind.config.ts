/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Bound to CSS variables in index.css (:root) which are the single
        // source of truth and can be overridden at runtime from brand_settings.
        // The rgb(... / <alpha-value>) form keeps opacity utilities like
        // bg-primary/90 and text-golden/50 working everywhere.
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        golden: 'rgb(var(--color-golden) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        crm: 'rgb(var(--color-crm) / <alpha-value>)',
        'crm-navy': 'rgb(var(--color-crm-navy) / <alpha-value>)',
      },
      fontFamily: {
        prata: ['"Prata"', 'serif'],
        roboto: ['"Roboto"', 'sans-serif'],
        jost: ['"Jost"', 'sans-serif'],
        inter: ['"Inter"', 'sans-serif'],
        spaceGrotesk: ['"Space Grotesk"', 'sans-serif'],
      },
      screens: {
        'xs': '480px',
      },
    },
  },
  plugins: [],
}