export const tokens = {
  colors: {
    // Canvas & Surfaces
    background: 'var(--color-bg)',
    surface: {
      DEFAULT: 'var(--color-surface)',
      raised: 'var(--color-surface-raised)',
      overlay: 'var(--color-surface-overlay)',
      sunken: 'var(--color-surface-sunken)',
    },
    border: {
      subtle: 'var(--color-border-subtle)',
      DEFAULT: 'var(--color-border)',
      strong: 'var(--color-border-strong)',
      focus: 'var(--color-border-focus)',
    },
    text: {
      primary: 'var(--color-text-primary)',
      secondary: 'var(--color-text-secondary)',
      muted: 'var(--color-text-muted)',
      inverse: 'var(--color-text-inverse)',
    },
    brand: {
      DEFAULT: 'var(--color-brand)',
      hover: 'var(--color-brand-hover)',
      subtle: 'var(--color-brand-subtle)',
      text: 'var(--color-brand-text)',
    },
    success: {
      DEFAULT: 'var(--color-success)',
      subtle: 'var(--color-success-subtle)',
      text: 'var(--color-success-text)',
    },
    warning: {
      DEFAULT: 'var(--color-warning)',
      subtle: 'var(--color-warning-subtle)',
      text: 'var(--color-warning-text)',
    },
    danger: {
      DEFAULT: 'var(--color-danger)',
      subtle: 'var(--color-danger-subtle)',
      text: 'var(--color-danger-text)',
    },
    info: {
      DEFAULT: 'var(--color-info)',
      subtle: 'var(--color-info-subtle)',
      text: 'var(--color-info-text)',
    },
  },
  spacing: {
    grid: 8,
    0: '0px',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
  },
  radius: {
    none: '0px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  density: {
    comfortable: {
      inputHeight: 'h-10',
      buttonHeight: 'h-10',
      tableCellPadding: 'py-3 px-4',
    },
    compact: {
      inputHeight: 'h-8',
      buttonHeight: 'h-8',
      tableCellPadding: 'py-1.5 px-3',
    },
  },
} as const;
