/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#1e1e2e',
          50: '#f5f5f7',
          100: '#e4e4e9',
          200: '#c8c8d4',
          300: '#a3a3b8',
          400: '#7c7c9a',
          500: '#5f5f7e',
          600: '#4a4a66',
          700: '#3a3a52',
          800: '#2a2a40',
          900: '#1e1e2e',
          950: '#11111b',
        },
        accent: {
          DEFAULT: '#89b4fa',
          hover: '#74a8f7',
          muted: '#45678e',
        },
        success: '#a6e3a1',
        warning: '#f9e2af',
        danger: '#f38ba8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'cursor-blink': 'blink 1s step-end infinite',
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
