/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'base-canvas': '#080D18',
        'surface-1': '#101827',
        'surface-2': '#141E30',
        'surface-3': '#1C2A42',
        'border-stroke': '#1E2E48',
        'accent-cyan': '#00D4FF',
        'accent-blue': '#477BFF',
        'accent-amber': '#FFB547',
        'accent-red': '#FF5364',
      },
    },
  },
  plugins: [],
}
