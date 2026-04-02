import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'selector', // Usa a classe 'dark' para ativar dark mode
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        'bg-primary': 'rgb(var(--bg-primary) / <alpha-value>)',
        'bg-secondary': 'rgb(var(--bg-secondary) / <alpha-value>)',
        'bg-tertiary': 'rgb(var(--bg-tertiary) / <alpha-value>)',
        'bg-hover': 'rgb(var(--bg-hover) / <alpha-value>)',
        'bg-elevated': 'rgb(var(--bg-elevated) / <alpha-value>)',

        // Text colors
        'text-primary': 'rgb(var(--text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--text-secondary) / <alpha-value>)',
        'text-tertiary': 'rgb(var(--text-tertiary) / <alpha-value>)',
        'text-inverse': 'rgb(var(--text-inverse) / <alpha-value>)',

        // Borders
        'border-primary': 'rgb(var(--border-primary) / <alpha-value>)',
        'border-secondary': 'rgb(var(--border-secondary) / <alpha-value>)',
        'border-light': 'rgb(var(--border-light) / <alpha-value>)',

        // Semantic colors (fixed data colors)
        'success': 'rgb(var(--data-success) / <alpha-value>)',
        'error': 'rgb(var(--data-error) / <alpha-value>)',
        'warning': 'rgb(var(--data-warning) / <alpha-value>)',
        'info': 'rgb(var(--data-info) / <alpha-value>)',

        // Brand colors
        'brand-primary': 'rgb(var(--brand-primary) / <alpha-value>)',
        'brand-dark': 'rgb(var(--brand-dark) / <alpha-value>)',
        'brand-light': 'rgb(var(--brand-light) / <alpha-value>)',

        // Specialty colors
        'chart-bg': 'rgb(var(--chart-bg) / <alpha-value>)',
        'chart-hover': 'rgb(var(--chart-hover) / <alpha-value>)',
        'card-bg': 'rgb(var(--card-bg) / <alpha-value>)',
        'overlay-bg': 'rgb(var(--overlay-bg) / <alpha-value>)',

        // Status colors (fixed data colors)
        'status-finalized': 'rgb(var(--data-finalized) / <alpha-value>)',
        'status-special': 'rgb(var(--data-special) / <alpha-value>)',
      },
      borderColor: {
        'primary': 'rgb(var(--border-primary) / <alpha-value>)',
        'secondary': 'rgb(var(--border-secondary) / <alpha-value>)',
        'light': 'rgb(var(--border-light) / <alpha-value>)',
      },
      backgroundColor: {
        'primary': 'rgb(var(--bg-primary) / <alpha-value>)',
        'secondary': 'rgb(var(--bg-secondary) / <alpha-value>)',
        'tertiary': 'rgb(var(--bg-tertiary) / <alpha-value>)',
        'hover': 'rgb(var(--bg-hover) / <alpha-value>)',
        'elevated': 'rgb(var(--bg-elevated) / <alpha-value>)',
        'chart': 'rgb(var(--chart-bg) / <alpha-value>)',
        'card': 'rgb(var(--card-bg) / <alpha-value>)',
      },
      textColor: {
        'primary': 'rgb(var(--text-primary) / <alpha-value>)',
        'secondary': 'rgb(var(--text-secondary) / <alpha-value>)',
        'tertiary': 'rgb(var(--text-tertiary) / <alpha-value>)',
        'inverse': 'rgb(var(--text-inverse) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};

export default config;
