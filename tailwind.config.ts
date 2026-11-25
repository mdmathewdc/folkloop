import path from 'node:path';
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [path.join(__dirname, 'src/**/*.{js,ts,jsx,tsx,mdx}')],
  theme: {
    extend: {
      colors: {
        'emerald-bg': '#1b3b36',
        'emerald-bg-alt': '#224840',
        'emerald-deep': '#122824',
        'gba-cream': '#f8f8f0',
        'gba-cream-dim': '#e9ebe0',
        'gba-ink': '#283030',
        'gba-ink-soft': '#52605c',
        'gba-teal': '#489078',
        'gba-teal-light': '#70b898',
        'gba-teal-dark': '#2b6654',
        'gba-gold': '#f8d038',
        'gba-gold-dark': '#c49318',
        'gba-hp-green': '#58d888',
        'gba-hp-green-hi': '#90f4b0',
        'gba-hp-amber': '#f8d038',
        'gba-hp-amber-hi': '#fce888',
        'gba-hp-red': '#f85838',
        'gba-hp-red-hi': '#ff9078',
        'gba-slate': '#384048',
        'telemetry-bg': '#1c3838',
        'telemetry-panel': '#142a2a',
        'telemetry-border': '#386860',
        'telemetry-mint': '#68e8a8',
        'telemetry-amber': '#f8d038',
      },
      fontFamily: {
        'pixel-display': ['var(--font-pixel-display)', 'monospace'],
        'pixel-body': ['var(--font-pixel-body)', 'monospace'],
      },
      boxShadow: {
        gba: '4px 4px 0 0 #0d201c',
        'gba-sm': '2px 2px 0 0 #0d201c',
        'gba-lg': '6px 6px 0 0 #0b1b18',
      },
      keyframes: {
        'gba-cursor': {
          '0%, 100%': { transform: 'translateX(0px)' },
          '50%': { transform: 'translateX(3px)' },
        },
        'gba-arrow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(2px)' },
        },
      },
      animation: {
        'gba-cursor': 'gba-cursor 0.6s steps(2, end) infinite',
        'gba-arrow': 'gba-arrow 0.8s steps(2, end) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
