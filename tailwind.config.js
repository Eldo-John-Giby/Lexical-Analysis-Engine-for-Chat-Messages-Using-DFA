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
        darkBg: '#070A12',
        surface: '#0E1424',
        surface2: '#141C33',
        darkBorder: '#1F2A4A',
        textColor: '#E6EAF5',
        mutedText: '#8A94B2',
        accentViolet: '#7C5CFF',
        accentCyan: '#22D3EE',
        successGreen: '#34D399',
        warnYellow: '#FBBF24',
        dangerRed: '#F87171',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}
