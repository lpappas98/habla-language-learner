/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        habla: {
          bg: '#1A1008',
          surface: '#2A1A0E',
          card: '#3D2415',
          border: '#5C3A1E',
          gold: '#D4A017',
          'gold-light': '#F0C040',
          red: '#C0392B',
          'red-light': '#E74C3C',
          cream: '#F5E6D0',
          muted: '#A08060',
          success: '#27AE60',
          warning: '#F39C12',
          error: '#E74C3C',
        }
      },
    },
  },
  plugins: [],
}
