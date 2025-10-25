import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3b82f6',
          dark: '#1e40af'
        }
      }
    }
  },
  plugins: []
};

export default config;
