/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2e5aac',
          hover: '#1e4a8c',
          50: '#f0f4ff',
          10: '#f0f4ff',
        },
        secondary: {
          DEFAULT: '#7c3aed',
        },
        success: {
          DEFAULT: '#16a34a',
          bg: '#f0fdf4',
        },
        warning: {
          DEFAULT: '#d97706',
        },
        error: {
          DEFAULT: '#dc2626',
        },
        background: {
          sidebar: '#1a1a2e',
          dark: '#0f0f1a',
          tertiary: '#f8fafc',
        },
        surface: {
          DEFAULT: '#ffffff',
          secondary: '#f1f5f9',
        },
        border: {
          light: '#e2e8f0',
        },
        text: {
          primary: '#1e293b',
          secondary: '#64748b',
          tertiary: '#94a3b8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        full: '9999px',
      },
    },
  },
  plugins: [],
}
