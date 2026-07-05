/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1F2937',
        paper: '#FAFAF8',
        accent: '#0F6E56',
        warn: '#BA7517',
        danger: '#A32D2D',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Thai"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
