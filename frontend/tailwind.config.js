/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        traffic: {
          bg: "#12161C",
          sidebar: "#191E26",
          panel: "#2C323B",
          panelDark: "#232830",
          textPrimary: "#F8F9FA",
          textSecondary: "#A0ABBA",
          border: "#3E4651",
          success: "#00C853",
          info: "#1E88E5",
          warning: "#FFC107",
          critical: "#D32F2F",
          temporary: "#FF6D00",
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
