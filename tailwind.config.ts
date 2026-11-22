import path from 'node:path';
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [path.join(__dirname, 'src/**/*.{js,ts,jsx,tsx,mdx}')],
  theme: {
    extend: {
      colors: {
        parchment: '#f6efe0',
        'parchment-dark': '#e8dcc4',
        wood: '#5c4033',
        'wood-light': '#8b634b',
        moss: '#4f772d',
        'moss-light': '#90a955',
        terracotta: '#c85a32',
        honey: '#e09f3e',
        berry: '#b5446e',
      },
      fontFamily: {
        display: ['"Trebuchet MS"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        pixel: ['"Courier New"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        cozy: '0 4px 0 0 rgba(92, 64, 51, 0.22)',
        'cozy-sm': '0 2px 0 0 rgba(92, 64, 51, 0.2)',
      },
    },
  },
  plugins: [],
};

export default config;
