/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        poker: {
          felt: '#0f5132',
          'felt-dark': '#0b3d26',
          table: '#1e293b',
          wood: '#451a03',
          gold: '#eab308',
          card: '#ffffff',
          red: '#dc2626',
          blue: '#2563eb',
        },
      },
      boxShadow: {
        felt: 'inset 0 0 80px rgba(0, 0, 0, 0.7)',
        table: '0 20px 50px rgba(0, 0, 0, 0.8), inset 0 0 15px rgba(255, 255, 255, 0.1)',
        chip: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
