/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#4db6ac', 600: '#26a69a' },
        good: '#0ca30c',
        warn: '#fab219',
        crit: '#d03b3b',
      },
    },
  },
  plugins: [],
};
