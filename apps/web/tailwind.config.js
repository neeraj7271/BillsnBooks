/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/{src,dist}/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        display: ['32px', { lineHeight: '40px', letterSpacing: '-0.02em', fontWeight: '700' }],
        h1: ['24px', { lineHeight: '32px', letterSpacing: '-0.015em', fontWeight: '700' }],
        h2: ['20px', { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '600' }],
        h3: ['16px', { lineHeight: '24px', letterSpacing: '-0.005em', fontWeight: '600' }],
        body: ['14px', { lineHeight: '20px' }],
        'body-sm': ['13px', { lineHeight: '18px' }],
        caption: ['12px', { lineHeight: '16px' }],
        mono: ['13px', { lineHeight: '18px' }],
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        md: '0 4px 12px -2px rgba(15, 23, 42, 0.08)',
        lg: '0 16px 32px -8px rgba(15, 23, 42, 0.16)',
      },
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
        strong: 'var(--color-text-strong)',
        secondary: 'var(--color-text-secondary)',
        muted: 'var(--color-text-muted)',
        'row-hover': 'var(--color-row-hover)',
        'row-stripe': 'var(--color-row-stripe)',
        'focus-ring': 'var(--color-focus-ring)',
        skeleton: 'var(--color-skeleton)',
        brand: {
          DEFAULT: 'var(--color-brand)',
          hover: 'var(--color-brand-hover)',
          subtle: 'var(--color-brand-subtle)',
          text: 'var(--color-brand-text)',
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
