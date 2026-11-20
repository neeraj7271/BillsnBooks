/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/{src,dist}/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-bg)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          raised: 'var(--color-surface-raised)',
          sunken: 'var(--color-surface-sunken)',
          overlay: 'var(--color-surface-overlay)',
        },
        border: {
          subtle: 'var(--color-border-subtle)',
          DEFAULT: 'var(--color-border)',
          strong: 'var(--color-border-strong)',
          focus: 'var(--color-border-focus)',
        },
        primary: {
          DEFAULT: 'var(--color-text-primary)',
          inverse: 'var(--color-text-inverse)',
        },
        secondary: 'var(--color-text-secondary)',
        muted: 'var(--color-text-muted)',
        brand: {
          DEFAULT: 'var(--color-brand)',
          hover: 'var(--color-brand-hover)',
          subtle: 'var(--color-brand-subtle)',
          text: 'var(--color-brand-text)',
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          900: '#312e81',
        },
        status: {
          success: 'var(--color-success)',
          'success-subtle': 'var(--color-success-subtle)',
          'success-text': 'var(--color-success-text)',
          warning: 'var(--color-warning)',
          'warning-subtle': 'var(--color-warning-subtle)',
          'warning-text': 'var(--color-warning-text)',
          danger: 'var(--color-danger)',
          'danger-subtle': 'var(--color-danger-subtle)',
          'danger-text': 'var(--color-danger-text)',
          info: 'var(--color-info)',
          'info-subtle': 'var(--color-info-subtle)',
          'info-text': 'var(--color-info-text)',
        },
      },
    },
  },
  plugins: [],
};
