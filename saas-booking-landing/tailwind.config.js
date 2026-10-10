/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Hand-Drawn identity, shared with saas-booking-app: paper, ink and a few marker colors.
      colors: {
        paper: { DEFAULT: '#FBF7EF', deep: '#F3ECDD' },
        ink: { DEFAULT: '#1F2328', soft: '#4A4F57' },
        marker: { DEFAULT: '#2450B8', dark: '#1B3E91', light: '#DCE5F8' },
        sun: { DEFAULT: '#FFD35C', light: '#FFF1C7' },
        coral: { DEFAULT: '#B83A2A', light: '#FBE3DE' },
        leaf: { DEFAULT: '#256B48', light: '#DDF1E5' },
        primary: {
          DEFAULT: '#3B82F6',
          dark: '#2563EB',
        },
        dark: {
          DEFAULT: '#111827',
          lighter: '#1F2937',
        },
      },
      fontFamily: {
        sans: ['"Nunito Variable"', 'Nunito', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
        hand: ['Caveat', '"Segoe Print"', '"Bradley Hand"', 'cursive'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
