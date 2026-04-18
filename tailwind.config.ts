import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#00C853',
          red: '#FF3B30',
          dark: '#0F0F0F',
          surface: '#1A1A1A',
          border: '#2A2A2A',
          muted: '#6B6B6B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'price-up': 'priceUp 0.5s ease-out',
        'price-down': 'priceDown 0.5s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-green': 'pulseGreen 1s ease-in-out',
        'pulse-red': 'pulseRed 1s ease-in-out',
        'ticker': 'ticker 40s linear infinite',
      },
      keyframes: {
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        priceUp: {
          '0%': { backgroundColor: 'rgba(0, 200, 83, 0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
        priceDown: {
          '0%': { backgroundColor: 'rgba(255, 59, 48, 0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGreen: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(0, 200, 83, 0)' },
          '50%': { boxShadow: '0 0 0 4px rgba(0, 200, 83, 0.3)' },
        },
        pulseRed: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 59, 48, 0)' },
          '50%': { boxShadow: '0 0 0 4px rgba(255, 59, 48, 0.3)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
