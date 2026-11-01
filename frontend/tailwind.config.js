/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4ff',
          100: '#dce8ff',
          200: '#b9d1ff',
          300: '#84aeff',
          400: '#487eff',
          500: '#1d51ff',
          600: '#0030ff',
          700: '#0024db',
          800: '#001eb1',
          900: '#0f1e36',
          950: '#0a1628',
        },
        brand: {
          navy: '#1e3a5f',
          'navy-dark': '#0f1e36',
          'navy-light': '#2d5a8e',
          cyan: '#06b6d4',
          'cyan-light': '#22d3ee',
          'cyan-dark': '#0891b2',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'premium': '0 10px 15px -3px rgba(30, 58, 95, 0.1), 0 4px 6px -2px rgba(30, 58, 95, 0.05)',
      },
    },
  },
  plugins: [],
}
