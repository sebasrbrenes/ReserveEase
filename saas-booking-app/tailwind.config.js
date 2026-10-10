/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Hand-Drawn identity (see /style-guide): paper, ink and a few marker colors.
      colors: {
        paper: { DEFAULT: '#FBF7EF', deep: '#F3ECDD' },
        ink: { DEFAULT: '#1F2328', soft: '#4A4F57' },
        marker: { DEFAULT: '#2450B8', dark: '#1B3E91', light: '#DCE5F8' },
        sun: { DEFAULT: '#FFD35C', light: '#FFF1C7' },
        coral: { DEFAULT: '#B83A2A', light: '#FBE3DE' },
        leaf: { DEFAULT: '#2F7D57', light: '#DDF1E5' },
        primary: {
          DEFAULT: '#3B82F6',
          dark: '#2563EB',
        },
        dark: {
          DEFAULT: '#111827',
          lighter: '#1F2937',
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
      },
      fontFamily: {
        sans: ['"Nunito Variable"', 'Nunito', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
        hand: ['Caveat', '"Segoe Print"', '"Bradley Hand"', 'cursive'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '2rem',
          lg: '4rem',
          xl: '5rem',
          '2xl': '6rem',
        },
      },
    },
  },
  plugins: [],
}
