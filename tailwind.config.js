/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          light: '#4a90e2',
          DEFAULT: '#2c5f8d',
          dark: '#1a3a52',
          deeper: '#0f2333',
        },
      },
    },
  },
  plugins: [],
}
