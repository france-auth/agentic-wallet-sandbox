/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        display: ['var(--font-display)', 'ui-sans-serif', 'sans-serif'],
      },
      colors: {
        surface: {
          0: '#0a0a0f',
          1: '#0f0f1a',
          2: '#141422',
          3: '#1c1c2e',
          4: '#252540',
        },
        accent: {
          purple: '#7c3aed',
          cyan: '#06b6d4',
          green: '#10b981',
          amber: '#f59e0b',
          red: '#ef4444',
        },
        border: '#2a2a42',
      },
    },
  },
  plugins: [],
};
