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
        // `teal` exposes BOTH the flat brand value (DEFAULT → `bg-teal`,
        // `text-teal`, used across the admin panels) AND the numeric 50–950
        // scale used across the messenger/team screens (`bg-teal-600`, etc.).
        // Defining only the flat string silently dropped every `teal-600` class.
        teal: {
          DEFAULT: 'rgb(var(--color-teal) / <alpha-value>)',
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        crm: 'rgb(var(--color-crm) / <alpha-value>)',
        'crm-navy': 'rgb(var(--color-crm-navy) / <alpha-value>)',
      },
      fontFamily: {
        prata: ['"Prata"', 'serif'],
        roboto: ['"Roboto"', 'sans-serif'],
        // Humanist stacks for the property detail / rich-text surfaces.
        // Titles: Roboto with an Arial fallback. Copy: classic Arial voice.
        title: ['"Roboto"', 'Arial', 'sans-serif'],
        copy: ['Arial', '"Helvetica Neue"', 'Helvetica', 'sans-serif'],
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